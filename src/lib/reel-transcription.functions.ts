import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const REEL_URL_RE = /instagram\.com\/(reel|p|tv)\/([A-Za-z0-9_-]+)/i;

function parseShortcode(url: string): string | null {
  const m = url.match(REEL_URL_RE);
  return m?.[2] ?? null;
}

async function getApifyToken(): Promise<string> {
  const { data } = await supabaseAdmin
    .from("api_credentials")
    .select("value")
    .in("key", ["APIFY_API_TOKEN", "APIFY_API_KEY"])
    .order("key", { ascending: true });
  const fromDb = data?.find((r) => r.value)?.value;
  const token = fromDb || process.env.APIFY_API_TOKEN || process.env.APIFY_API_KEY;
  if (!token) throw new Error("APIFY_API_TOKEN não configurado.");
  return token;
}

interface ApifyReelData {
  videoUrl?: string;
  thumbnailUrl?: string;
  caption?: string;
  ownerUsername?: string;
  duration?: number;
  shortcode?: string;
}

async function fetchReelFromApify(reelUrl: string): Promise<ApifyReelData> {
  const token = await getApifyToken();
  const endpoint = `https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=${encodeURIComponent(token)}&timeout=180`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      directUrls: [reelUrl],
      resultsType: "details",
      resultsLimit: 1,
      addParentData: false,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apify ${res.status}: ${text.slice(0, 200)}`);
  }
  const items: any[] = await res.json();
  const it = items?.[0];
  if (!it) throw new Error("Reel não encontrado pelo scraper.");
  return {
    videoUrl: it.videoUrl || it.video_url || it.videoUrlBackup,
    thumbnailUrl: it.displayUrl || it.thumbnailUrl,
    caption: it.caption || "",
    ownerUsername: it.ownerUsername || it.owner?.username,
    duration: it.videoDuration || it.duration,
    shortcode: it.shortCode || it.shortcode,
  };
}

async function transcribeWithElevenLabs(videoUrl: string) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("ELEVENLABS_API_KEY não configurada.");

  const videoRes = await fetch(videoUrl);
  if (!videoRes.ok) throw new Error(`Falha ao baixar vídeo (${videoRes.status})`);
  const videoBlob = await videoRes.blob();

  const fd = new FormData();
  fd.append("file", videoBlob, "reel.mp4");
  fd.append("model_id", "scribe_v1");
  fd.append("tag_audio_events", "true");
  fd.append("diarize", "false");
  fd.append("timestamps_granularity", "word");

  const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": key },
    body: fd,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ElevenLabs ${res.status}: ${text.slice(0, 200)}`);
  }
  const json: any = await res.json();
  return {
    text: json.text as string,
    language: json.language_code as string | undefined,
    words: (json.words ?? []) as Array<{ text: string; type?: string; start: number; end: number }>,
  };
}

async function generateRepurpose(transcript: string, caption: string) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key || !transcript) return null;
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "Você é estrategista de conteúdo viral. Responda APENAS em JSON válido seguindo: {\"summary\":string, \"hooks\":string[5], \"carousel_slides\":string[7], \"caption\":string, \"hashtags\":string[10], \"shorts_script\":string}.",
          },
          {
            role: "user",
            content: `Reel transcrito:\n\n${transcript}\n\nLegenda original: ${caption}\n\nGere variações em pt-BR para reutilizar este conteúdo.`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) return null;
    const json: any = await res.json();
    const raw = json?.choices?.[0]?.message?.content;
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export const transcribeReel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        reel_url: z.string().url().max(500),
        user_name: z.string().max(120).optional().nullable(),
        user_email: z.string().max(200).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const shortcode = parseShortcode(data.reel_url);
    if (!shortcode) return { ok: false as const, error: "URL de Reel inválida." };

    const { data: row, error: insErr } = await supabaseAdmin
      .from("reel_transcriptions")
      .insert({
        reel_url: data.reel_url,
        shortcode,
        status: "processing",
        user_name: data.user_name ?? null,
        user_email: data.user_email ?? null,
      })
      .select()
      .single();
    if (insErr || !row) return { ok: false as const, error: insErr?.message ?? "Erro ao criar registro" };

    try {
      const reel = await fetchReelFromApify(data.reel_url);
      if (!reel.videoUrl) throw new Error("Reel sem URL de vídeo disponível.");

      const stt = await transcribeWithElevenLabs(reel.videoUrl);

      const audioEvents = (stt.words || [])
        .filter((w) => w.type && w.type !== "word")
        .map((w) => ({ type: w.type, start: w.start, end: w.end, label: w.text }));

      const ai = await generateRepurpose(stt.text, reel.caption ?? "");

      const { data: updated, error: updErr } = await supabaseAdmin
        .from("reel_transcriptions")
        .update({
          status: "done",
          author_handle: reel.ownerUsername ?? null,
          caption: reel.caption ?? null,
          thumbnail_url: reel.thumbnailUrl ?? null,
          video_url: reel.videoUrl,
          duration_seconds: reel.duration ?? null,
          language: stt.language ?? null,
          transcript: stt.text,
          words: stt.words.filter((w) => !w.type || w.type === "word"),
          audio_events: audioEvents,
          ai_repurpose: ai,
          error: null,
        })
        .eq("id", row.id)
        .select()
        .single();
      if (updErr) throw new Error(updErr.message);
      return { ok: true as const, record: updated };
    } catch (e: any) {
      await supabaseAdmin
        .from("reel_transcriptions")
        .update({ status: "error", error: e?.message ?? "Erro desconhecido" })
        .eq("id", row.id);
      return { ok: false as const, error: e?.message ?? "Erro desconhecido", id: row.id };
    }
  });

