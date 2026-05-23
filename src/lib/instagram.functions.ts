import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export interface InstagramProfile {
  handle: string;
  fullName: string | null;
  bio: string | null;
  followers: number | null;
  following: number | null;
  posts: number | null;
  isVerified: boolean;
  isPrivate: boolean;
  profilePic: string | null;
  source: "official" | "scrape" | "rapidapi" | "fallback";
  error?: string;
}

function parseCount(text: string): number | null {
  if (!text) return null;
  const cleaned = text.replace(/,/g, "").trim().toLowerCase();
  const m = cleaned.match(/([\d.]+)\s*([kmb])?/);
  if (!m) return null;
  let n = parseFloat(m[1]);
  if (m[2] === "k") n *= 1_000;
  else if (m[2] === "m") n *= 1_000_000;
  else if (m[2] === "b") n *= 1_000_000_000;
  return Math.round(n);
}

const USER_AGENTS = [
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
];

async function tryFetch(url: string, extraHeaders: Record<string, string> = {}): Promise<string | null> {
  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": ua,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,pt-BR;q=0.8,pt;q=0.7",
        "Cache-Control": "max-age=0",
        "Sec-Ch-Ua": '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
        ...extraHeaders,
      },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

// Opção 1: Instagram Web Profile Info API (Principal sem API externa)
async function fetchWebProfileInfo(handle: string): Promise<InstagramProfile | null> {
  const url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${handle}`;
  
  try {
    const html = await tryFetch(url, {
      "x-ig-app-id": "936619743392459",
      "x-asbd-id": "129477",
      "x-ig-www-claim": "0",
      "x-requested-with": "XMLHttpRequest",
      "Referer": `https://www.instagram.com/${handle}/`,
    });

    if (!html) return null;
    const json = JSON.parse(html);
    const user = json?.data?.user;

    if (!user) return null;

    return {
      handle,
      fullName: user.full_name ?? null,
      bio: user.biography ?? null,
      followers: user.edge_followed_by?.count ?? null,
      following: user.edge_follow?.count ?? null,
      posts: user.edge_owner_to_timeline_media?.count ?? null,
      isVerified: !!user.is_verified,
      isPrivate: !!user.is_private,
      profilePic: user.profile_pic_url_hd ?? user.profile_pic_url ?? null,
      source: "official", // Consideramos official pois vem do i.instagram.com
    };
  } catch (e) {
    console.warn("[instagram] web_profile_info failed, falling back to scrape...");
    return null;
  }
}

// Opção 2: Scraping HTML (Fallback)
async function scrapeInstagram(handle: string): Promise<InstagramProfile | null> {
  const url = `https://www.instagram.com/${handle}/`;
  
  for (const ua of USER_AGENTS) {
    const html = await tryFetch(url, { "User-Agent": ua });
    if (!html) continue;

    // Tentativa de extrair JSON do window._sharedData ou extrair via regex do meta
    const sharedDataMatch = html.match(/window\._sharedData\s*=\s*({.+?});/);
    if (sharedDataMatch) {
      try {
        const data = JSON.parse(sharedDataMatch[1]);
        const user = data?.entry_data?.ProfilePage?.[0]?.graphql?.user;
        if (user) {
          return {
            handle,
            fullName: user.full_name,
            bio: user.biography,
            followers: user.edge_followed_by?.count,
            following: user.edge_follow?.count,
            posts: user.edge_owner_to_timeline_media?.count,
            isVerified: user.is_verified,
            isPrivate: user.is_private,
            profilePic: user.profile_pic_url_hd,
            source: "scrape",
          };
        }
      } catch (e) {}
    }

    // Fallback meta tags se sharedData falhar
    const ogDesc = html.match(/<meta property="og:description" content="([^"]+)"/);
    const ogImage = html.match(/<meta property="og:image" content="([^"]+)"/);

    if (ogDesc) {
      let desc = ogDesc[1];
      
      // Decodificar entidades HTML (como &#x1d64e; ou &amp;)
      desc = desc.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));
      desc = desc.replace(/&#([0-9]+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
      desc = desc.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

      const stats = desc.match(/([\d,.kmKMB]+)\s+Followers,\s+([\d,.kmKMB]+)\s+Following,\s+([\d,.kmKMB]+)\s+Posts/i);
      
      if (stats) {
        // Tentar encontrar a bio real no HTML antes de limpar o OG
        const bioMatch = html.match(/"biography":"(.*?)"/);
        const fullNameMatch = html.match(/"full_name":"(.*?)"/);
        
        let finalBio = bioMatch ? bioMatch[1].replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16))) : "";
        let finalName = fullNameMatch ? fullNameMatch[1].replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16))) : desc.split('(@')[0]?.trim();

        if (!finalBio || finalBio.includes("Instagram photos and videos")) {
          // Tentar extrair do window._sharedData primeiro se estiver disponível no HTML
          const bioMatch = html.match(/"biography":"(.*?)"/);
          if (bioMatch && bioMatch[1]) {
            finalBio = bioMatch[1].replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
          } else {
            let bioPart = "";
            const parts = desc.split(/[•-]/);
            if (parts.length > 1) {
              // Pega tudo após o primeiro separador e limpa as frases padrão do Instagram
              bioPart = parts.slice(1).join(" ").trim();
              bioPart = bioPart.replace(/^.*?\s*(@[a-zA-Z0-9._]+)\s*/, ""); // Remove o @username do início
              bioPart = bioPart.replace(/Instagram photos and videos/i, "").trim();
              bioPart = bioPart.replace(/See photos and videos from .*$/i, "").trim();
              bioPart = bioPart.trim();
            }
            finalBio = bioPart;
          }
        }

        return {
          handle,
          fullName: finalName,
          bio: finalBio || null,
          followers: parseCount(stats[1]),
          following: parseCount(stats[2]),
          posts: parseCount(stats[3]),
          isVerified: html.includes('"is_verified":true'),
          isPrivate: html.includes('"is_private":true'),
          profilePic: (ogImage?.[1]?.replace(/&amp;/g, '&').replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#([0-9]+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))) || `https://unavatar.io/instagram/${handle}?fallback=https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y`,
          source: "scrape",
        };
      }
    }
  }
  return null;
}

