import { createServerFn } from "@tanstack/react-start";
import { requireCeo } from "@/lib/require-ceo.server";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const API_KEYS = [
  {
    key: "INSTAGRAM_ACCESS_TOKEN",
    label: "Instagram Access Token",
    description:
      "Token oficial da Meta. Usado na coleta do SEU @ (dados verificados em tempo real: seguidores, posts, bio).",
    canValidate: true,
    url: "https://developers.facebook.com/tools/explorer",
  },
  {
    key: "INSTAGRAM_APP_ID",
    label: "Instagram App ID",
    description: "ID público do app Meta. Necessário para o fluxo OAuth e renovar o Access Token.",
    canValidate: false,
    url: "https://developers.facebook.com/apps",
  },
  {
    key: "INSTAGRAM_APP_SECRET",
    label: "Instagram App Secret",
    description: "Segredo do app Meta. Usado junto com o App ID para autenticar requisições oficiais.",
    canValidate: false,
    url: "https://developers.facebook.com/apps",
  },
  {
    key: "APIFY_API_TOKEN",
    label: "Apify API Token",
    description:
      "Coleta dados reais do Instagram via scrapers Apify. Alimenta o Radar Viral (reels) e a coleta de @ de terceiros.",
    canValidate: true,
    url: "https://console.apify.com/account#/integrations",
  },
  {
    key: "FIRECRAWL_API_KEY",
    label: "Firecrawl API Key",
    description:
      "Fallback grátis para scraping de perfis Instagram quando a coleta direta é bloqueada. Gerenciado pelo conector.",
    canValidate: true,
    url: "https://www.firecrawl.dev/app/api-keys",
  },
  {
    key: "ELEVENLABS_API_KEY",
    label: "ElevenLabs API Key",
    description:
      "Usada na Transcrição de Reel (Scribe v1) e em futuros recursos de voz / áudio.",
    canValidate: true,
    url: "https://elevenlabs.io/app/settings/api-keys",
  },
  {
    key: "YOUTUBE_API_KEY",
    label: "YouTube Data API Key",
    description: "Usada para buscar e sincronizar vídeos na página de Mentorias. Obtenha no Google Cloud Console.",
    canValidate: true,
    url: "https://console.cloud.google.com/apis/credentials",
  },
  {
    key: "GROQ_API_KEY",
    label: "Groq API Key",
    description: "Motor de IA (LLM) ultra-rápido usado para gerar conteúdos, ganchos e análises de perfil.",
    canValidate: true,
    url: "https://console.groq.com/keys",
  },
] as const;

export type ApiKeyName = (typeof API_KEYS)[number]["key"];

export interface ApiCredentialRow {
  key: string;
  hasValue: boolean;
  maskedValue: string | null;
  status: string;
  message: string | null;
  lastValidatedAt: string | null;
}

function mask(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.length <= 8) return "•".repeat(value.length);
  return value.slice(0, 4) + "•".repeat(Math.max(value.length - 8, 4)) + value.slice(-4);
}

export const listApiCredentials = createServerFn({ method: "GET" })
  .middleware([requireCeo]).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("api_credentials")
    .select("key, value, status, message, last_validated_at");

  if (error) throw new Error(error.message);

  const byKey = new Map<string, any>((data ?? []).map((r) => [r.key, r]));

  const rows: ApiCredentialRow[] = API_KEYS.map((k) => {
    const r = byKey.get(k.key);
    const dbValue = r?.value ?? null;
    const envValue = (process.env as Record<string, string | undefined>)[k.key] ?? null;
    const effective = dbValue ?? envValue;
    return {
      key: k.key,
      hasValue: !!effective,
      maskedValue: mask(effective),
      status: r?.status ?? (envValue ? "env" : "missing"),
      message: r?.message ?? null,
      lastValidatedAt: r?.last_validated_at ?? null,
    };
  });

  return { rows };
});

