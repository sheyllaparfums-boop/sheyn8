import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getDashboardStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("api_credentials")
    .select("key, status, last_validated_at, message");

  if (error) {
    return {
      apis: { total: 0, working: 0, error: 0, untested: 0, items: [] as any[] },
      health: "unknown" as const,
    };
  }

  const items = (data || []).map((r) => ({
    key: r.key as string,
    status: (r.status as string) || "unknown",
    last_validated_at: r.last_validated_at as string | null,
    message: r.message as string | null,
  }));

  const working = items.filter((i) => i.status === "valid").length;
  const errored = items.filter((i) => i.status === "invalid").length;
  const untested = items.filter((i) => i.status !== "valid" && i.status !== "invalid").length;

  const total = items.length;
  let health: "healthy" | "warning" | "critical" | "unknown" = "unknown";
  if (total > 0) {
    if (errored > 0) health = "critical";
    else if (untested > 0) health = "warning";
    else health = "healthy";
  }

  return {
    apis: { total, working, error: errored, untested, items },
    health,
  };
});