// Opção 2.5: Firecrawl (fallback grátis via conector — renderiza JS e burla bloqueio)
async function firecrawlInstagram(handle: string): Promise<InstagramProfile | null> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: `https://www.instagram.com/${handle}/`,
        formats: [
          {
            type: "json",
            prompt:
              "Extract the Instagram profile data: fullName, biography (bio), followersCount (number), followingCount (number), postsCount (number), isVerified (boolean), isPrivate (boolean), profilePicUrl (string url of the avatar image). Return only valid JSON.",
          },
          "markdown",
        ],
        onlyMainContent: true,
        waitFor: 1500,
      }),
    });
    if (!res.ok) {
      console.warn("[firecrawl] status", res.status, await res.text().catch(() => ""));
      return null;
    }
    const payload: any = await res.json();
    const j = payload?.data?.json ?? payload?.json ?? null;
    if (!j) return null;
    const followers = Number(j.followersCount ?? j.followers ?? 0) || null;
    if (!followers && !j.biography && !j.fullName) return null;
    return {
      handle,
      fullName: j.fullName ?? null,
      bio: j.biography ?? j.bio ?? null,
      followers,
      following: Number(j.followingCount ?? j.following ?? 0) || null,
      posts: Number(j.postsCount ?? j.posts ?? 0) || null,
      isVerified: !!j.isVerified,
      isPrivate: !!j.isPrivate,
      profilePic: j.profilePicUrl ?? null,
      source: "scrape",
    };
  } catch (e) {
    console.warn("[firecrawl] failed", e);
    return null;
  }
}

// Opção 3: RapidAPI (Fallback final se tudo falhar e houver chave)
async function rapidApiInstagram(handle: string): Promise<InstagramProfile | null> {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) return null;
  try {
    // Usando o host da API correta que o usuário assinou (allapiservice/real-time-instagram-scraper-api1)
    const res = await fetch(
      `https://real-time-instagram-scraper-api1.p.rapidapi.com/v1/info?username_or_id_or_url=${handle}`,
      {
        headers: {
          "x-rapidapi-key": key,
          "x-rapidapi-host": "real-time-instagram-scraper-api1.p.rapidapi.com",
        },
      },
    );
    if (!res.ok) {
      // Tenta o segundo host comum para essa API caso o primeiro falhe
      const res2 = await fetch(
        `https://instagram-scraper-api2.p.rapidapi.com/v1/info?username_or_id_or_url=${handle}`,
        {
          headers: {
            "x-rapidapi-key": key,
            "x-rapidapi-host": "instagram-scraper-api2.p.rapidapi.com",
          },
        },
      );
      if (!res2.ok) return null;
      const json2: any = await res2.json();
      const d2 = json2?.data ?? json2;
      return mapRapidApiResponse(handle, d2);
    }
    
    const json: any = await res.json();
    const d = json?.data ?? json;
    return mapRapidApiResponse(handle, d);
  } catch (e) {
    return null;
  }
}

function mapRapidApiResponse(handle: string, d: any): InstagramProfile {
  return {
    handle,
    fullName: d?.full_name ?? d?.fullName ?? null,
    bio: d?.biography ?? d?.bio ?? null,
    followers: d?.follower_count ?? d?.edge_followed_by?.count ?? d?.followers ?? null,
    following: d?.following_count ?? d?.edge_follow?.count ?? d?.following ?? null,
    posts: d?.media_count ?? d?.edge_owner_to_timeline_media?.count ?? d?.posts ?? null,
    isVerified: !!(d?.is_verified ?? d?.isVerified),
    isPrivate: !!(d?.is_private ?? d?.isPrivate),
    profilePic: d?.profile_pic_url_hd ?? d?.profile_pic_url ?? d?.profilePic ?? null,
    source: "rapidapi",
  };
}

export const fetchInstagramProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        handle: z
          .string()
          .min(1)
          .max(64)
          .regex(/^[a-zA-Z0-9._]+$/, "handle inválido"),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const handle = data.handle.replace(/^@/, "").trim();

    // 0. Tenta Web Profile Info API (Principal sem API externa)
    let profile = await fetchWebProfileInfo(handle);

    // 1. Tenta scraping gratuito se a API falhar
    if (!profile) {
      profile = await scrapeInstagram(handle);
    }

    // 2. Tenta Firecrawl (grátis via conector) se ainda não tiver dados
    if (!profile || profile.followers === null) {
      const fc = await firecrawlInstagram(handle);
      if (fc) profile = fc;
    }

    // 3. Se falhar e tiver RapidAPI key, usa como fallback
    if (!profile || profile.followers === null) {
      const rapid = await rapidApiInstagram(handle);
      if (rapid) profile = rapid;
    }

    // 3. Último fallback: retorna estrutura vazia para o cliente lidar
    if (!profile) {
      return {
        handle,
        fullName: null,
        bio: null,
        followers: null,
        following: null,
        posts: null,
        isVerified: false,
        isPrivate: false,
        profilePic: `https://unavatar.io/instagram/${handle}?fallback=https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y`,
        source: "fallback" as const,
        error: "Instagram bloqueou o acesso público. Configure INSTAGRAM_ACCESS_TOKEN para dados oficiais.",
      } satisfies InstagramProfile;
    }

    return profile;
  });
