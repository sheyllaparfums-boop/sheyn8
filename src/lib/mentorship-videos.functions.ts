import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SEARCH_TOPICS: { query: string; category: string }[] = [
  { query: "algoritmo instagram 2026", category: "Algoritmo" },
  { query: "estratégia instagram 2026 crescer", category: "Estratégia" },
  { query: "como configurar perfil instagram profissional 2026", category: "Configuração" },
  { query: "instagram estética clínica clientes 2026", category: "Nicho: Estética" },
  { query: "marketing digital instagram 2026", category: "Nicho: Marketing" },
  { query: "vender no instagram anúncios 2026", category: "Nicho: Vendas" },
  { query: "reels viral instagram 2026", category: "Estratégia" },
];

export interface MentorshipVideoRow {
  id: string;
  video_id: string;
  title: string;
  description: string | null;
  category: string;
  thumbnail_url: string | null;
  channel_title: string | null;
  published_at: string | null;
  duration: string | null;
}

export const listMentorshipVideos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth]).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("mentorship_videos")
    .select("id, video_id, title, description, category, thumbnail_url, channel_title, published_at, duration")
    .eq("is_active", true)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return { videos: (data ?? []) as MentorshipVideoRow[] };
});

async function searchYouTube(apiKey: string, query: string) {
  // Search for videos from the last 6 months, in Portuguese, only videos
  const publishedAfter = new Date(Date.now() - 1000 * 60 * 60 * 24 * 180).toISOString();
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("q", query);
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", "5");
  url.searchParams.set("relevanceLanguage", "pt");
  url.searchParams.set("regionCode", "BR");
  url.searchParams.set("order", "relevance");
  url.searchParams.set("publishedAfter", publishedAfter);
  url.searchParams.set("videoEmbeddable", "true");
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`YouTube API ${res.status}: ${t.slice(0, 200)}`);
  }
  const json = (await res.json()) as any;
  return (json.items ?? []) as any[];
}

export const syncMentorshipVideos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).handler(async () => {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error("YOUTUBE_API_KEY não configurada");

  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const topic of SEARCH_TOPICS) {
    try {
      const items = await searchYouTube(apiKey, topic.query);
      for (const item of items) {
        const videoId: string | undefined = item?.id?.videoId;
        if (!videoId) continue;

        // upsert: never delete, only add new (ignore if exists)
        const { data: existing } = await supabaseAdmin
          .from("mentorship_videos")
          .select("id")
          .eq("video_id", videoId)
          .maybeSingle();

        if (existing) {
          skipped++;
          continue;
        }

        const snippet = item.snippet ?? {};
        const thumb =
          snippet.thumbnails?.high?.url ||
          snippet.thumbnails?.medium?.url ||
          snippet.thumbnails?.default?.url ||
          `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

        // Fetch duration via videos endpoint
        let duration: string | null = null;
        try {
          const dUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
          dUrl.searchParams.set("part", "contentDetails");
          dUrl.searchParams.set("id", videoId);
          dUrl.searchParams.set("key", apiKey);
          const dRes = await fetch(dUrl.toString());
          if (dRes.ok) {
            const dJson = (await dRes.json()) as any;
            duration = dJson?.items?.[0]?.contentDetails?.duration ?? null;
          }
        } catch {}

        const { error: insErr } = await supabaseAdmin.from("mentorship_videos").insert({
          video_id: videoId,
          title: snippet.title ?? "Sem título",
          description: snippet.description ?? null,
          category: topic.category,
          thumbnail_url: thumb,
          channel_title: snippet.channelTitle ?? null,
          published_at: snippet.publishedAt ?? null,
          duration,
          search_query: topic.query,
          is_active: true,
        });
        if (insErr) errors.push(`${videoId}: ${insErr.message}`);
        else inserted++;
      }
    } catch (e: any) {
      errors.push(`${topic.query}: ${e?.message ?? "erro"}`);
    }
  }

  return { ok: true, inserted, skipped, errors };
});
