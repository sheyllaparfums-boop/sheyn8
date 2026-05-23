import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { generateText, Output } from "ai";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createLovableAiGatewayProvider } from "./ai-gateway";

const HookSchema = z.object({
  id: z.string().uuid().optional(),
  hook: z.string().min(3).max(500),
  niche: z.string().min(1).max(60).default("geral"),
  format: z.enum(["reel", "post", "carrossel", "story", "short"]).default("reel"),
  tags: z.array(z.string().max(40)).max(15).default([]),
  performance: z.enum(["alto", "medio", "baixo"]).default("medio"),
  language: z.string().max(10).default("pt-br"),
  source: z.string().max(200).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  is_favorite: z.boolean().optional(),
});

export const listViralHooks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth]).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("viral_hooks")
    .select("*")
    .order("is_favorite", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) return { ok: false as const, error: error.message, hooks: [] };
  return { ok: true as const, hooks: data ?? [] };
});

export const upsertViralHook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => HookSchema.parse(input))
  .handler(async ({ data }) => {
    const payload = {
      hook: data.hook,
      niche: data.niche,
      format: data.format,
      tags: data.tags,
      performance: data.performance,
      language: data.language,
      source: data.source ?? null,
      notes: data.notes ?? null,
      is_favorite: data.is_favorite ?? false,
    };
    if (data.id) {
      const { error } = await supabaseAdmin.from("viral_hooks").update(payload).eq("id", data.id);
      if (error) return { ok: false as const, error: error.message };
    } else {
      const { error } = await supabaseAdmin.from("viral_hooks").insert(payload);
      if (error) return { ok: false as const, error: error.message };
    }
    return { ok: true as const };
  });

export const deleteViralHook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("viral_hooks").delete().eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const toggleFavoriteHook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), is_favorite: z.boolean() }).parse(input))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("viral_hooks")
      .update({ is_favorite: data.is_favorite })
      .eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const incrementHookUses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { data: current } = await supabaseAdmin
      .from("viral_hooks")
      .select("uses")
      .eq("id", data.id)
      .single();
    const next = (current?.uses ?? 0) + 1;
    const { error } = await supabaseAdmin.from("viral_hooks").update({ uses: next }).eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, uses: next };
  });

// ============ AI: gerar lote de ganchos ============
const GenerateSchema = z.object({
  topic: z.string().min(2).max(200),
  niche: z.string().min(1).max(60).default("geral"),
  format: z.enum(["reel", "post", "carrossel", "story", "short"]).default("reel"),
  tone: z.string().max(40).default("provocador"),
  count: z.number().int().min(3).max(15).default(10),
  save: z.boolean().default(false),
});

export const generateHooksAI = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => GenerateSchema.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { ok: false as const, error: "LOVABLE_API_KEY ausente", hooks: [] };
    try {
      const model = createLovableAiGatewayProvider(key)("google/gemini-3-flash-preview");
      const prompt = `Você é especialista em copy viral pra ${data.format} em PT-BR.
Gere ${data.count} GANCHOS (primeiras 3-7 palavras) sobre: "${data.topic}"
Nicho: ${data.niche}. Tom: ${data.tone}.

Regras:
- Cada gancho tem MÁX 12 palavras.
- Use gatilhos: curiosidade, dor, contraste, número, segredo, urgência.
- Variedade: lista, pergunta, afirmação polêmica, história, "ninguém te conta".
- Sem emojis. Sem hashtags. Sem aspas. Só a frase pura.
- Score 0-10: quão provável é viralizar (clareza+gatilho+novidade).
- Tags: 1-3 palavras curtas (ex: "curiosidade", "dor", "lista").`;

      const { experimental_output } = await generateText({
        model,
        prompt,
        experimental_output: Output.object({
          schema: z.object({
            hooks: z.array(z.object({
              hook: z.string().max(200),
              score: z.number().min(0).max(10),
              tags: z.array(z.string().max(30)).max(5),
              performance: z.enum(["alto", "medio", "baixo"]),
            })).min(1).max(15),
          }),
        }),
      });

      const generated = experimental_output.hooks;
      if (data.save && generated.length) {
        await supabaseAdmin.from("viral_hooks").insert(
          generated.map((g) => ({
            hook: g.hook,
            niche: data.niche,
            format: data.format,
            tags: g.tags,
            performance: g.performance,
            language: "pt-br",
            notes: `Score IA: ${g.score}/10`,
          })),
        );
      }
      return { ok: true as const, hooks: generated };
    } catch (e: any) {
      return { ok: false as const, error: e?.message || "Erro IA", hooks: [] };
    }
  });

// ============ AI: variações de 1 gancho ============
export const generateHookVariations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ hook: z.string().min(3).max(500), count: z.number().int().min(2).max(8).default(5) }).parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { ok: false as const, error: "LOVABLE_API_KEY ausente", variations: [] };
    try {
      const model = createLovableAiGatewayProvider(key)("google/gemini-3-flash-preview");
      const { experimental_output } = await generateText({
        model,
        prompt: `Reescreva o gancho abaixo em ${data.count} variações em PT-BR, mantendo a ideia mas mudando ângulo (pergunta, lista, polêmica, história, número).
Gancho: "${data.hook}"
Cada variação: máx 12 palavras, sem emoji, sem aspas.`,
        experimental_output: Output.object({
          schema: z.object({ variations: z.array(z.string().max(200)).min(2).max(8) }),
        }),
      });
      return { ok: true as const, variations: experimental_output.variations };
    } catch (e: any) {
      return { ok: false as const, error: e?.message || "Erro IA", variations: [] };
    }
  });

// ============ AI: score 0-10 + feedback ============
export const scoreHookAI = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ hook: z.string().min(3).max(500) }).parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { ok: false as const, error: "LOVABLE_API_KEY ausente" };
    try {
      const model = createLovableAiGatewayProvider(key)("google/gemini-3-flash-preview");
      const { experimental_output } = await generateText({
        model,
        prompt: `Avalie o gancho viral em PT-BR: "${data.hook}"
Dê nota 0-10 considerando: clareza, gatilho emocional, curiosidade, novidade, brevidade.
Liste 1-3 pontos fortes e 1-3 sugestões de melhoria curtas.`,
        experimental_output: Output.object({
          schema: z.object({
            score: z.number().min(0).max(10),
            strengths: z.array(z.string().max(120)).max(3),
            improvements: z.array(z.string().max(120)).max(3),
          }),
        }),
      });
      return { ok: true as const, ...experimental_output };
    } catch (e: any) {
      return { ok: false as const, error: e?.message || "Erro IA" };
    }
  });

// ============ Bulk delete ============
export const bulkDeleteHooks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ ids: z.array(z.string().uuid()).min(1).max(200) }).parse(input))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("viral_hooks").delete().in("id", data.ids);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, count: data.ids.length };
  });
