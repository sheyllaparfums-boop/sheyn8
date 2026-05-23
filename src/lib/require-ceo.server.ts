import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const requireCeo = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { userId } = context as { userId: string };
    const isCeo = await checkCeoRole(userId);
    if (!isCeo) throw new Error("Forbidden: CEO role required");
    return next();
  });

export async function checkCeoRole(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "CEO")
    .maybeSingle();

  if (error) throw new Error("Forbidden: role check failed");
  return !!data;
}

export async function getAdminOverviewData() {
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const [
    profilesRes,
    ceoRes,
    trialRes,
    proRes,
    recentSignups,
    workflowsRes,
    carouselsRes,
    runsRes,
    broadcastsRes,
    logsRes,
  ] = await Promise.all([
    supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).eq("plan", "CEO"),
    supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).eq("plan", "TRIAL"),
    supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).eq("plan", "PRO"),
    supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
    supabaseAdmin.from("user_workflows").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("carousels").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("workflow_runs").select("id", { count: "exact", head: true }).gte("started_at", weekAgo),
    supabaseAdmin.from("broadcasts").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabaseAdmin.from("activity_logs").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
  ]);

  return {
    total: profilesRes.count ?? 0,
    ceo: ceoRes.count ?? 0,
    trial: trialRes.count ?? 0,
    pro: proRes.count ?? 0,
    recent: recentSignups.count ?? 0,
    workflows: workflowsRes.count ?? 0,
    carousels: carouselsRes.count ?? 0,
    runs7d: runsRes.count ?? 0,
    activeBroadcasts: broadcastsRes.count ?? 0,
    recentLogs: logsRes.count ?? 0,
  };
}
