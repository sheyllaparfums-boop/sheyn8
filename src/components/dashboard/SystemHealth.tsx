import { useEffect, useState } from "react";
import { Activity, CheckCircle2, AlertTriangle, XCircle, ArrowRight, TriangleAlert } from "lucide-react";
import { getDashboardStats } from "@/lib/dashboard.functions";

type Stats = Awaited<ReturnType<typeof getDashboardStats>>;

const meta = {
  healthy: {
    label: "Sistema Saudável",
    dot: "bg-emerald-500",
    glow: "shadow-[0_0_12px_rgba(16,185,129,0.8)]",
    blur: "bg-emerald-600",
    ring: "ring-emerald-500/20",
    text: "text-emerald-500",
  },
  warning: {
    label: "Atenção Necessária",
    dot: "bg-amber-500",
    glow: "shadow-[0_0_12px_rgba(245,158,11,0.8)]",
    blur: "bg-amber-600",
    ring: "ring-amber-500/20",
    text: "text-amber-500",
  },
  critical: {
    label: "Estado Crítico",
    dot: "bg-red-500",
    glow: "shadow-[0_0_12px_rgba(239,68,68,0.8)]",
    blur: "bg-red-600",
    ring: "ring-red-500/30",
    text: "text-red-500",
  },
  unknown: {
    label: "Sem Dados",
    dot: "bg-white/40",
    glow: "",
    blur: "bg-white/20",
    ring: "ring-white/10",
    text: "text-white/60",
  },
} as const;

export function SystemHealth() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const refresh = async () => {
      try { setStats(await getDashboardStats()); } catch {} finally { setLoading(false); }
    };
    refresh();
    const t = setInterval(refresh, 30_000);
    return () => clearInterval(t);
  }, []);

  const health = stats?.health ?? "unknown";
  const m = meta[health];
  const apis = stats?.apis;
  const erroredKeys = (apis?.items ?? []).filter((i) => i.status === "invalid").map((i) => i.key);
  const untestedKeys = (apis?.items ?? []).filter((i) => i.status !== "valid" && i.status !== "invalid").map((i) => i.key);
  const showFooter = (apis?.error ?? 0) > 0 || (apis?.untested ?? 0) > 0;
  const isCritical = health === "critical";

  return (
    <section className={`relative overflow-hidden rounded-xl border border-white/10 bg-zinc-900/50 shadow-2xl transition-all duration-500 ring-1 ${m.ring}`}>
      {/* Header */}
      <div className="flex flex-col gap-6 p-5 md:flex-row md:items-center md:justify-between md:p-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className={`absolute inset-0 ${m.blur} opacity-40 animate-pulse rounded-full`} />
            <div className={`relative h-4 w-4 rounded-full ${m.dot} ${m.glow}`} />
          </div>
          <div>
            <span className="block text-[10px] tracking-[0.2em] text-zinc-500 uppercase font-bold">System Protocol</span>
            <h2 className={`font-rajdhani text-2xl font-bold ${m.text} tracking-tight leading-none uppercase`}>
              {loading ? "Carregando..." : m.label}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-6 md:gap-10">
          <Stat icon={Activity} value={apis?.total ?? 0} label="APIs" tone="text-white" dot="bg-orange-500" />
          <Stat icon={CheckCircle2} value={apis?.working ?? 0} label="OK" tone="text-emerald-500" dot="bg-emerald-500" />
          <Stat icon={AlertTriangle} value={apis?.untested ?? 0} label="Não testadas" tone="text-amber-500" dot="bg-amber-500" />
          <Stat icon={XCircle} value={apis?.error ?? 0} label="Erro" tone={apis?.error ? "text-red-500" : "text-zinc-400"} dot="bg-red-500" pulse={!!apis?.error} />
        </div>
      </div>

      {/* Actionable footer — only when there's a problem */}
      {showFooter && (
        <div className={`relative border-t px-5 py-4 md:px-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between overflow-hidden ${isCritical ? "border-red-500/30 bg-red-950/20" : "border-amber-500/30 bg-amber-950/15"}`}>
          <div className={`absolute inset-0 opacity-5 pointer-events-none bg-[repeating-linear-gradient(0deg,transparent,transparent_1px,${isCritical ? "rgba(239,68,68,1)" : "rgba(245,158,11,1)"}_1px,${isCritical ? "rgba(239,68,68,1)" : "rgba(245,158,11,1)"}_2px)] bg-[length:100%_3px]`} />

          <div className="relative flex items-start gap-3">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isCritical ? "bg-red-500/20 text-red-500" : "bg-amber-500/20 text-amber-500"}`}>
              <TriangleAlert className="h-5 w-5" />
            </div>
            <p className={`text-sm md:text-base font-medium ${isCritical ? "text-red-200" : "text-amber-200"}`}>
              {isCritical ? (
                <>
                  {erroredKeys.length === 1 ? "Credencial comprometida:" : `${erroredKeys.length} credenciais comprometidas:`}{" "}
                  {erroredKeys.map((k, i) => (
                    <span key={k}>
                      <code className="mx-0.5 px-1.5 py-0.5 rounded bg-red-950/40 border border-red-500/20 font-mono text-red-400 text-xs">{k}</code>
                      {i < erroredKeys.length - 1 && " "}
                    </span>
                  ))}
                </>
              ) : (
                <>
                  {untestedKeys.length} credencial(is) não testada(s):{" "}
                  {untestedKeys.slice(0, 3).map((k, i) => (
                    <span key={k}>
                      <code className="mx-0.5 px-1.5 py-0.5 rounded bg-amber-950/40 border border-amber-500/20 font-mono text-amber-300 text-xs">{k}</code>
                      {i < Math.min(untestedKeys.length, 3) - 1 && " "}
                    </span>
                  ))}
                  {untestedKeys.length > 3 && <span className="text-amber-300/70"> +{untestedKeys.length - 3}</span>}
                </>
              )}
            </p>
          </div>

          <a
            href="/integracoes"
            className={`relative group flex shrink-0 items-center gap-2 overflow-hidden rounded-md px-4 py-2 text-sm font-bold uppercase tracking-widest text-white transition-all active:scale-95 ${isCritical ? "bg-red-600 hover:bg-red-500" : "bg-amber-600 hover:bg-amber-500"}`}
          >
            <span>Resolver</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:translate-x-full transition-transform duration-1000" />
          </a>
        </div>
      )}
    </section>
  );
}

function Stat({
  icon: Icon, value, label, tone, dot, pulse,
}: { icon: React.ComponentType<{ className?: string }>; value: number; label: string; tone: string; dot: string; pulse?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <span className={`font-rajdhani text-2xl font-bold ${tone}`}>{String(value).padStart(2, "0")}</span>
      <div className="flex items-center gap-1.5">
        <div className={`h-1 w-1 rounded-full ${dot} ${pulse ? "animate-ping" : ""}`} />
        <span className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">{label}</span>
      </div>
    </div>
  );
}
