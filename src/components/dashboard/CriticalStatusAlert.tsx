import { useEffect, useState } from "react";
import { TriangleAlert, ArrowRight, CheckCircle2, XCircle, Clock } from "lucide-react";
import { getDashboardStats } from "@/lib/dashboard.functions";

type Stats = Awaited<ReturnType<typeof getDashboardStats>>;

export function CriticalStatusAlert() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const refresh = async () => {
      try { setStats(await getDashboardStats()); } catch {}
    };
    refresh();
    const t = setInterval(refresh, 30_000);
    return () => clearInterval(t);
  }, []);

  if (!stats) return null;

  const { apis, health } = stats;
  const erroredKeys = (apis?.items ?? []).filter((i) => i.status === "invalid").map((i) => i.key);
  const workingKeys = (apis?.items ?? []).filter((i) => i.status === "valid").map((i) => i.key);
  const isCritical = health === "critical" && erroredKeys.length > 0;

  // Calculando cotas (exemplo visual, já que não temos o dado real de cota no backend ainda)
  // Futuramente isso deve vir do getDashboardStats
  const quotaUsage = 85; // % de uso

  return (
    <div className="mb-8 space-y-4">
      {/* Alerta de Erro Crítico (Apenas se houver erro) */}
      {isCritical && (
        <div className="relative overflow-hidden rounded-xl border border-red-500/30 bg-red-950/20 px-5 py-4 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
          <div className="absolute inset-0 opacity-5 pointer-events-none bg-[repeating-linear-gradient(0deg,transparent,transparent_1px,rgba(239,68,68,1)_1px,rgba(239,68,68,1)_2px)] bg-[length:100%_3px]" />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/20 text-red-500">
                <TriangleAlert className="h-6 w-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-red-200 font-bold uppercase tracking-wider text-sm">Estado Crítico Detectado</h3>
                <p className="text-red-300/80 text-sm mt-1">
                  {erroredKeys.length === 1 ? "Credencial comprometida:" : `${erroredKeys.length} credenciais comprometidas:`}{" "}
                  {erroredKeys.map((k, i) => (
                    <span key={k} className="inline-flex items-center">
                      <code className="mx-0.5 px-1.5 py-0.5 rounded bg-red-950/40 border border-red-500/20 font-mono text-red-400 text-xs">{k}</code>
                      {i < erroredKeys.length - 1 && <span className="mr-1">,</span>}
                    </span>
                  ))}
                </p>
              </div>
            </div>
            <a
              href="/integracoes"
              className="relative group flex shrink-0 items-center justify-center gap-2 overflow-hidden rounded-lg bg-red-600 px-6 py-2.5 text-sm font-bold uppercase tracking-widest text-white transition-all hover:bg-red-500 active:scale-95 shadow-lg shadow-red-900/20"
            >
              <span>Resolver Agora</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
          </div>
        </div>
      )}

      {/* Grid de Status de IPs/APIs e Cotas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card de APIs Funcionais */}
        <div className="bg-zinc-900/40 border border-white/5 rounded-xl p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">APIs Operacionais</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-rajdhani font-bold text-emerald-400 leading-tight">
                {apis.working}
              </p>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {workingKeys.slice(0, 3).map(k => (
                  <span key={k} className="text-[9px] px-1 bg-emerald-500/10 text-emerald-500/70 rounded border border-emerald-500/10 whitespace-nowrap overflow-hidden text-ellipsis max-w-[60px]">{k}</span>
                ))}
                {workingKeys.length > 3 && <span className="text-[9px] text-zinc-600">+{workingKeys.length - 3}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Card de APIs com Erro */}
        <div className={`rounded-xl p-4 flex items-center gap-4 border transition-all ${apis.error > 0 ? 'bg-red-500/5 border-red-500/20' : 'bg-zinc-900/40 border-white/5 opacity-60'}`}>
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${apis.error > 0 ? 'bg-red-500/20 text-red-500' : 'bg-zinc-800 text-zinc-600'}`}>
            <XCircle className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Falhas Ativas</p>
            <div className="flex items-baseline gap-2">
              <p className={`text-2xl font-rajdhani font-bold leading-tight ${apis.error > 0 ? 'text-red-500' : 'text-zinc-500'}`}>
                {apis.error}
              </p>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {erroredKeys.slice(0, 2).map(k => (
                  <span key={k} className="text-[9px] px-1 bg-red-500/10 text-red-500/70 rounded border border-red-500/10 whitespace-nowrap">{k}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Card de Cotas / Créditos */}
        <div className="bg-zinc-900/40 border border-white/5 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Cota de Uso (API)</p>
            </div>
            <span className={`text-[10px] font-bold ${quotaUsage > 80 ? 'text-red-500' : 'text-amber-500'}`}>
              {quotaUsage}%
            </span>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ${quotaUsage > 80 ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-amber-500'}`}
              style={{ width: `${quotaUsage}%` }}
            />
          </div>
          <p className="text-[10px] text-zinc-600 mt-2 font-medium">Renovação em 4 dias</p>
        </div>
      </div>
    </div>
  );
}

