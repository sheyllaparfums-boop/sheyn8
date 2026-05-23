import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  LayoutGrid,
  Sparkles,
  CalendarDays,
  Swords,
  Mic,
  TrendingUp,
  TrendingDown,
  Activity,
  Flame,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getPerformanceStats } from "@/lib/performance.functions";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Stats = Awaited<ReturnType<typeof getPerformanceStats>>;

const KPIS = [
  { key: "reels", label: "Reels transcritos", icon: Mic, color: "text-cyan-400", bg: "bg-cyan-500/10", to: "/transcricao" },
  { key: "carousels", label: "Carrosséis", icon: LayoutGrid, color: "text-purple-400", bg: "bg-purple-500/10", to: "/carrossel" },
  { key: "hooks", label: "Ganchos virais", icon: Sparkles, color: "text-amber-400", bg: "bg-amber-500/10", to: "/ganchos" },
  { key: "competitors", label: "Análises concorrente", icon: Swords, color: "text-red-400", bg: "bg-red-500/10", to: "/concorrente" },
  { key: "calendar", label: "Itens no calendário", icon: CalendarDays, color: "text-emerald-400", bg: "bg-emerald-500/10", to: "/calendario" },
] as const;

function fmtDay(d: string) {
  const [, m, day] = d.split("-");
  return `${day}/${m}`;
}

export function PerformanceMetrics() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const s = await getPerformanceStats();
        if (alive) setStats(s);
      } catch {
        // noop
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    const t = setInterval(load, 45_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  if (loading && !stats) {
    return (
      <section className="space-y-4">
        <Skeleton className="h-7 w-64" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
      </section>
    );
  }

  if (!stats) return null;

  const trendUp = stats.trendPct >= 0;
  const totals = stats.totals as Record<string, number>;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground md:text-2xl">
            Performance <span className="text-primary">Geral</span>
          </h2>
          <p className="text-xs text-muted-foreground md:text-sm">
            Tudo o que você gerou no app — atualiza a cada 45s.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs">
          {trendUp ? (
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-red-400" />
          )}
          <span className="font-semibold tabular-nums">
            {stats.last7} atividades últimos 7d
          </span>
          <Badge
            variant="outline"
            className={`text-[10px] ${trendUp ? "border-emerald-500/40 text-emerald-400" : "border-red-500/40 text-red-400"}`}
          >
            {trendUp ? "+" : ""}
            {stats.trendPct}%
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {KPIS.map((k) => {
          const Icon = k.icon;
          const value = totals[k.key] ?? 0;
          return (
            <Link
              key={k.key}
              to={k.to}
              className="group rounded-xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/50"
            >
              <div className="flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${k.bg}`}>
                  <Icon className={`h-4 w-4 ${k.color}`} />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {k.label}
                </span>
              </div>
              <p className={`mt-3 font-display text-3xl font-bold tabular-nums ${k.color}`}>
                {value.toLocaleString("pt-BR")}
              </p>
            </Link>
          );
        })}
      </div>

      <Card className="bg-card/60">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-primary" />
            Atividade dos últimos 14 dias
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {stats.totals.activity.toLocaleString("pt-BR")} eventos totais
          </span>
        </CardHeader>
        <CardContent>
          <div className="h-64 min-h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.series} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis
                  dataKey="date"
                  tickFormatter={fmtDay}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelFormatter={(v) => fmtDay(String(v))}
                  formatter={(v) => [`${v} ações`, "Atividade"]}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#perfGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Flame className="h-4 w-4 text-amber-400" /> Top Ganchos Virais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.topHooks.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhum gancho ainda.</p>
            )}
            {stats.topHooks.map((h, i) => (
              <div key={h.id} className="flex items-start gap-2 rounded-md border border-border/50 bg-background/40 p-2">
                <span className="font-mono text-xs font-bold text-primary">#{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-xs font-medium text-foreground">{h.hook}</p>
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                    <Badge variant="outline" className="text-[9px]">{h.niche}</Badge>
                    <span>{h.uses ?? 0} usos</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <LayoutGrid className="h-4 w-4 text-purple-400" /> Carrosséis recentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.latestCarousels.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhum carrossel gerado.</p>
            )}
            {stats.latestCarousels.map((c) => (
              <Link
                key={c.id}
                to="/carrossel"
                className="block rounded-md border border-border/50 bg-background/40 p-2 hover:border-purple-500/40"
              >
                <p className="line-clamp-1 text-xs font-medium text-foreground">{c.topic}</p>
                <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                  <Badge variant="outline" className="text-[9px]">{c.slide_count} slides</Badge>
                  <Badge variant="outline" className="text-[9px]">{c.theme}</Badge>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Mic className="h-4 w-4 text-cyan-400" /> Reels transcritos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.latestReels.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhum reel transcrito.</p>
            )}
            {stats.latestReels.map((r) => (
              <Link
                key={r.id}
                to="/transcricao"
                className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-background/40 p-2 hover:border-cyan-500/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-xs font-medium text-foreground">
                    @{r.author_handle ?? "—"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {r.duration_seconds ? `${Math.round(Number(r.duration_seconds))}s` : "—"}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={`text-[9px] ${
                    r.status === "done"
                      ? "border-emerald-500/40 text-emerald-400"
                      : r.status === "error"
                        ? "border-red-500/40 text-red-400"
                        : "border-amber-500/40 text-amber-400"
                  }`}
                >
                  {r.status}
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
