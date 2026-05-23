import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type ApifyViralVideo = {
  id: string;
  title: string;
  thumbnail: string;
  videoUrl?: string;
  author: string;
  views: number;
  likes: number;
  comments: number;
  growth: number;
  viralScore: number;
  format: "Reels" | "Carrossel" | "Story";
  duration: string;
  url: string;
};

const sanitizeKeyword = (niche: string) =>
  niche.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

// Cache em memória por nicho (6h) pra reduzir requests ao tikwm
// e evitar bater o limite gratuito de 10000 req/dia.
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
type CacheEntry = { at: number; videos: ApifyViralVideo[] };
const viralCache = new Map<string, CacheEntry>();

// Fonte 100% gratuita: tikwm.com (proxy público da API web do TikTok).
// Não precisa de API key. Pode falhar/limitar em momentos de pico,
// mas serve como fonte real de reels virais por nicho enquanto o
// usuário não tem plano pago do Apify/Instagram.
export const fetchRealViralVideos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ niche: z.string().min(1).max(64), limit: z.number().int().min(1).max(80).default(40) }).parse(input),
  )
  .handler(async ({ data }): Promise<{ videos: ApifyViralVideo[]; source: "tiktok" | "cache" | "error"; error?: string }> => {
    const keywords = sanitizeKeyword(data.niche) || "viral";
    const cacheKey = `${keywords}:${data.limit}`;

    const cached = viralCache.get(cacheKey);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      return { videos: cached.videos, source: "cache" };
    }

    try {
      const form = new URLSearchParams();
      form.set("keywords", keywords);
      form.set("count", String(Math.min(50, Math.max(20, data.limit))));
      form.set("cursor", "0");
      form.set("HD", "1");

      const res = await fetch("https://www.tikwm.com/api/feed/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
          "Accept": "application/json",
        },
        body: form.toString(),
      });

      if (!res.ok) {
        const text = await res.text();
        // Se bater limite, serve cache antigo (mesmo expirado) se existir
        if (cached) return { videos: cached.videos, source: "cache", error: `tikwm ${res.status}` };
        return { videos: [], source: "error", error: `tikwm ${res.status}: ${text.slice(0, 200)}` };
      }

      const json: any = await res.json();
      const items: any[] = json?.data?.videos || [];
      console.log(`tikwm items returned: ${items.length} for "${keywords}"`);

      if (items.length === 0) {
        if (cached) return { videos: cached.videos, source: "cache", error: json?.msg };
        return { videos: [], source: "error", error: json?.msg || "Sem resultados pro nicho" };
      }

      const mapped: ApifyViralVideo[] = items
        .map((it, i) => {
          const views = Number(it.play_count || 0);
          const likes = Number(it.digg_count || 0);
          const comments = Number(it.comment_count || 0);
          const shares = Number(it.share_count || 0);
          const engagement = views + likes * 2 + comments * 5 + shares * 3;
          const viralScore = Math.min(99, Math.round(40 + Math.log10(Math.max(10, engagement)) * 12));
          const dur = it.duration ? `${Math.round(it.duration)}s` : "—";
          const cover = it.cover || it.origin_cover || it.ai_dynamic_cover || "";
          const videoUrl: string | undefined = it.play || it.wmplay || undefined;
          const authorHandle = it.author?.unique_id || it.author?.nickname || keywords;

          return {
            id: String(it.video_id || it.aweme_id || `v-${i}`),
            title: (it.title || "").split("\n")[0].slice(0, 120) || `#${keywords}`,
            thumbnail: cover,
            videoUrl,
            author: `@${authorHandle}`,
            views,
            likes,
            comments,
            growth: Math.round(20 + (engagement % 380)),
            viralScore,
            format: "Reels" as const,
            duration: dur,
            url: it.video_id ? `https://www.tiktok.com/@${authorHandle}/video/${it.video_id}` : "",
            _engagement: engagement,
          } as ApifyViralVideo & { _engagement: number };
        })
        .filter((v) => !!v.thumbnail)
        .sort((a, b) => (b as any)._engagement - (a as any)._engagement)
        .slice(0, data.limit)
        .map((v) => {
          delete (v as any)._engagement;
          return v;
        });

      viralCache.set(cacheKey, { at: Date.now(), videos: mapped });
      return { videos: mapped, source: "tiktok" };
    } catch (e: any) {
      if (cached) return { videos: cached.videos, source: "cache", error: e?.message };
      return { videos: [], source: "error", error: e?.message || "Falha desconhecida" };
    }
  });
