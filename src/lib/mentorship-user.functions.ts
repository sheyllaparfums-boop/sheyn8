import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { generateText } from "ai";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createLovableAiGatewayProvider } from "./ai-gateway";

export interface UserStateRow {
  id: string;
  user_id: string;
  video_id: string;
  is_favorite: boolean;
  is_watched: boolean;
  progress_seconds: number;
  notes: string | null;
  tags: string[];
  view_count: number;
  last_watched_at: string | null;
}

export interface PlaylistRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string | null;
  video_ids: string[];
  created_at: string;
  updated_at: string;
}

export const listMentorshipUserStates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth]).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("mentorship_user_state")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) return { ok: false as const, error: error.message, states: [] as UserStateRow[] };
  return { ok: true as const, states: (data ?? []) as UserStateRow[] };
});

const UpdateStateSchema = z.object({
  video_id: z.string().min(1).max(40),
  is_favorite: z.boolean().optional(),
  is_watched: z.boolean().optional(),
  progress_seconds: z.number().int().min(0).max(60 * 60 * 12).optional(),
  notes: z.string().max(5000).nullable().optional(),
  tags: z.array(z.string().min(1).max(40)).max(20).optional(),
  increment_views: z.boolean().optional(),
});

export const updateMentorshipUserState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => UpdateStateSchema.parse(input))
  .handler(async ({ data }) => {
    const { data: existing } = await supabaseAdmin
      .from("mentorship_user_state")
      .select("*")
      .eq("video_id", data.video_id)
      .maybeSingle();

    const next: any = { video_id: data.video_id };
    if (data.is_favorite !== undefined) next.is_favorite = data.is_favorite;
    if (data.is_watched !== undefined) {
      next.is_watched = data.is_watched;
      next.last_watched_at = new Date().toISOString();
    }
    if (data.progress_seconds !== undefined) {
      next.progress_seconds = data.progress_seconds;
      next.last_watched_at = new Date().toISOString();
    }
    if (data.notes !== undefined) next.notes = data.notes;
    if (data.tags !== undefined) next.tags = data.tags;
    if (data.increment_views) {
      next.view_count = ((existing as any)?.view_count ?? 0) + 1;
      next.last_watched_at = new Date().toISOString();
    }

    if (existing) {
      const { error } = await supabaseAdmin
        .from("mentorship_user_state")
        .update(next)
        .eq("id", (existing as any).id);
      if (error) return { ok: false as const, error: error.message };
    } else {
      const { error } = await supabaseAdmin.from("mentorship_user_state").insert(next);
      if (error) return { ok: false as const, error: error.message };
    }
    return { ok: true as const };
  });

// ============ Playlists / Trilhas ============
const PlaylistSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(80),
  description: z.string().max(500).nullable().optional(),
  color: z.string().max(20).optional(),
  video_ids: z.array(z.string().min(1).max(40)).max(100).default([]),
});

export const listMentorshipPlaylists = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth]).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("mentorship_playlists")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) return { ok: false as const, error: error.message, playlists: [] as PlaylistRow[] };
  return { ok: true as const, playlists: (data ?? []) as PlaylistRow[] };
});

export const upsertMentorshipPlaylist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => PlaylistSchema.parse(input))
  .handler(async ({ data }) => {
    const payload = {
      name: data.name,
      description: data.description ?? null,
      color: data.color ?? "#8b5cf6",
      video_ids: data.video_ids,
    };
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("mentorship_playlists")
        .update(payload)
        .eq("id", data.id);
      if (error) return { ok: false as const, error: error.message };
    } else {
      const { error } = await supabaseAdmin.from("mentorship_playlists").insert(payload);
      if (error) return { ok: false as const, error: error.message };
    }
    return { ok: true as const };
  });

export const deleteMentorshipPlaylist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("mentorship_playlists").delete().eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

// ============ AI: resumo do vídeo ============
const SummarizeSchema = z.object({
  video_id: z.string().min(1).max(40),
  title: z.string().min(1).max(300),
  description: z.string().max(5000).optional().default(""),
  niche: z.string().max(80).optional().default("geral"),
});

export const summarizeMentorshipVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => SummarizeSchema.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { ok: false as const, error: "LOVABLE_API_KEY ausente" };
    try {
      const model = createLovableAiGatewayProvider(key)("google/gemini-3-flash-preview");
      const prompt = `Você é estrategista de conteúdo para Instagram em PT-BR.
Vídeo: "${data.title}"
Descrição: ${data.description.slice(0, 2000)}
Nicho do usuário: ${data.niche}

Retorne em markdown curto, com EXATAMENTE estas seções:
## 🎯 Resumo (3 bullets)
## 💡 3 Insights práticos
## 🚀 3 Ações para aplicar HOJE no nicho "${data.niche}"
## 🎬 1 Gancho viral inspirado no vídeo
Seja direto, sem floreio.`;
      const { text } = await generateText({ model, prompt, temperature: 0.7 });
      return { ok: true as const, summary: text };
    } catch (e: any) {
      return { ok: false as const, error: e?.message ?? "erro" };
    }
  });

// ============ Recomendação por nicho do user ============
export const recommendMentorshipVideos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ niche: z.string().max(80).optional() }).parse(input))
  .handler(async ({ data }) => {
    const niche = (data.niche ?? "").toLowerCase();
    const { data: videos } = await supabaseAdmin
      .from("mentorship_videos")
      .select("video_id, title, description, category")
      .eq("is_active", true)
      .limit(200);
    const list = videos ?? [];
    if (!niche) return { ok: true as const, video_ids: list.slice(0, 6).map((v: any) => v.video_id) };
    const scored = list
      .map((v: any) => {
        const blob = `${v.title} ${v.description ?? ""} ${v.category}`.toLowerCase();
        let score = 0;
        for (const word of niche.split(/\s+/).filter(Boolean)) {
          if (blob.includes(word)) score += 2;
        }
        if (v.category?.toLowerCase().includes(niche)) score += 3;
        return { v, score };
      })
      .filter((x: any) => x.score > 0)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 8)
      .map((x: any) => x.v.video_id);
    return { ok: true as const, video_ids: scored };
  });
