import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/auth-store";

export type DashboardStatus = {
  badge: number;
  health: "green" | "amber" | "red";
  pendingLabel: string;
};

/**
 * Lightweight live status for the DASHBOARD nav item.
 * - badge: onboarding pending + recent error activity (24h)
 * - health: green (ok) / amber (some errors) / red (many errors)
 */
export function useDashboardStatus(): DashboardStatus {
  const user = useAuthStore((s) => s.user);
  const onboardingData = useAuthStore((s) =>
    s.user ? s.onboardingByUser[s.user.id] ?? null : null
  );
  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const fetchErrors = async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("activity_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "error")
        .gte("created_at", since);
      if (active) setErrorCount(count ?? 0);
    };
    fetchErrors();
    const id = setInterval(fetchErrors, 60_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [user?.id]);

  const onboardingPending = user && !onboardingData ? 1 : 0;
  const badge = onboardingPending + errorCount;
  const health: DashboardStatus["health"] =
    errorCount >= 20 ? "red" : errorCount >= 5 ? "amber" : "green";

  const parts: string[] = [];
  if (onboardingPending) parts.push("onboarding pendente");
  if (errorCount) parts.push(`${errorCount} erro${errorCount > 1 ? "s" : ""} 24h`);
  const pendingLabel = parts.length
    ? parts.join(" · ")
    : "sistema online";

  return { badge, health, pendingLabel };
}
