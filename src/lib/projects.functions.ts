import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ProjectInput = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(1000).optional().nullable(),
  color: z.string().max(20).optional(),
  icon: z.string().max(40).optional(),
  emoji: z.string().max(10).optional().nullable(),
  status: z.enum(["active", "paused", "completed", "archived"]).optional(),
  tags: z.array(z.string().max(40)).max(20).optional(),
  progress: z.number().min(0).max(100).optional(),
  starts_at: z.string().nullable().optional(),
  deadline_at: z.string().nullable().optional(),
  is_favorite: z.boolean().optional(),
  is_pinned: z.boolean().optional(),
  is_archived: z.boolean().optional(),
  is_public: z.boolean().optional(),
  template_id: z.string().max(60).nullable().optional(),
  cover_url: z.string().url().max(500).nullable().optional(),
});

export const listProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("is_favorite", { ascending: false })
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { projects: data ?? [] };
  });

export const getProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: project, error } = await supabase
      .from("projects").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!project) throw new Error("Projeto não encontrado");

    const { data: stats } = await supabase.rpc("get_project_stats", { _project_id: data.id });
    return { project, stats: stats ?? {} };
  });

export const createProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ProjectInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: project, error } = await supabase
      .from("projects").insert({ ...data, user_id: userId }).select().single();
    if (error) throw new Error(error.message);
    return { project };
  });

export const updateProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), patch: ProjectInput.partial() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: project, error } = await supabase
      .from("projects").update(data.patch).eq("id", data.id).select().single();
    if (error) throw new Error(error.message);
    return { project };
  });

export const deleteProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("projects").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const duplicateProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: orig, error } = await supabase.from("projects").select("*").eq("id", data.id).single();
    if (error) throw new Error(error.message);
    const { id, created_at, updated_at, public_slug, ...rest } = orig as any;
    const { data: copy, error: e2 } = await supabase
      .from("projects").insert({ ...rest, user_id: userId, name: `${orig.name} (cópia)`, is_public: false, public_slug: null }).select().single();
    if (e2) throw new Error(e2.message);
    return { project: copy };
  });

export const sharePublicly = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), enable: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let slug: string | null = null;
    if (data.enable) {
      const { data: cur } = await supabase.from("projects").select("name, public_slug").eq("id", data.id).single();
      slug = cur?.public_slug ?? `${(cur?.name ?? "projeto").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${data.id.slice(0, 6)}`;
    }
    const { error } = await supabase.from("projects").update({ is_public: data.enable, public_slug: slug }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { slug };
  });

export const listTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth]).handler(async () => {
  const { data, error } = await supabaseAdmin.from("project_templates").select("*").eq("is_active", true);
  if (error) throw new Error(error.message);
  return { templates: data ?? [] };
});

// Get all content linked to a project (for detail tabs)
export const getProjectContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [carousels, hooks, calendar, transcriptions, competitors, analyses] = await Promise.all([
      supabase.from("carousels").select("id, topic, niche, created_at, is_favorite").eq("project_id", data.id).order("created_at", { ascending: false }),
      supabase.from("viral_hooks").select("id, hook, niche, format, is_favorite, created_at").eq("project_id", data.id).order("created_at", { ascending: false }),
      supabase.from("content_calendar").select("id, title, scheduled_at, status, platform").eq("project_id", data.id).order("scheduled_at", { ascending: true }),
      supabase.from("reel_transcriptions").select("id, reel_url, author_handle, status, created_at").eq("project_id", data.id).order("created_at", { ascending: false }),
      supabase.from("competitor_analyses").select("id, competitor_handle, followers, engagement_rate, created_at").eq("project_id", data.id).order("created_at", { ascending: false }),
      supabase.from("profile_analyses").select("id, handle, followers, engagement_rate, created_at").eq("project_id", data.id).order("created_at", { ascending: false }),
    ]);
    return {
      carousels: carousels.data ?? [],
      hooks: hooks.data ?? [],
      calendar: calendar.data ?? [],
      transcriptions: transcriptions.data ?? [],
      competitors: competitors.data ?? [],
      analyses: analyses.data ?? [],
    };
  });

const LinkInput = z.object({
  project_id: z.string().uuid().nullable(),
  table: z.enum(["carousels", "viral_hooks", "content_calendar", "reel_transcriptions", "competitor_analyses", "profile_analyses"]),
  ids: z.array(z.string().uuid()).min(1).max(200),
});

export const linkContentToProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => LinkInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from(data.table).update({ project_id: data.project_id }).in("id", data.ids);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const exportProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: project } = await supabase.from("projects").select("*").eq("id", data.id).single();
    const [carousels, hooks, calendar, transcriptions] = await Promise.all([
      supabase.from("carousels").select("*").eq("project_id", data.id),
      supabase.from("viral_hooks").select("*").eq("project_id", data.id),
      supabase.from("content_calendar").select("*").eq("project_id", data.id),
      supabase.from("reel_transcriptions").select("*").eq("project_id", data.id),
    ]);
    return {
      exportedAt: new Date().toISOString(),
      project,
      carousels: carousels.data ?? [],
      hooks: hooks.data ?? [],
      calendar: calendar.data ?? [],
      transcriptions: transcriptions.data ?? [],
    };
  });