export const saveApiCredential = createServerFn({ method: "POST" })
  .middleware([requireCeo])
  .inputValidator(
    z.object({
      key: z.string().min(1).max(64),
      value: z.string().min(1).max(2048),
    }),
  )
  .handler(async ({ data }) => {
    if (!API_KEYS.some((k) => k.key === data.key)) {
      throw new Error(`Chave desconhecida: ${data.key}`);
    }
    if (data.key === "FIRECRAWL_API_KEY") {
      throw new Error("Firecrawl é gerenciado pelo conector — edite via Conectores.");
    }

    const { error } = await supabaseAdmin.from("api_credentials").upsert(
      {
        key: data.key,
        value: data.value,
        status: "saved",
        message: "Salvo manualmente",
        last_validated_at: null,
      },
      { onConflict: "key" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

async function getEffectiveValue(key: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("api_credentials")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  return data?.value ?? (process.env as Record<string, string | undefined>)[key] ?? null;
}

async function validateInstagram(token: string) {
  const res = await fetch(`https://graph.instagram.com/me?fields=id,username&access_token=${encodeURIComponent(token)}`);
  const body = await res.text();
  if (!res.ok) return { ok: false, message: `HTTP ${res.status}: ${body.slice(0, 160)}` };
  return { ok: true, message: `OK — ${body.slice(0, 160)}` };
}

async function validateApify(token: string) {
  const res = await fetch(`https://api.apify.com/v2/users/me?token=${encodeURIComponent(token)}`);
  if (!res.ok) return { ok: false, message: `HTTP ${res.status}` };
  const j: any = await res.json();
  return { ok: true, message: `OK — user ${j?.data?.username ?? j?.data?.id ?? "?"}` };
}

async function validateFirecrawl(key: string) {
  const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url: "https://example.com", formats: ["markdown"] }),
  });
  if (!res.ok) {
    const t = await res.text();
    return { ok: false, message: `HTTP ${res.status}: ${t.slice(0, 160)}` };
  }
  return { ok: true, message: "OK — scrape de teste retornou 200" };
}

async function validateElevenLabs(key: string) {
  const res = await fetch("https://api.elevenlabs.io/v1/user", {
    headers: { "xi-api-key": key },
  });
  if (!res.ok) {
    const t = await res.text();
    return { ok: false, message: `HTTP ${res.status}: ${t.slice(0, 160)}` };
  }
  const j: any = await res.json();
  const tier = j?.subscription?.tier ?? "free";
  const chars = j?.subscription?.character_count;
  const limit = j?.subscription?.character_limit;
  return { ok: true, message: `OK — plano ${tier}${chars != null && limit ? ` (${chars}/${limit} chars)` : ""}` };
}

