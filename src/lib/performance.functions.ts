import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const DAYS = 14;

function emptyDays(): { date: string; count: number }[] {
  const out: { date: string; count: number }[] = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    out.push({ date: d.toISOString().slice(0, 10), count: 0 });
  }
  return out;
}

export const getPerformanceStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth]).handler(async () => {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - DAYS + 1);
  since.setUTCHours(0, 0, 0, 0);
  const sinceIso = since.toISOString();

  const safeCount = async (table: string) => {
    const { count } = await supabaseAdmin.from(table as any).select("id", { count: "exact", head: true });
    return count ?? 0;
  };
  const safeRecent = async (table: string) => {
    const { data } = await supabaseAdmin
      .from(table as any)
      .select("created_at")
      .gte("created_at", sinceIso);
    return (data ?? []) as unknown as { created_at: string }[];
  };

  const [
    carouselsTotal,
    hooksTotal,
    calendarTotal,
    competitorsTotal,
    reelsTotal,
    activityTotal,
    carouselsRecent,
    hooksRecent,
    reelsRecent,
    competitorsRecent,
    activityRecent,
  ] = await Promise.all([
    safeCount("carousels"),
    safeCount("viral_hooks"),
    safeCount("content_calendar"),
    safeCount("competitor_analyses"),
    safeCount("reel_transcriptions"),
    safeCount("activity_logs"),
    safeRecent("carousels"),
    safeRecent("viral_hooks"),
    safeRecent("reel_transcriptions"),
    safeRecent("competitor_analyses"),
    safeRecent("activity_logs"),
  ]);

  const series = emptyDays();
  const seriesMap = new Map(series.map((s) => [s.date, s]));
  const allRecent = [
    ...carouselsRecent,
    ...hooksRecent,
    ...reelsRecent,
    ...competitorsRecent,
    ...activityRecent,
  ];
  for (const row of allRecent) {
    const day = row.created_at?.slice(0, 10);
    const slot = day ? seriesMap.get(day) : undefined;
    if (slot) slot.count += 1;
  }

  const { data: topHooks } = await supabaseAdmin
    .from("viral_hooks")
    .select("id, hook, uses, performance, niche")
    .order("uses", { ascending: false })
    .limit(5);

  const { data: latestCarousels } = await supabaseAdmin
    .from("carousels")
    .select("id, topic, slide_count, theme, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: latestReels } = await supabaseAdmin
    .from("reel_transcriptions")
    .select("id, author_handle, status, duration_seconds, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  const last7 = series.slice(-7).reduce((s, d) => s + d.count, 0);
  const prev7 = series.slice(0, 7).reduce((s, d) => s + d.count, 0);
  const trendPct = prev7 === 0 ? (last7 > 0 ? 100 : 0) : Math.round(((last7 - prev7) / prev7) * 100);

  return {
    totals: {
      carousels: carouselsTotal,
      hooks: hooksTotal,
      calendar: calendarTotal,
      competitors: competitorsTotal,
      reels: reelsTotal,
      activity: activityTotal,
    },
    series,
    trendPct,
    last7,
    topHooks: topHooks ?? [],
    latestCarousels: latestCarousels ?? [],
    latestReels: latestReels ?? [],
  };
});
