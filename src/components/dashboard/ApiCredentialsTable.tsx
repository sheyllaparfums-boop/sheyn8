import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, HelpCircle, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { getDashboardStats } from "@/lib/dashboard.functions";
import { validateApiCredential } from "@/lib/api-credentials.functions";
import { logActivity } from "@/lib/activity-logger";

type Stats = Awaited<ReturnType<typeof getDashboardStats>>;

function relTime(iso: string | null): string {
  if (!iso) return "nunca";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `há ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d}d`;
}

const statusMeta: Record<string, { label: string; icon: any; cls: string }> = {
  valid: { label: "OK", icon: CheckCircle2, cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  invalid: { label: "Erro", icon: XCircle, cls: "bg-red-500/15 text-red-400 border-red-500/30" },
  unknown: { label: "Não testada", icon: HelpCircle, cls: "bg-muted text-muted-foreground border-border" },
};

export function ApiCredentialsTable() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState<string | null>(null);
  const validate = useServerFn(validateApiCredential);

  const load = async () => {
    try { setStats(await getDashboardStats()); } catch {} finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  const handleValidate = async (key: string) => {
    setValidating(key);
    try {
      const r = await validate({ data: { key } });
      if (r.ok) {
        toast.success(`${key}: ${r.message}`);
        logActivity({ event_type: "action", description: `Validou credencial ${key}`, status: "success", metadata: { key, result: r.message } });
      } else {
        toast.error(`${key}: ${r.message}`);
        logActivity({ event_type: "error", description: `Falha ao validar ${key}`, status: "error", metadata: { key, result: r.message } });
      }
      await load();
    } catch (e: any) {
      toast.error(`Erro: ${e?.message ?? "desconhecido"}`);
      logActivity({ event_type: "error", description: `Erro validando ${key}`, status: "error", metadata: { key, error: e?.message } });
    } finally {
      setValidating(null);
    }
  };

  const items = stats?.apis.items ?? [];

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="font-display text-base font-bold text-foreground">Credenciais & Integrações</h2>
          <p className="text-xs text-muted-foreground">Status ao vivo (atualiza a cada 30s)</p>
        </div>
        <a href="/integracoes" className="text-xs font-semibold text-primary hover:text-glow">Gerenciar →</a>
      </div>

      {loading && items.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-muted-foreground">Carregando...</div>
      ) : items.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-muted-foreground">
          Nenhuma credencial cadastrada. <a href="/integracoes" className="text-primary underline">Adicionar →</a>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 font-semibold">Serviço</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 font-semibold">Última validação</th>
                <th className="px-5 py-3 font-semibold">Mensagem</th>
                <th className="px-3 py-3 font-semibold text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const meta = statusMeta[it.status] ?? statusMeta.unknown;
                const Icon = meta.icon;
                const isValidating = validating === it.key;
                return (
                  <tr key={it.key} className="border-t border-border hover:bg-card-elevated transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs text-foreground">{it.key}</td>
                    <td className="px-3 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${meta.cls}`}>
                        <Icon className="w-3 h-3" />
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-muted-foreground tabular-nums">{relTime(it.last_validated_at)}</td>
                    <td className="px-5 py-3.5 text-muted-foreground truncate max-w-[240px]">{it.message ?? "—"}</td>
                    <td className="px-3 py-3.5 text-right">
                      <button
                        onClick={() => handleValidate(it.key)}
                        disabled={isValidating}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card-elevated hover:bg-primary/10 hover:border-primary/40 hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed px-2.5 py-1 text-[11px] font-semibold transition-colors"
                      >
                        {isValidating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        {isValidating ? "Validando..." : "Validar"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
