import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { generateText, Output } from "ai";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createLovableAiGatewayProvider } from "./ai-gateway";

export type CarouselSlide = {
  index: number;
  role: "capa" | "contexto" | "desenvolvimento" | "exemplo" | "virada" | "cta";
  title: string;
  body: string;
  visualHint: string;
};

export type GeneratedCarousel = {
  topic: string;
  niche: string;
  tone: string;
  audience: string;
  hook: string;
  slides: CarouselSlide[];
  caption: string;
  hashtags: string[];
  cta: string;
  format: string;
  theme: string;
  slideCount: number;
};

const GenerateSchema = z.object({
  topic: z.string().min(3).max(500),
  niche: z.string().max(60).default("geral"),
  tone: z.enum(["didatico", "provocador", "storytelling", "tecnico", "humor", "venda"]).default("didatico"),
  audience: z.string().max(200).optional().default(""),
  slideCount: z.number().int().min(5).max(12).default(7),
  format: z.enum(["instagram", "linkedin", "tiktok"]).default("instagram"),
  theme: z.string().max(40).default("dark-purple"),
  hookHint: z.string().max(300).optional().nullable(),
});

function getModel() {
  const lovableKey = process.env.LOVABLE_API_KEY;
  if (!lovableKey) throw new Error("LOVABLE_API_KEY ausente");
  const gateway = createLovableAiGatewayProvider(lovableKey);
  return gateway("google/gemini-3-flash-preview");
}

export const generateCarousel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => GenerateSchema.parse(input))
  .handler(async ({ data }): Promise<{ ok: true; carousel: GeneratedCarousel; savedId?: string } | { ok: false; error: string }> => {
    try {
      const model = getModel();
      const prompt = `Você é SHEY AI, especialista em carrosséis virais para ${data.format}.
Gere um CARROSSEL COMPLETO sobre: "${data.topic}"

Parâmetros:
- Nicho: ${data.niche}
- Tom: ${data.tone}
- Público-alvo: ${data.audience || "amplo"}
- Quantidade de slides: ${data.slideCount} (capa + ${data.slideCount - 2} de conteúdo + CTA)
- Formato: ${data.format}
${data.hookHint ? `- Gancho sugerido: ${data.hookHint}` : ""}

Regras:
1. Slide 1 = CAPA com gancho FORTE, máximo 8 palavras de título.
2. Slides do meio = conteúdo escaneável, 1 ideia por slide, body com 20-45 palavras.
3. Último slide = CTA claro (salvar, comentar, compartilhar, seguir).
4. Cada slide tem visualHint: descrição visual curta (ex: "ícone de raio + número grande").
5. Caption pronta pra colar (com quebras), 80-180 palavras.
6. 8-15 hashtags relevantes SEM o #.
7. Português Brasil. Sem emojis exagerados (máx 1 por slide).`;

      const { experimental_output } = await generateText({
        model,
        prompt,
        experimental_output: Output.object({
          schema: z.object({
            hook: z.string(),
            slides: z.array(z.object({
              index: z.number(),
              role: z.enum(["capa", "contexto", "desenvolvimento", "exemplo", "virada", "cta"]),
              title: z.string().max(80),
              body: z.string().max(400),
              visualHint: z.string().max(120),
            })).min(5).max(12),
            caption: z.string(),
            hashtags: z.array(z.string()).min(5).max(15),
            cta: z.string(),
          }),
        }),
      });

      const carousel: GeneratedCarousel = {
        topic: data.topic,
        niche: data.niche,
        tone: data.tone,
        audience: data.audience || "",
        hook: experimental_output.hook,
        slides: experimental_output.slides,
        caption: experimental_output.caption,
        hashtags: experimental_output.hashtags,
        cta: experimental_output.cta,
        format: data.format,
        theme: data.theme,
        slideCount: experimental_output.slides.length,
      };

      let savedId: string | undefined;
      try {
        const { data: row } = await supabaseAdmin
          .from("carousels")
          .insert({
            topic: carousel.topic, niche: carousel.niche, tone: carousel.tone, audience: carousel.audience,
            hook: carousel.hook, slides: carousel.slides as any, caption: carousel.caption,
            hashtags: carousel.hashtags, cta: carousel.cta, slide_count: carousel.slideCount,
            format: carousel.format, theme: carousel.theme,
          }).select("id").single();
        savedId = row?.id;
      } catch (e) { console.warn("[generateCarousel] save falhou", e); }

      return { ok: true, carousel, savedId };
    } catch (e: any) {
      console.error("[generateCarousel] erro:", e?.message);
      return { ok: false, error: e?.message || "Falha ao gerar carrossel" };
    }
  });

