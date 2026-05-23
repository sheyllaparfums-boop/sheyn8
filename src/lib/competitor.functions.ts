import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { generateText, Output } from "ai";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createLovableAiGatewayProvider } from "./ai-gateway";
import { analyzeProfile, type ProfileAnalysis } from "./profile-analysis.functions";

export type CompetitorReport = {
  competitor: ProfileAnalysis;
  base: ProfileAnalysis | null;
  compare: {
    followersDelta: number;
    engagementDelta: number;
    avgLikesDelta: number;
    avgCommentsDelta: number;
  } | null;
  insights: {
    summary: string;
    opportunities: string[];
    contentToCopy: string[];
    warnings: string[];
    nextActions: string[];
  } | null;
  savedId?: string;
};

export const analyzeCompetitor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      competitor: z.string().min(1).max(50).regex(/^@?[a-zA-Z0-9._]+$/),
      baseHandle: z.string().max(50).regex(/^@?[a-zA-Z0-9._]*$/).optional().nullable(),
    }).parse(input),
  )
  .handler(async ({ data }): Promise<CompetitorReport> => {
    const competitorHandle = data.competitor.replace(/^@/, "");
    const baseHandle = (data.baseHandle || "").replace(/^@/, "") || null;

    const competitor = await analyzeProfile({ data: { handle: competitorHandle } });
    if (competitor.source === "error") {
      return { competitor, base: null, compare: null, insights: null };
    }

    let base: ProfileAnalysis | null = null;
    if (baseHandle && baseHandle !== competitorHandle) {
      const b = await analyzeProfile({ data: { handle: baseHandle } });
      if (b.source !== "error") base = b;
    }

    const compare = base ? {
      followersDelta: competitor.profile.followers - base.profile.followers,
      engagementDelta: Number((competitor.metrics.engagementRate - base.metrics.engagementRate).toFixed(2)),
      avgLikesDelta: competitor.metrics.avgLikes - base.metrics.avgLikes,
      avgCommentsDelta: competitor.metrics.avgComments - base.metrics.avgComments,
    } : null;

    // IA insights focados em concorrência
    let insights: CompetitorReport["insights"] = null;
    const lovableKey = process.env.LOVABLE_API_KEY;
    if (lovableKey) {
      try {
        const gateway = createLovableAiGatewayProvider(lovableKey);
        const model = gateway("google/gemini-3-flash-preview");
        const prompt = `Você é SHEY AI, estrategista que analisa concorrentes no Instagram.
${base ? `Compare o perfil do USUÁRIO @${base.handle} com o CONCORRENTE @${competitor.handle}.` : `Analise o CONCORRENTE @${competitor.handle} e gere insights de oportunidade.`}

CONCORRENTE @${competitor.handle}:
- Seguidores: ${competitor.profile.followers} | Engaj: ${competitor.metrics.engagementRate}%
- Curtidas méd: ${competitor.metrics.avgLikes} | Coms méd: ${competitor.metrics.avgComments}
- Hashtags top: ${competitor.metrics.topHashtags.slice(0,6).map(h=>h.tag).join(", ") || "—"}
- Formatos: ${competitor.metrics.formatMix.map(f=>`${f.format}(${f.count})`).join(", ")}
- Melhores horários: ${competitor.metrics.bestHours.slice(0,3).map(h=>`${h.hour}h`).join(", ")}
- Posts top:
${competitor.topPosts.slice(0,3).map((p,i)=>`  ${i+1}. [${p.type}] ${p.likes}❤ ${p.comments}💬 "${p.caption.slice(0,140)}"`).join("\n")}

${base ? `USUÁRIO @${base.handle}:
- Seguidores: ${base.profile.followers} | Engaj: ${base.metrics.engagementRate}%
- Curtidas méd: ${base.metrics.avgLikes} | Coms méd: ${base.metrics.avgComments}
- Hashtags top: ${base.metrics.topHashtags.slice(0,6).map(h=>h.tag).join(", ") || "—"}` : ""}

Seja DIRETA, específica, acionável. Em português.`;

        const { experimental_output } = await generateText({
          model,
          prompt,
          experimental_output: Output.object({
            schema: z.object({
              summary: z.string().describe("Diagnóstico em 2-3 frases sobre o concorrente"),
              opportunities: z.array(z.string()).min(2).max(5).describe("Gaps/oportunidades que o usuário pode explorar"),
              contentToCopy: z.array(z.string()).min(2).max(5).describe("Formatos/ganchos do concorrente que valem replicar (adaptados)"),
              warnings: z.array(z.string()).min(1).max(4).describe("Armadilhas ou pontos onde o concorrente está fraco — evitar copiar isso"),
              nextActions: z.array(z.string()).min(3).max(5).describe("Próximas ações concretas pra esta semana"),
            }),
          }),
        });
        insights = experimental_output;
      } catch (e: any) {
        console.warn("[analyzeCompetitor] IA falhou:", e?.message);
      }
    }

    // Salvar histórico
    let savedId: string | undefined;
    try {
      const { data: row } = await supabaseAdmin
        .from("competitor_analyses")
        .insert({
          competitor_handle: competitorHandle,
          base_handle: baseHandle,
          snapshot: competitor as any,
          ai_insights: insights as any,
          followers: competitor.profile.followers,
          engagement_rate: competitor.metrics.engagementRate,
        })
        .select("id")
        .single();
      savedId = row?.id;
    } catch (e) {
      console.warn("[analyzeCompetitor] save falhou", e);
    }

    return { competitor, base, compare, insights, savedId };
  });

export const listCompetitorAnalyses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth]).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("competitor_analyses")
    .select("id, competitor_handle, base_handle, followers, engagement_rate, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return { ok: false as const, error: error.message, items: [] };
  return { ok: true as const, items: data ?? [] };
});

export const getCompetitorAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("competitor_analyses")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error || !row) return { ok: false as const, error: error?.message ?? "Não encontrado" };
    return {
      ok: true as const,
      report: {
        competitor: row.snapshot as ProfileAnalysis,
        base: null,
        compare: null,
        insights: row.ai_insights as any,
      } as CompetitorReport,
    };
  });

export const deleteCompetitorAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("competitor_analyses").delete().eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });
