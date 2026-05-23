import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { generateText, Output } from "ai";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createLovableAiGatewayProvider } from "./ai-gateway";

export type ProfileAnalysis = {
  handle: string;
  fetchedAt: string;
  profile: {
    fullName: string | null;
    bio: string | null;
    followers: number;
    following: number;
    postsCount: number;
    profilePic: string | null;
    isVerified: boolean;
    isBusiness: boolean;
    externalUrl: string | null;
  };
  metrics: {
    avgLikes: number;
    avgComments: number;
    engagementRate: number; // %
    bestPost: { url: string; likes: number; comments: number; caption: string; thumbnail: string } | null;
    topHashtags: { tag: string; count: number }[];
    bestHours: { hour: number; avgEngagement: number }[];
    bestSlots: { day: number; hour: number; avgEngagement: number }[];
    formatMix: { format: string; count: number }[];
    engagementTrend: number;
  };
  topPosts: Array<{
    url: string;
    thumbnail: string;
    caption: string;
    likes: number;
    comments: number;
    timestamp: string;
    type: string;
    engagement: number;
  }>;
  ai: {
    diagnosis: string;
    strengths: string[];
    weaknesses: string[];
    nextActions: string[];
    contentIdeas: string[];
    viralPattern: string;
    bioRewrite: string;
    newHashtags: string[];
  } | null;
  source: "apify" | "error";
  error?: string;
};

async function getApifyToken(): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("api_credentials")
    .select("key, value")
    .in("key", ["APIFY_API_TOKEN", "APIFY_API_KEY"]);
  const row = data?.find((r) => r.key === "APIFY_API_TOKEN" && r.value)
          ?? data?.find((r) => r.key === "APIFY_API_KEY" && r.value);
  return (row?.value as string) ?? process.env.APIFY_API_TOKEN ?? process.env.APIFY_API_KEY ?? null;
}

function extractHashtags(text: string): string[] {
  const m = text.match(/#[\p{L}0-9_]+/gu) ?? [];
  return m.map((t) => t.toLowerCase());
}

export const analyzeProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      handle: z.string().min(1).max(50).regex(/^[a-zA-Z0-9._]+$/),
    }).parse(input),
  )
  .handler(async ({ data }): Promise<ProfileAnalysis> => {
    const handle = data.handle.replace(/^@/, "");
    const fetchedAt = new Date().toISOString();
    const empty = (err: string): ProfileAnalysis => ({
      handle,
      fetchedAt,
      profile: { fullName: null, bio: null, followers: 0, following: 0, postsCount: 0, profilePic: null, isVerified: false, isBusiness: false, externalUrl: null },
      metrics: { avgLikes: 0, avgComments: 0, engagementRate: 0, bestPost: null, topHashtags: [], bestHours: [], bestSlots: [], formatMix: [], engagementTrend: 0 },
      topPosts: [],
      ai: null,
      source: "error",
      error: err,
    });

    const token = await getApifyToken();
    if (!token) return empty("APIFY_API_TOKEN não configurado. Vá em Credenciais.");

    // Apify Instagram Profile Scraper — sync, retorna até 30 posts
    let items: any[] = [];
    try {
      const url = `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=${encodeURIComponent(token)}&timeout=120`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usernames: [handle],
          resultsLimit: 24,
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        return empty(`Apify HTTP ${res.status}: ${t.slice(0, 200)}`);
      }
      items = await res.json();
    } catch (e: any) {
      return empty(`Falha de rede: ${e?.message ?? "desconhecida"}`);
    }

    const main = items[0];
    if (!main) return empty("Perfil não encontrado ou privado.");

    const followers = Number(main.followersCount ?? 0);
    const following = Number(main.followsCount ?? 0);
    const postsCount = Number(main.postsCount ?? 0);
    const latestPosts: any[] = main.latestPosts ?? [];

    const posts = latestPosts.map((p) => {
      const likes = Number(p.likesCount ?? 0);
      const comments = Number(p.commentsCount ?? 0);
      return {
        url: p.url ?? `https://instagram.com/p/${p.shortCode}`,
        thumbnail: p.displayUrl ?? "",
        caption: (p.caption ?? "").slice(0, 600),
        likes,
        comments,
        timestamp: p.timestamp ?? "",
        type: p.type ?? "Image",
        engagement: likes + comments * 3,
      };
    });

    const avgLikes = posts.length ? Math.round(posts.reduce((s, p) => s + p.likes, 0) / posts.length) : 0;
    const avgComments = posts.length ? Math.round(posts.reduce((s, p) => s + p.comments, 0) / posts.length) : 0;
    const engagementRate = followers > 0 ? Number(((avgLikes + avgComments) / followers * 100).toFixed(2)) : 0;
    const bestPostRaw = [...posts].sort((a, b) => b.engagement - a.engagement)[0] ?? null;
    const bestPost = bestPostRaw
      ? { url: bestPostRaw.url, likes: bestPostRaw.likes, comments: bestPostRaw.comments, caption: bestPostRaw.caption.slice(0, 240), thumbnail: bestPostRaw.thumbnail }
      : null;

    // Top hashtags
    const tagCount = new Map<string, number>();
    for (const p of posts) for (const t of extractHashtags(p.caption)) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
    const topHashtags = Array.from(tagCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag, count]) => ({ tag, count }));

    // Best hours
    const hourMap = new Map<number, { sum: number; n: number }>();
    for (const p of posts) {
      if (!p.timestamp) continue;
      const h = new Date(p.timestamp).getHours();
      const cur = hourMap.get(h) ?? { sum: 0, n: 0 };
      cur.sum += p.engagement; cur.n += 1;
      hourMap.set(h, cur);
    }
    const bestHours = Array.from(hourMap.entries())
      .map(([hour, v]) => ({ hour, avgEngagement: Math.round(v.sum / v.n) }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement)
      .slice(0, 5);

    // Best slots (dia da semana × hora)
    const slotMap = new Map<string, { day: number; hour: number; sum: number; n: number }>();
    for (const p of posts) {
      if (!p.timestamp) continue;
      const d = new Date(p.timestamp);
      const day = d.getDay();
      const hour = d.getHours();
      const k = `${day}-${hour}`;
      const cur = slotMap.get(k) ?? { day, hour, sum: 0, n: 0 };
      cur.sum += p.engagement; cur.n += 1;
      slotMap.set(k, cur);
    }
    const bestSlots = Array.from(slotMap.values())
      .map((s) => ({ day: s.day, hour: s.hour, avgEngagement: Math.round(s.sum / s.n) }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement);

    // Engagement trend: comparar 1ª e 2ª metade dos posts (ordenados por data desc → recentes vs antigos)
    let engagementTrend = 0;
    if (posts.length >= 4) {
      const sorted = [...posts].filter((p) => p.timestamp).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const half = Math.floor(sorted.length / 2);
      const recent = sorted.slice(0, half);
      const older = sorted.slice(half);
      const avgRecent = recent.reduce((s, p) => s + p.engagement, 0) / Math.max(1, recent.length);
      const avgOlder = older.reduce((s, p) => s + p.engagement, 0) / Math.max(1, older.length);
      if (avgOlder > 0) engagementTrend = Math.round(((avgRecent - avgOlder) / avgOlder) * 100);
    }

    // Format mix
    const formatCount = new Map<string, number>();
    for (const p of posts) formatCount.set(p.type, (formatCount.get(p.type) ?? 0) + 1);
    const formatMix = Array.from(formatCount.entries()).map(([format, count]) => ({ format, count }));

    // Top 6 posts pra exibir
    const topPosts = [...posts].sort((a, b) => b.engagement - a.engagement).slice(0, 6);

    // ============ IA: SheyAI insights ============
    let ai: ProfileAnalysis["ai"] = null;
    const lovableKey = process.env.LOVABLE_API_KEY;
    if (lovableKey && posts.length > 0) {
      try {
        const gateway = createLovableAiGatewayProvider(lovableKey);
        const model = gateway("google/gemini-3-flash-preview");
        const prompt = `Você é SHEY AI, estrategista de crescimento no Instagram.
Analise o perfil @${handle} e gere insights ACIONÁVEIS em português.

DADOS DO PERFIL:
- Nome: ${main.fullName ?? "—"}
- Bio: ${main.biography ?? "—"}
- Seguidores: ${followers}
- Seguindo: ${following}
- Posts totais: ${postsCount}
- Verificado: ${main.verified ? "sim" : "não"}
- Business: ${main.isBusinessAccount ? "sim" : "não"}

MÉTRICAS DOS ÚLTIMOS ${posts.length} POSTS:
- Curtidas médias: ${avgLikes}
- Comentários médios: ${avgComments}
- Taxa de engajamento: ${engagementRate}%
- Hashtags top: ${topHashtags.slice(0, 5).map((h) => h.tag).join(", ") || "nenhuma"}
- Formatos: ${formatMix.map((f) => `${f.format}(${f.count})`).join(", ")}
- Melhores horários: ${bestHours.slice(0, 3).map((h) => `${h.hour}h`).join(", ")}

POSTS TOP 3:
${topPosts.slice(0, 3).map((p, i) => `${i+1}. [${p.type}] ${p.likes} likes, ${p.comments} coms — "${p.caption.slice(0, 120)}"`).join("\n")}

Seja DIRETA, específica e ousada. Nada genérico.`;

        const { experimental_output } = await generateText({
          model,
          prompt,
          experimental_output: Output.object({
            schema: z.object({
              diagnosis: z.string().describe("Diagnóstico em 2-3 frases do estado atual do perfil"),
              strengths: z.array(z.string()).min(2).max(4).describe("Pontos fortes específicos"),
              weaknesses: z.array(z.string()).min(2).max(4).describe("Fraquezas/oportunidades"),
              nextActions: z.array(z.string()).min(3).max(5).describe("Próximas ações concretas pra esta semana"),
              contentIdeas: z.array(z.string()).min(3).max(5).describe("Ideias de conteúdo específicas com formato e gancho"),
              viralPattern: z.string().describe("Padrão comum entre os top posts (1-2 frases): formato, gancho, tema, horário"),
              bioRewrite: z.string().max(150).describe("Bio reescrita otimizada: clara, com CTA, palavras-chave do nicho. Máx 150 chars."),
              newHashtags: z.array(z.string()).min(3).max(8).describe("Hashtags do nicho ainda NÃO usadas pelo perfil, com #"),
            }),
          }),
        });
        ai = experimental_output;
      } catch (e: any) {
        console.warn("[analyzeProfile] IA falhou:", e?.message);
      }
    }

    return {
      handle,
      fetchedAt,
      profile: {
        fullName: main.fullName ?? null,
        bio: main.biography ?? null,
        followers,
        following,
        postsCount,
        profilePic: main.profilePicUrlHD ?? main.profilePicUrl ?? null,
        isVerified: !!main.verified,
        isBusiness: !!main.isBusinessAccount,
        externalUrl: main.externalUrl ?? null,
      },
      metrics: { avgLikes, avgComments, engagementRate, bestPost, topHashtags, bestHours, bestSlots, formatMix, engagementTrend },
      topPosts,
      ai,
      source: "apify",
    };
  });