// ---- Regenerar slide individual ----
export const regenerateSlide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    topic: z.string(),
    niche: z.string().default("geral"),
    tone: z.string().default("didatico"),
    role: z.string(),
    currentTitle: z.string().optional().default(""),
    instruction: z.string().optional().default(""),
  }).parse(input))
  .handler(async ({ data }) => {
    try {
      const model = getModel();
      const { experimental_output } = await generateText({
        model,
        prompt: `Reescreva UM slide de carrossel sobre "${data.topic}" (nicho: ${data.niche}, tom: ${data.tone}).
Tipo do slide: ${data.role}. Título atual: "${data.currentTitle}".
${data.instruction ? `Instrução extra: ${data.instruction}` : "Faça melhor, mais escaneável e impactante."}
Body com 20-45 palavras. Português Brasil.`,
        experimental_output: Output.object({
          schema: z.object({ title: z.string().max(80), body: z.string().max(400), visualHint: z.string().max(120) }),
        }),
      });
      return { ok: true as const, slide: experimental_output };
    } catch (e: any) { return { ok: false as const, error: e?.message }; }
  });

// ---- Variações da capa ----
export const generateCoverVariations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    topic: z.string(), niche: z.string().default("geral"), tone: z.string().default("didatico"),
  }).parse(input))
  .handler(async ({ data }) => {
    try {
      const model = getModel();
      const { experimental_output } = await generateText({
        model,
        prompt: `Gere 3 VARIAÇÕES DE CAPA bem diferentes entre si para um carrossel sobre "${data.topic}".
Nicho ${data.niche}, tom ${data.tone}. Máx 8 palavras por título. Cada variação com angle distinto.`,
        experimental_output: Output.object({
          schema: z.object({
            variations: z.array(z.object({
              title: z.string().max(80),
              body: z.string().max(200),
              angle: z.string().max(60),
            })).length(3),
          }),
        }),
      });
      return { ok: true as const, variations: experimental_output.variations };
    } catch (e: any) { return { ok: false as const, error: e?.message }; }
  });

// ---- Score viralidade da capa ----
export const scoreCover = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ title: z.string(), body: z.string().optional().default("") }).parse(input))
  .handler(async ({ data }) => {
    try {
      const model = getModel();
      const { experimental_output } = await generateText({
        model,
        prompt: `Analise esta CAPA de carrossel e dê:
- score de viralidade (0-10)
- 2-3 pontos fortes
- 2-3 melhorias acionáveis
- 1 versão melhorada da capa

CAPA: "${data.title}"
${data.body ? `Subtítulo: "${data.body}"` : ""}`,
        experimental_output: Output.object({
          schema: z.object({
            score: z.number().min(0).max(10),
            strengths: z.array(z.string()).min(1).max(4),
            improvements: z.array(z.string()).min(1).max(4),
            improvedTitle: z.string().max(80),
          }),
        }),
      });
      return { ok: true as const, ...experimental_output };
    } catch (e: any) { return { ok: false as const, error: e?.message }; }
  });

// ---- Atualizar carrossel salvo (após edição) ----
export const updateCarousel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    id: z.string().uuid(),
    slides: z.array(z.any()).optional(),
    caption: z.string().optional(),
    hashtags: z.array(z.string()).optional(),
    cta: z.string().optional(),
    hook: z.string().optional(),
    theme: z.string().optional(),
  }).parse(input))
  .handler(async ({ data }) => {
    const { id, ...rest } = data;
    const patch: any = {};
    for (const [k, v] of Object.entries(rest)) if (v !== undefined) patch[k] = v;
    if (patch.slides) patch.slide_count = patch.slides.length;
    const { error } = await supabaseAdmin.from("carousels").update(patch).eq("id", id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

// ---- Duplicar ----
export const duplicateCarousel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin.from("carousels").select("*").eq("id", data.id).single();
    if (error || !row) return { ok: false as const, error: error?.message ?? "Não encontrado" };
    const { id, created_at, updated_at, user_id, ...rest } = row as any;
    const { data: inserted, error: e2 } = await supabaseAdmin.from("carousels").insert({ ...rest, topic: `${rest.topic} (cópia)` }).select("id").single();
    if (e2) return { ok: false as const, error: e2.message };
    return { ok: true as const, id: inserted?.id };
  });

export const listCarousels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth]).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("carousels")
    .select("id, topic, niche, tone, format, slide_count, is_favorite, created_at")
    .order("is_favorite", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return { ok: false as const, error: error.message, items: [] };
  return { ok: true as const, items: data ?? [] };
});

export const getCarousel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin.from("carousels").select("*").eq("id", data.id).single();
    if (error || !row) return { ok: false as const, error: error?.message ?? "Não encontrado" };
    return { ok: true as const, carousel: row };
  });

export const deleteCarousel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("carousels").delete().eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const toggleFavoriteCarousel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), is_favorite: z.boolean() }).parse(input))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("carousels").update({ is_favorite: data.is_favorite }).eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });
