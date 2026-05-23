import { useEffect, useState } from "react";
import { Activity, Heart, Clock, AlertOctagon } from "lucide-react";
import { getDashboardStats } from "@/lib/dashboard.functions";
import { Skeleton } from "@/components/ui/skeleton";

type Stats = Awaited<ReturnType<typeof getDashboardStats>>;

function relTime(iso: string | null): string {
  if (!iso) return "nunca";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function RealMetrics() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try { setStats(await getDashboardStats()); } catch {} finally { setLoading(false); }
    };
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  const apis = stats?.apis;
  const total = apis?.total ?? 0;
  const working = apis?.working ?? 0;
  const errored = apis?.error ?? 0;
  const healthPct = total > 0 ? Math.round((working / total) * 100) : 0;

  const lastValidated = apis?.items
    .map((i) => i.last_validated_at)
    .filter(Boolean)
    .sort()
    .pop() ?? null;

  const cards = [
    {
      label: "APIs Ativas",
      value: `${working}/${total}`,
      icon: Activity,
      tone: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Taxa de Saúde",
      value: `${healthPct}%`,
      icon: Heart,
      tone: healthPct >= 80 ? "text-emerald-400" : healthPct >= 50 ? "text-yellow-400" : "text-red-400",
      bg: healthPct >= 80 ? "bg-emerald-500/10" : healthPct >= 50 ? "bg-yellow-500/10" : "bg-red-500/10",
    },
    {
      label: "Última Validação",
      value: relTime(lastValidated as string | null),
      icon: Clock,
      tone: "text-foreground",
      bg: "bg-muted",
    },
    {
      label: "Falhas Ativas",
      value: String(errored),
      icon: AlertOctagon,
      tone: errored > 0 ? "text-red-400" : "text-muted-foreground",
      bg: errored > 0 ? "bg-red-500/10" : "bg-muted",
    },
  ];

  if (loading && !stats) {
    return (
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-4 h-9 w-32" />
          </div>
        ))}
      </section>
    );
  }

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.label}
            className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:border-primary/40 hover:-translate-y-0.5"
          >
            <div className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${c.bg}`}>
                <Icon className={`h-4 w-4 ${c.tone}`} />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {c.label}
              </span>
            </div>
            <div className="mt-4">
              <span className={`font-display text-3xl font-bold tabular-nums md:text-4xl ${c.tone}`}>
                {c.value}
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Dados em tempo real • Supabase</p>
          </div>
        );
      })}
    </section>
  );
}