async function validateYoutube(key: string) {
  const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=id&chart=mostPopular&maxResults=1&key=${encodeURIComponent(key)}`);
  if (!res.ok) {
    const t = await res.text();
    return { ok: false, message: `HTTP ${res.status}: ${t.slice(0, 160)}` };
  }
  return { ok: true, message: "OK — Conexão com YouTube Data API estabelecida" };
}

async function validateGroq(key: string) {
  const res = await fetch("https://api.groq.com/openai/v1/models", {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok) {
    const t = await res.text();
    return { ok: false, message: `HTTP ${res.status}: ${t.slice(0, 160)}` };
  }
  return { ok: true, message: "OK — Conexão com Groq Cloud estabelecida" };
}

export const validateApiCredential = createServerFn({ method: "POST" })
  .middleware([requireCeo])
  .inputValidator(z.object({ key: z.string().min(1).max(64) }))
  .handler(async ({ data }) => {
    const meta = API_KEYS.find((k) => k.key === data.key);
    if (!meta) throw new Error(`Chave desconhecida: ${data.key}`);
    if (!meta.canValidate) {
      return { ok: false, status: "unsupported", message: "Sem validação automática para esta chave." };
    }

    const value = await getEffectiveValue(data.key);
    if (!value) {
      const message = "Sem valor configurado.";
      await supabaseAdmin.from("api_credentials").upsert(
        { key: data.key, status: "missing", message, last_validated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
      return { ok: false, status: "missing", message };
    }

    let result: { ok: boolean; message: string };
    try {
      if (data.key === "INSTAGRAM_ACCESS_TOKEN") result = await validateInstagram(value);
      else if (data.key === "APIFY_API_TOKEN" || data.key === "APIFY_API_KEY") result = await validateApify(value);
      else if (data.key === "FIRECRAWL_API_KEY") result = await validateFirecrawl(value);
      else if (data.key === "ELEVENLABS_API_KEY") result = await validateElevenLabs(value);
      else if (data.key === "YOUTUBE_API_KEY") result = await validateYoutube(value);
      else if (data.key === "GROQ_API_KEY") result = await validateGroq(value);
      else result = { ok: false, message: "Validador não implementado." };
    } catch (e: any) {
      result = { ok: false, message: e?.message ?? "Erro de rede" };
    }

    await supabaseAdmin.from("api_credentials").upsert(
      {
        key: data.key,
        status: result.ok ? "valid" : "invalid",
        message: result.message,
        last_validated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );

    // Log to history
    await supabaseAdmin.from("api_credential_logs").insert({
      key: data.key,
      event_type: "validation",
      status: result.ok ? "valid" : "invalid",
      message: result.message,
    });

    return { ok: result.ok, status: result.ok ? "valid" : "invalid", message: result.message };
  });

// ===== New functions =====

export const listCredentialLogs = createServerFn({ method: "GET" })
  .middleware([requireCeo])
  .inputValidator(z.object({ key: z.string().optional(), limit: z.number().min(1).max(100).default(20) }))
  .handler(async ({ data }) => {
    let q = supabaseAdmin
      .from("api_credential_logs")
      .select("id, key, event_type, status, message, latency_ms, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.key) q = q.eq("key", data.key);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

export const validateAllCredentials = createServerFn({ method: "POST" })
  .middleware([requireCeo]).handler(async () => {
  const results: Array<{ key: string; ok: boolean; message: string }> = [];
  for (const meta of API_KEYS) {
    if (!meta.canValidate) continue;
    try {
      const r = await (validateApiCredential as any)({ data: { key: meta.key } });
      results.push({ key: meta.key, ok: r.ok, message: r.message });
    } catch (e: any) {
      results.push({ key: meta.key, ok: false, message: e?.message ?? "erro" });
    }
  }
  return { results };
});

export const getCredentialMetadata = createServerFn({ method: "GET" })
  .middleware([requireCeo]).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("api_credentials")
    .select("key, expires_at, environment, monthly_cost_usd, quota_used, quota_limit, auto_health_check, notify_on_failure, webhook_url");
  if (error) throw new Error(error.message);
  return { rows: data ?? [] };
});

export const updateCredentialMetadata = createServerFn({ method: "POST" })
  .middleware([requireCeo])
  .inputValidator(
    z.object({
      key: z.string().min(1).max(64),
      expires_at: z.string().nullable().optional(),
      environment: z.enum(["dev", "staging", "prod"]).optional(),
      monthly_cost_usd: z.number().min(0).optional(),
      quota_used: z.number().min(0).optional(),
      quota_limit: z.number().min(0).nullable().optional(),
      auto_health_check: z.boolean().optional(),
      notify_on_failure: z.boolean().optional(),
      webhook_url: z.string().nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { key, ...patch } = data;
    const { error } = await supabaseAdmin
      .from("api_credentials")
      .upsert({ key, ...patch }, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const rotateApiCredential = createServerFn({ method: "POST" })
  .middleware([requireCeo])
  .inputValidator(z.object({ key: z.string().min(1).max(64), newValue: z.string().min(1).max(2048) }))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("api_credentials").upsert(
      {
        key: data.key,
        value: data.newValue,
        status: "saved",
        message: "Rotacionada",
        last_validated_at: null,
        expires_at: null,
      },
      { onConflict: "key" },
    );
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("api_credential_logs").insert({
      key: data.key,
      event_type: "rotation",
      status: "ok",
      message: "Chave rotacionada",
    });
    return { ok: true };
  });

export const importFromEnv = createServerFn({ method: "POST" })
  .middleware([requireCeo])
  .inputValidator(z.object({ envText: z.string().min(1).max(20000) }))
  .handler(async ({ data }) => {
    const lines = data.envText.split(/\r?\n/);
    const known = new Set(API_KEYS.map((k) => k.key));
    let saved = 0;
    const skipped: string[] = [];
    for (const raw of lines) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const m = line.match(/^([A-Z0-9_]+)\s*=\s*"?([^"]+)"?$/);
      if (!m) continue;
      const [, key, value] = m;
      if (!known.has(key as any) || key === "FIRECRAWL_API_KEY") {
        skipped.push(key);
        continue;
      }
      await supabaseAdmin.from("api_credentials").upsert(
        { key, value, status: "saved", message: "Importado do .env", last_validated_at: null },
        { onConflict: "key" },
      );
      saved += 1;
    }
    return { saved, skipped };
  });

export const exportCredentialsConfig = createServerFn({ method: "GET" })
  .middleware([requireCeo]).handler(async () => {
  const { data } = await supabaseAdmin
    .from("api_credentials")
    .select("key, status, environment, monthly_cost_usd, quota_used, quota_limit, auto_health_check, notify_on_failure, expires_at, last_validated_at");
  return { config: data ?? [], exported_at: new Date().toISOString() };
});

export const revealCredentialValue = createServerFn({ method: "POST" })
  .middleware([requireCeo])
  .inputValidator(z.object({ key: z.string().min(1).max(64) }))
  .handler(async ({ data }) => {
    const value = await getEffectiveValue(data.key);
    return { value: value ?? null };
  });