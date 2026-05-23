import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

const NicheInput = z.object({ niche: z.string().min(1).max(80) });
const HandleNicheInput = z.object({
  handle: z.string().min(1).max(80),
  niche: z.string().min(1).max(80),
});

async function callGateway(body: any) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return { ok: false as const, error: "LOVABLE_API_KEY ausente" };
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, ...body }),
  });
  if (!res.ok) {
    const t = await res.text();
    if (res.status === 429) return { ok: false as const, error: "Limite de uso atingido — tente em alguns minutos." };
    if (res.status === 402) return { ok: false as const, error: "Créditos esgotados. Adicione créditos em Workspace > Usage." };
    return { ok: false as const, error: `Gateway ${res.status}: ${t.slice(0, 160)}` };
  }
  const json: any = await res.json();
  const args = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) return { ok: false as const, error: "Resposta vazia da IA." };
  try { return { ok: true as const, data: JSON.parse(args) }; }
  catch { return { ok: false as const, error: "JSON inválido da IA." }; }
}

// ─── REELS ───
export const generateReelIdeas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => NicheInput.parse(i))
  .handler(async ({ data }) => {
    return callGateway({
      messages: [
        { role: "system", content: "Você é estrategista de Reels viral no Instagram BR. Crie ideias específicas, ousadas, prontas pra gravar." },
        { role: "user", content: `Gere 6 ideias de Reels para o nicho "${data.niche}". Cada uma com título, hook (1ª frase), roteiro (3-5 linhas), CTA, legenda curta e 5 hashtags.` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "reel_ideas",
          parameters: {
            type: "object",
            properties: {
              ideas: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    category: { type: "string" },
                    title: { type: "string" },
                    hook: { type: "string" },
                    script: { type: "string" },
                    cta: { type: "string" },
                    caption: { type: "string" },
                    hashtags: { type: "array", items: { type: "string" } },
                  },
                  required: ["id", "category", "title", "hook", "script", "cta", "caption", "hashtags"],
                  additionalProperties: false,
                },
              },
            },
            required: ["ideas"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "reel_ideas" } },
    });
  });

// ─── TRENDS ───
export const generateTrends = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => NicheInput.parse(i))
  .handler(async ({ data }) => {
    return callGateway({
      messages: [
        { role: "system", content: "Você acompanha tendências do Instagram/TikTok BR em tempo real. Seja específica e atual." },
        { role: "user", content: `Liste 10 tendências em alta NESTA SEMANA para o nicho "${data.niche}": misturando Hashtag, Áudio e Formato. Para cada uma: nome, tipo, crescimento %, alcance estimado (ex "2.4M") e pico previsto (ex "3 dias").` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "trends",
          parameters: {
            type: "object",
            properties: {
              trends: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    kind: { type: "string", enum: ["Hashtag", "Áudio", "Formato"] },
                    growth: { type: "number" },
                    reach: { type: "string" },
                    peakIn: { type: "string" },
                  },
                  required: ["id", "name", "kind", "growth", "reach", "peakIn"],
                  additionalProperties: false,
                },
              },
            },
            required: ["trends"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "trends" } },
    });
  });

// ─── SCORE ───
export const generateScoreReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => HandleNicheInput.parse(i))
  .handler(async ({ data }) => {
    return callGateway({
      messages: [
        { role: "system", content: "Você avalia potencial de viralização de perfis do Instagram. Use heurísticas realistas." },
        { role: "user", content: `Avalie @${data.handle} no nicho "${data.niche}". Score geral 0-100, nível (Iniciante/Intermediário/Avançado/Elite), breakdown com 5 dimensões (Hook, Retenção, CTA, Consistência, Originalidade) cada uma 0-100, e 4 sugestões práticas curtas.` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "score_report",
          parameters: {
            type: "object",
            properties: {
              score: { type: "number" },
              level: { type: "string" },
              breakdown: {
                type: "array",
                items: {
                  type: "object",
                  properties: { label: { type: "string" }, value: { type: "number" } },
                  required: ["label", "value"],
                  additionalProperties: false,
                },
              },
              suggestions: { type: "array", items: { type: "string" } },
            },
            required: ["score", "level", "breakdown", "suggestions"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "score_report" } },
    });
  });
