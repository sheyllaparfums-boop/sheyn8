import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SnapshotSchema = z.object({
  nodes: z.array(z.any()).default([]),
  edges: z.array(z.any()).default([]),
});

export const listWorkflows = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_workflows")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { workflows: data ?? [] };
  });

export const listTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("workflow_templates")
      .select("*")
      .eq("is_active", true)
      .order("name");
    if (error) throw new Error(error.message);
    return { templates: data ?? [] };
  });

export const createWorkflow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        name: z.string().min(1).max(120).default("Novo fluxo"),
        description: z.string().max(500).optional(),
        template_id: z.string().max(80).optional(),
        snapshot: SnapshotSchema.optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    let snapshot = data.snapshot;
    if (!snapshot && data.template_id) {
      const { data: tpl } = await context.supabase
        .from("workflow_templates")
        .select("snapshot")
        .eq("id", data.template_id)
        .single();
      snapshot = (tpl?.snapshot as { nodes: unknown[]; edges: unknown[] } | null) ?? { nodes: [], edges: [] };
    }
    const { data: row, error } = await context.supabase
      .from("user_workflows")
      .insert({
        user_id: context.userId,
        name: data.name,
        description: data.description ?? null,
        template_id: data.template_id ?? null,
        snapshot: snapshot ?? { nodes: [], edges: [] },
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { workflow: row };
  });

export const updateWorkflow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        name: z.string().min(1).max(120).optional(),
        description: z.string().max(500).nullable().optional(),
        snapshot: SnapshotSchema.optional(),
        schedule_cron: z.string().max(60).nullable().optional(),
        schedule_enabled: z.boolean().optional(),
        is_favorite: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { id, ...patch } = data;
    const { data: row, error } = await context.supabase
      .from("user_workflows")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { workflow: row };
  });

export const deleteWorkflow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("user_workflows").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const duplicateWorkflow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { data: src, error: e1 } = await context.supabase
      .from("user_workflows")
      .select("*")
      .eq("id", data.id)
      .single();
    if (e1 || !src) throw new Error(e1?.message ?? "Fluxo não encontrado");
    const { data: row, error } = await context.supabase
      .from("user_workflows")
      .insert({
        user_id: context.userId,
        name: `${src.name} (cópia)`,
        description: src.description,
        snapshot: src.snapshot,
        template_id: src.template_id,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { workflow: row };
  });

export const listRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ workflow_id: z.string().uuid().optional(), limit: z.number().min(1).max(50).default(20) }).parse(input))
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("workflow_runs")
      .select("*, user_workflows(name)")
      .order("started_at", { ascending: false })
      .limit(data.limit);
    if (data.workflow_id) q = q.eq("workflow_id", data.workflow_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { runs: rows ?? [] };
  });

export const recordRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        workflow_id: z.string().uuid(),
        status: z.enum(["success", "error", "running"]),
        duration_ms: z.number().int().min(0),
        node_logs: z.array(z.object({ id: z.string(), label: z.string(), status: z.string(), duration_ms: z.number().optional(), output: z.string().optional() })).default([]),
        estimated_tokens: z.number().int().min(0).default(0),
        estimated_cost_usd: z.number().min(0).default(0),
        trigger_source: z.string().max(40).default("manual"),
        error: z.string().max(2000).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("workflow_runs").insert({
      user_id: context.userId,
      workflow_id: data.workflow_id,
      status: data.status,
      finished_at: new Date().toISOString(),
      duration_ms: data.duration_ms,
      node_logs: data.node_logs,
      estimated_tokens: data.estimated_tokens,
      estimated_cost_usd: data.estimated_cost_usd,
      trigger_source: data.trigger_source,
      error: data.error ?? null,
    });
    if (error) throw new Error(error.message);
    await context.supabase
      .from("user_workflows")
      .update({ last_run_at: new Date().toISOString(), last_run_status: data.status })
      .eq("id", data.workflow_id);
    return { ok: true };
  });
