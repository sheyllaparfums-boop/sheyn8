import { useEffect, useMemo, useState } from "react";
import { LogIn, LogOut, Activity, AlertTriangle, User as UserIcon, Filter, Download, History } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";

type Row = {
  id: string;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  session_id: string | null;
  event_type: "login" | "logout" | "action" | "error" | string;
  description: string;
  status: string;
  metadata: any;
  created_at: string;
};

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s atrás`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  return `${d}d atrás`;
}

function fmtHour(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}
function fmtFull(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const typeMeta: Record<string, { label: string; icon: any; cls: string }> = {
  login:  { label: "Entrou",  icon: LogIn,         cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  logout: { label: "Saiu",    icon: LogOut,        cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  action: { label: "Ação",    icon: Activity,      cls: "bg-primary/15 text-primary border-primary/30" },
  error:  { label: "Falha",   icon: AlertTriangle, cls: "bg-red-500/15 text-red-400 border-red-500/30" },
};

type FilterType = "all" | "login" | "logout" | "action" | "error";

function exportCSV(rows: Row[], filename: string) {
  const headers = ["data_hora", "usuario", "email", "tipo", "descricao", "status", "session_id", "metadata"];
  const esc = (v: any) => {
    const s = v == null ? "" : typeof v === "string" ? v : JSON.stringify(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push([
      fmtFull(r.created_at),
      r.user_name ?? "",
      r.user_email ?? "",
      r.event_type,
      r.description,
      r.status,
      r.session_id ?? "",
      r.metadata,
    ].map(esc).join(","));
  }
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function ActivityLog() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [drawerUser, setDrawerUser] = useState<{ id: string; name: string; email: string | null } | null>(null);

  const load = async () => {
    try {
      const { data } = await supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      setRows((data ?? []) as Row[]);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, []);

  const filtered = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.event_type === filter)),
    [rows, filter]
  );

  const sessionDurations = useMemo(() => {
    const map = new Map<string, { login?: string; logout?: string }>();
    for (const r of rows) {
      if (!r.session_id) continue;
      const cur = map.get(r.session_id) ?? {};
      if (r.event_type === "login" && (!cur.login || cur.login < r.created_at)) cur.login = r.created_at;
      if (r.event_type === "logout" && (!cur.logout || cur.logout < r.created_at)) cur.logout = r.created_at;
      map.set(r.session_id, cur);
    }
    return map;
  }, [rows]);

  const counts = useMemo(() => ({
    total: rows.length,
    login: rows.filter((r) => r.event_type === "login").length,
    logout: rows.filter((r) => r.event_type === "logout").length,
    action: rows.filter((r) => r.event_type === "action").length,
    error: rows.filter((r) => r.event_type === "error").length,
  }), [rows]);

  const userHistory = useMemo(() => {
    if (!drawerUser) return [];
    return rows.filter((r) => r.user_id === drawerUser.id);
  }, [rows, drawerUser]);

  const handleExport = async () => {
    // pega últimos 7 dias direto do banco
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from("activity_logs")
      .select("*")
      .gte("created_at", since)
      .order("created_at", { ascending: false });
    exportCSV((data ?? []) as Row[], `atividade-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <>
      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="font-display text-base font-bold text-foreground">Atividade dos Usuários</h2>
            <p className="text-xs text-muted-foreground">Entradas, saídas, ações e falhas · clique no nome para histórico completo</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-muted-foreground mr-1" />
            {(["all", "login", "logout", "action", "error"] as FilterType[]).map((f) => {
              const active = filter === f;
              const label =
                f === "all" ? `Tudo (${counts.total})` :
                f === "login" ? `Entradas (${counts.login})` :
                f === "logout" ? `Saídas (${counts.logout})` :
                f === "action" ? `Ações (${counts.action})` :
                `Falhas (${counts.error})`;
              return (
                <button key={f} onClick={() => setFilter(f)}
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${
                    active ? "bg-primary/20 text-primary border-primary/40"
                           : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                  }`}>{label}</button>
              );
            })}
            <button onClick={handleExport}
              className="ml-2 inline-flex items-center gap-1.5 rounded-md border border-border bg-card-elevated hover:bg-primary/10 hover:border-primary/40 hover:text-primary px-2.5 py-1 text-[11px] font-semibold transition-colors">
              <Download className="w-3 h-3" /> CSV (7d)
            </button>
          </div>
        </div>

        {loading && rows.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">Nenhuma atividade registrada ainda.</div>
        ) : (
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card z-10">
                <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 font-semibold">Quando</th>
                  <th className="px-3 py-3 font-semibold">Usuário</th>
                  <th className="px-3 py-3 font-semibold">Tipo</th>
                  <th className="px-5 py-3 font-semibold">O que aconteceu</th>
                  <th className="px-3 py-3 font-semibold text-right">Sessão</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const meta = typeMeta[r.event_type] ?? typeMeta.action;
                  const Icon = meta.icon;
                  const sess = r.session_id ? sessionDurations.get(r.session_id) : undefined;
                  const duration = (() => {
                    if (!sess?.login) return null;
                    const end = sess.logout ? new Date(sess.logout).getTime() : Date.now();
                    const start = new Date(sess.login).getTime();
                    const mins = Math.max(0, Math.floor((end - start) / 60000));
                    if (mins < 60) return `${mins}min`;
                    const h = Math.floor(mins / 60);
                    return `${h}h${mins % 60 ? ` ${mins % 60}m` : ""}`;
                  })();

                  return (
                    <tr key={r.id} className="border-t border-border hover:bg-card-elevated transition-colors">
                      <td className="px-5 py-3 align-top whitespace-nowrap">
                        <div className="text-xs font-semibold text-foreground tabular-nums">{fmtHour(r.created_at)}</div>
                        <div className="text-[10px] text-muted-foreground tabular-nums">{fmtDate(r.created_at)} · {relTime(r.created_at)}</div>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <button
                          onClick={() => r.user_id && setDrawerUser({ id: r.user_id, name: r.user_name ?? "Anônimo", email: r.user_email })}
                          className="flex items-center gap-2 group text-left"
                        >
                          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                            <UserIcon className="w-3 h-3 text-muted-foreground group-hover:text-primary" />
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">{r.user_name ?? "Anônimo"}</div>
                            {r.user_email && <div className="text-[10px] text-muted-foreground">{r.user_email}</div>}
                          </div>
                        </button>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${meta.cls}`}>
                          <Icon className="w-3 h-3" />{meta.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 align-top text-muted-foreground">
                        <div className="text-xs text-foreground">{r.description}</div>
                        {r.metadata && Object.keys(r.metadata).length > 0 && (
                          <div className="mt-1 text-[10px] font-mono text-muted-foreground truncate max-w-[360px]">
                            {Object.entries(r.metadata).map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`).join(" · ")}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 align-top text-right">
                        {duration ? (
                          <span className="inline-block rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-mono text-muted-foreground tabular-nums">{duration}</span>
                        ) : (<span className="text-[10px] text-muted-foreground/50">—</span>)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Sheet open={!!drawerUser} onOpenChange={(o) => !o && setDrawerUser(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Histórico de {drawerUser?.name}
            </SheetTitle>
            <SheetDescription>
              {drawerUser?.email ?? "Sem e-mail"} · {userHistory.length} eventos carregados
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-3">
            {userHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem histórico.</p>
            ) : userHistory.map((r) => {
              const meta = typeMeta[r.event_type] ?? typeMeta.action;
              const Icon = meta.icon;
              return (
                <div key={r.id} className="relative pl-6 pb-3 border-l border-border last:border-l-transparent">
                  <span className={`absolute -left-[7px] top-1 w-3 h-3 rounded-full border-2 border-card ${
                    r.event_type === "error" ? "bg-red-500" :
                    r.event_type === "login" ? "bg-emerald-500" :
                    r.event_type === "logout" ? "bg-amber-500" : "bg-primary"
                  }`} />
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${meta.cls}`}>
                      <Icon className="w-3 h-3" />{meta.label}
                    </span>
                    <span className="text-[11px] text-muted-foreground tabular-nums">{fmtFull(r.created_at)}</span>
                  </div>
                  <p className="text-sm text-foreground">{r.description}</p>
                  {r.metadata && Object.keys(r.metadata).length > 0 && (
                    <p className="mt-1 text-[10px] font-mono text-muted-foreground">
                      {Object.entries(r.metadata).map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`).join(" · ")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
