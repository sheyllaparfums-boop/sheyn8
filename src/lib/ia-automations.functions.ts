import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function callGemini(system: string, userPrompt: string, maxTokens = 1200) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { ok: false as const, error: "GEMINI_API_KEY ausente" };
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0.95, maxOutputTokens: maxTokens },
        }),
      },
    );
    if (!res.ok) {
      const t = await res.text();
      if (res.status === 429) return { ok: false as const, error: "Limite gratuito atingido. Tente em alguns minutos." };
      if (res.status === 400 && t.includes("API key")) return { ok: false as const, error: "GEMINI_API_KEY inválida." };
      return { ok: false as const, error: `Gemini: ${t.slice(0, 160)}` };
    }
    const json: any = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ?? "";
    if (!text) return { ok: false as const, error: "Resposta vazia do Gemini." };
    return { ok: true as const, reply: text };
  } catch (e: any) {
    return { ok: false as const, error: String(e?.message ?? e).slice(0, 200) };
  }
}

// 1. Reels Script Generator
export const generateReelScript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      topic: z.string().min(3).max(200),
      niche: z.string().min(1).max(80).optional(),
      tone: z.string().min(1).max(40).optional(),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const system = `Você é roteirista de Reels virais. Português BR. Direto, sem blá-blá.
Formato de saída OBRIGATÓRIO em markdown:

## 🎣 Gancho (0-3s)
[1 frase impactante que para o scroll]

## 🎬 Roteiro (cena a cena)
- **0-3s** | [ação + fala]
- **3-8s** | [ação + fala]
- **8-15s** | [ação + fala]
- **15-25s** | [ação + fala]
- **25-30s** | [virada/payoff]

## 📣 CTA
[Call-to-action específico]

## 🏷️ Hashtags (10)
#tag1 #tag2 ...

## 💡 Dica de edição
[1 dica curta de corte/legenda/áudio]`;
    const user = `Tema: ${data.topic}
Nicho: ${data.niche ?? "geral"}
Tom: ${data.tone ?? "energético e direto"}`;
    return callGemini(system, user, 1000);
  });

// 2. Content Repurpose
export const repurposeContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      original: z.string().min(20).max(4000),
      sourceType: z.enum(["reel", "post", "carrossel", "video"]).default("reel"),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const system = `Você é especialista em repurpose de conteúdo. Português BR.
Transforme o conteúdo original em 4 formatos diferentes mantendo a essência.
Formato de saída OBRIGATÓRIO em markdown:

## 🎠 Carrossel Instagram (7 slides)
**Slide 1 (capa):** [título-gancho]
**Slide 2:** [conteúdo]
**Slide 3:** [conteúdo]
**Slide 4:** [conteúdo]
**Slide 5:** [conteúdo]
**Slide 6:** [conteúdo]
**Slide 7 (CTA):** [chamada final]

## 🐦 Tweet / Thread (X)
[1 tweet principal + 3-5 tweets de thread numerados]

## 📺 YouTube Short (45s)
[Roteiro com gancho + desenvolvimento + CTA]

## 📧 Email curto
**Assunto:** [linha de assunto]
**Corpo:** [3-4 parágrafos curtos]`;
    const user = `Tipo de origem: ${data.sourceType}
Conteúdo original:
"""
${data.original}
"""`;
    return callGemini(system, user, 1500);
  });

// 3. Best Time to Post (rápido, baseado em nicho)
export const suggestBestTimes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      niche: z.string().min(2).max(80),
      audience: z.string().min(2).max(150).optional(),
      timezone: z.string().min(2).max(40).default("America/Sao_Paulo"),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const system = `Você é analista de social media. Português BR. Baseado em benchmarks públicos do nicho, sugira melhores horários para postar no Instagram.
Formato de saída OBRIGATÓRIO em markdown:

## ⏰ Top 3 horários por dia da semana
- **Seg:** HH:MM, HH:MM, HH:MM
- **Ter:** ...
- **Qua:** ...
- **Qui:** ...
- **Sex:** ...
- **Sáb:** ...
- **Dom:** ...

## 🎯 Janela de ouro
[1-2 frases sobre o melhor slot semanal]

## 📊 Por formato
- **Reels:** [horários]
- **Carrossel:** [horários]
- **Stories:** [horários]

## ⚠️ Evitar
[horários ruins para esse nicho]`;
    const user = `Nicho: ${data.niche}
Público-alvo: ${data.audience ?? "geral"}
Fuso: ${data.timezone}`;
    return callGemini(system, user, 800);
  });