export const listReelTranscriptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth]).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("reel_transcriptions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) return { ok: false as const, error: error.message, items: [] };
  return { ok: true as const, items: data ?? [] };
});

export const getReelTranscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("reel_transcriptions")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) return { ok: false as const, error: error.message, record: null };
    return { ok: true as const, record: row };
  });

export const deleteReelTranscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("reel_transcriptions").delete().eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const updateTranscriptText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), transcript: z.string().min(1).max(50000) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("reel_transcriptions")
      .update({ transcript: data.transcript })
      .eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const retryReelTranscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { data: row } = await supabaseAdmin
      .from("reel_transcriptions")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) return { ok: false as const, error: "Não encontrado" };

    await supabaseAdmin
      .from("reel_transcriptions")
      .update({ status: "processing", error: null })
      .eq("id", data.id);

    try {
      const reel = await fetchReelFromApify(row.reel_url);
      if (!reel.videoUrl) throw new Error("Reel sem URL de vídeo disponível.");
      const stt = await transcribeWithElevenLabs(reel.videoUrl);
      const audioEvents = (stt.words || [])
        .filter((w) => w.type && w.type !== "word")
        .map((w) => ({ type: w.type, start: w.start, end: w.end, label: w.text }));
      const ai = await generateRepurpose(stt.text, reel.caption ?? "");
      await supabaseAdmin
        .from("reel_transcriptions")
        .update({
          status: "done",
          author_handle: reel.ownerUsername ?? row.author_handle,
          caption: reel.caption ?? row.caption,
          thumbnail_url: reel.thumbnailUrl ?? row.thumbnail_url,
          video_url: reel.videoUrl,
          duration_seconds: reel.duration ?? row.duration_seconds,
          language: stt.language ?? null,
          transcript: stt.text,
          words: stt.words.filter((w) => !w.type || w.type === "word"),
          audio_events: audioEvents,
          ai_repurpose: ai,
          error: null,
        })
        .eq("id", data.id);
      return { ok: true as const };
    } catch (e: any) {
      await supabaseAdmin
        .from("reel_transcriptions")
        .update({ status: "error", error: e?.message ?? "Erro desconhecido" })
        .eq("id", data.id);
      return { ok: false as const, error: e?.message ?? "Erro desconhecido" };
    }
  });

export const regenerateRepurpose = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        tone: z.string().max(60).optional(),
        niche: z.string().max(60).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { data: row } = await supabaseAdmin
      .from("reel_transcriptions")
      .select("transcript, caption")
      .eq("id", data.id)
      .maybeSingle();
    if (!row?.transcript) return { ok: false as const, error: "Sem transcrição." };

    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { ok: false as const, error: "LOVABLE_API_KEY ausente." };

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content:
                'Você é estrategista de conteúdo viral. Responda APENAS em JSON: {"summary":string,"hooks":string[5],"carousel_slides":string[7],"caption":string,"hashtags":string[10],"shorts_script":string}.',
            },
            {
              role: "user",
              content: `Tom: ${data.tone ?? "viral, direto"}\nNicho: ${data.niche ?? "geral"}\n\nReel transcrito:\n${row.transcript}\n\nLegenda original: ${row.caption ?? ""}\n\nGere variações em pt-BR adaptadas ao tom e nicho.`,
            },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        if (res.status === 429) return { ok: false as const, error: "Limite atingido. Tente em alguns minutos." };
        if (res.status === 402) return { ok: false as const, error: "Créditos esgotados. Adicione fundos." };
        return { ok: false as const, error: `IA: ${t.slice(0, 140)}` };
      }
      const json: any = await res.json();
      const raw = json?.choices?.[0]?.message?.content;
      if (!raw) return { ok: false as const, error: "Resposta vazia." };
      const parsed = JSON.parse(raw);
      await supabaseAdmin
        .from("reel_transcriptions")
        .update({ ai_repurpose: parsed })
        .eq("id", data.id);
      return { ok: true as const, repurpose: parsed };
    } catch (e: any) {
      return { ok: false as const, error: String(e?.message ?? e).slice(0, 200) };
    }
  });

export const translateTranscript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        target: z.enum(["pt", "en", "es"]),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { data: row } = await supabaseAdmin
      .from("reel_transcriptions")
      .select("transcript")
      .eq("id", data.id)
      .maybeSingle();
    if (!row?.transcript) return { ok: false as const, error: "Sem transcrição." };

    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { ok: false as const, error: "LOVABLE_API_KEY ausente." };

    const langName = { pt: "português brasileiro", en: "inglês", es: "espanhol" }[data.target];
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: `Você é tradutor profissional. Traduza para ${langName}. Devolva APENAS o texto traduzido, sem comentários.` },
            { role: "user", content: row.transcript },
          ],
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        if (res.status === 429) return { ok: false as const, error: "Limite atingido." };
        if (res.status === 402) return { ok: false as const, error: "Créditos esgotados." };
        return { ok: false as const, error: `IA: ${t.slice(0, 140)}` };
      }
      const json: any = await res.json();
      const text = json?.choices?.[0]?.message?.content ?? "";
      return { ok: true as const, translated: text };
    } catch (e: any) {
      return { ok: false as const, error: String(e?.message ?? e).slice(0, 200) };
    }
  });

