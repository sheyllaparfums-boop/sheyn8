import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { ProfileAnalysis } from "./profile-analysis.functions";

function genSlug(): string {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
}

export const saveAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      handle: z.string().min(1).max(50),
      analysis: z.any(),
      niche: z.string().max(100).nullish(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const a = data.analysis as ProfileAnalysis;
    if (a.source !== "apify") return { ok: false, id: null };
    const { data: row, error } = await supabase
      .from("profile_analyses")
      .insert({
        user_id: userId,
        handle: data.handle,
        followers: a.profile.followers,
        following: a.profile.following,
        posts_count: a.profile.postsCount,
        avg_likes: a.metrics.avgLikes,
        avg_comments: a.metrics.avgComments,
        engagement_rate: a.metrics.engagementRate,
        niche: data.niche ?? null,
        snapshot: a as any,
        ai_insights: a.ai as any,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

export const listAnalyses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ handle: z.string().max(50).nullish() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let q = supabase
      .from("profile_analyses")
      .select("id, handle, followers, engagement_rate, avg_likes, avg_comments, is_public, public_slug, schedule_enabled, schedule_cron, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (data.handle) q = q.eq("handle", data.handle);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

export const getAnalysis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("profile_analyses")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("profile_analyses").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleSharePublic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), makePublic: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let slug: string | null = null;
    if (data.makePublic) {
      slug = genSlug();
    }
    const { error } = await supabase
      .from("profile_analyses")
      .update({ is_public: data.makePublic, public_slug: data.makePublic ? slug : null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { slug };
  });

export const setSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid(),
      enabled: z.boolean(),
      cron: z.string().max(50).nullish(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("profile_analyses")
      .update({ schedule_enabled: data.enabled, schedule_cron: data.cron ?? null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Acesso público (sem auth) por slug — usa supabaseAdmin, filtra is_public no WHERE
export const getPublicAnalysisBySlug = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z.object({ slug: z.string().min(4).max(40).regex(/^[a-z0-9]+$/) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("profile_analyses")
      .select("handle, followers, engagement_rate, avg_likes, avg_comments, snapshot, ai_insights, created_at")
      .eq("public_slug", data.slug)
      .eq("is_public", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    return row;
  });

// Benchmark: comparar com média de outros usuários do mesmo nicho
export const getNicheBenchmark = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ niche: z.string().min(1).max(100) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows } = await supabase
      .from("profile_analyses")
      .select("engagement_rate, avg_likes, avg_comments, followers")
      .eq("niche", data.niche)
      .limit(200);
    const list = rows ?? [];
    if (list.length === 0) return { sample: 0, avgEngagement: 0, avgLikes: 0, avgComments: 0, avgFollowers: 0 };
    const n = list.length;
    const sum = (k: keyof typeof list[number]) => list.reduce((s, r) => s + Number(r[k] ?? 0), 0);
    return {
      sample: n,
      avgEngagement: Number((sum("engagement_rate") / n).toFixed(2)),
      avgLikes: Math.round(sum("avg_likes") / n),
      avgComments: Math.round(sum("avg_comments") / n),
      avgFollowers: Math.round(sum("followers") / n),
    };
  });

// Helpers de integração com outros módulos
export const saveIdeaAsHook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      hook: z.string().min(1).max(500),
      niche: z.string().max(100).default("geral"),
      source: z.string().max(100).default("analise"),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("viral_hooks").insert({
      user_id: userId,
      hook: data.hook,
      niche: data.niche,
      source: data.source,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const scheduleActionInCalendar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      title: z.string().min(1).max(200),
      notes: z.string().max(2000).optional(),
      scheduledAt: z.string(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("content_calendar").insert({
      user_id: userId,
      title: data.title,
      content_type: "reel",
      platform: "instagram",
      scheduled_at: data.scheduledAt,
      status: "rascunho",
      notes: data.notes ?? null,
      source: "analise",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
