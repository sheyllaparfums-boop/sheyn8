import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1).max(4000),
});

const InputSchema = z.object({
  niche: z.string().min(1).max(100).optional(),
  handle: z.string().min(1).max(100).optional(),
  goal: z.string().min(1).max(100).optional(),
  user_name: z.string().min(1).max(100).optional(),
  messages: z.array(MessageSchema).min(1).max(30),
  /** Legacy context shape used by older callers */
  context: z
    .object({
      user_name: z.string().optional(),
      instagram_handle: z.string().optional(),
      niche: z.string().optional(),
    })
    .optional(),
});

type ChatOk = { ok: true; reply: string; text: string };
type ChatErr = { ok: false; error: string; text: string };

async function callGemini(systemText: string, messages: Array<{ role: string; content: string }>) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return { ok: false as const, error: "GEMINI_API_KEY ausente." };
  }
  const contents = messages
    .filter((m) => m.role !== "system" && m.content.trim())
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content.trim() }],
    }));

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemText }] },
          contents: contents.length ? contents : [{ role: "user", parts: [{ text: "Olá" }] }],
          generationConfig: { temperature: 0.9, maxOutputTokens: 800 },
        }),
      },
    );

    if (!res.ok) {
      const t = await res.text();
      if (res.status === 429) return { ok: false as const, error: "Limite gratuito atingido. Tente em alguns minutos." };
      if (res.status === 400 && t.includes("API key")) return { ok: false as const, error: "GEMINI_API_KEY inválida." };
      return { ok: false as const, error: `Gemini: ${t.slice(0, 160)}` };
    }

    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = json?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim() ?? "";
    if (!text) return { ok: false as const, error: "Resposta vazia do Gemini." };
    return { ok: true as const, reply: text };
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    return { ok: false as const, error: `SHEY AI: ${msg.slice(0, 200)}` };
  }
}

export const sheyAiChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<ChatOk | ChatErr> => {
    const handle = data.handle ?? data.context?.instagram_handle;
    const niche = data.niche ?? data.context?.niche;
    const userName = data.user_name ?? data.context?.user_name;

    const system = `Você é SHEY AI — uma estrategista de crescimento viral no Instagram, direta, prática e ousada.
Contexto do usuário:
- Nome: ${userName ?? "não informado"}
- Nicho: ${niche ?? "não informado"}
- Perfil: @${handle ?? "não informado"}
- Objetivo: ${data.goal ?? "viralizar"}

Regras:
- Responda SEMPRE em português brasileiro.
- Se o Instagram estiver "não informado", peça educadamente para o usuário configurar o @ na página 'Minha Conta'.
- Seja específica: cite formatos (Reels, Carrossel), ganchos, CTAs, horários.
- Use bullets curtos quando fizer sentido.
- Máximo 220 palavras. Nada de blá-blá genérico.`;

    const res = await callGemini(system, data.messages);
    if (res.ok) return { ok: true, reply: res.reply, text: res.reply };
    return { ok: false, error: res.error, text: `⚠️ ${res.error}` };
  });

/** @deprecated Use sheyAiChat instead. Kept as alias for backward compatibility. */
export const chatWithShey = sheyAiChat;
