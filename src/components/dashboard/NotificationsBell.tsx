import { useEffect, useState, useCallback } from "react";
import { Bell, AlertTriangle, AlertCircle, Info, CheckCircle2, X, RefreshCw } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { getSmartAlerts, type SmartAlert, type AlertSeverity } from "@/lib/alerts.functions";

const DISMISSED_KEY = "shey:alerts:dismissed";
const READ_KEY = "shey:alerts:read";

function loadSet(key: string): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(key) || "[]")); } catch { return new Set(); }
}
function saveSet(key: string, s: Set<string>) {
  try { localStorage.setItem(key, JSON.stringify([...s])); } catch {}
}

const severityStyles: Record<AlertSeverity, { icon: typeof Bell; color: string; bg: string; border: string }> = {
  critical: { icon: AlertCircle, color: "text-red-400", bg: "bg-red-500/5", border: "border-red-500/30" },
  warning: { icon: AlertTriangle, color: "text-yellow-300", bg: "bg-yellow-500/5", border: "border-yellow-500/30" },
  info: { icon: Info, color: "text-blue-300", bg: "bg-blue-500/5", border: "border-blue-500/30" },
  success: { icon: CheckCircle2, color: "text-emerald-300", bg: "bg-emerald-500/5", border: "border-emerald-500/30" },
};

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<SmartAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(() => loadSet(DISMISSED_KEY));
  const [read, setRead] = useState<Set<string>>(() => loadSet(READ_KEY));

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getSmartAlerts();
      setAlerts(r.alerts);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 60_000);
    return () => clearInterval(t);
  }, [refresh]);

  const visible = alerts.filter((a) => !dismissed.has(a.id));
  const unread = visible.filter((a) => !read.has(a.id));
  const criticalCount = visible.filter((a) => a.severity === "critical").length;
  const badgeCount = unread.length;

  const markAllRead = () => {
    const next = new Set(read);
    visible.forEach((a) => next.add(a.id));
    setRead(next);
    saveSet(READ_KEY, next);
  };

  const dismiss = (id: string) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    saveSet(DISMISSED_KEY, next);
  };

  const handleOpen = (o: boolean) => {
    setOpen(o);
    if (o) setTimeout(markAllRead, 1500);
  };

  const BellIcon = criticalCount > 0 ? AlertTriangle : Bell;
  const bellColor = criticalCount > 0 ? "text-red-400" : "";

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Alertas inteligentes" className="relative">
          <BellIcon className={`h-4 w-4 ${bellColor}`} />
          {badgeCount > 0 && (
            <span className={`absolute -right-0.5 -top-0.5 min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-bold text-white flex items-center justify-center ${criticalCount > 0 ? "bg-red-500 animate-pulse" : "bg-primary"}`}>
              {badgeCount > 9 ? "9+" : badgeCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0 max-h-[70vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold">Alertas inteligentes</span>
            <span className="text-[10px] text-muted-foreground tabular-nums">({visible.length})</span>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={refresh} aria-label="Atualizar">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {visible.length === 0 && (
            <div className="px-3 py-8 text-center">
              <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-400 mb-2" />
              <p className="text-sm font-semibold text-foreground">Tudo certo por aqui</p>
              <p className="text-xs text-muted-foreground mt-1">Nenhum alerta no momento.</p>
            </div>
          )}
          {visible.map((a) => {
            const s = severityStyles[a.severity];
            const Icon = s.icon;
            return (
              <div key={a.id} className={`relative rounded-lg border ${s.border} ${s.bg} p-2.5 pr-7`}>
                <button
                  onClick={() => dismiss(a.id)}
                  className="absolute right-1.5 top-1.5 p-0.5 rounded hover:bg-muted/50 text-muted-foreground"
                  aria-label="Dispensar"
                >
                  <X className="h-3 w-3" />
                </button>
                <div className="flex items-start gap-2">
                  <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${s.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground leading-tight">{a.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{a.description}</p>
                    {a.href && (
                      <Link
                        to={a.href}
                        onClick={() => setOpen(false)}
                        className={`inline-block mt-1.5 text-[10px] font-bold uppercase tracking-wide ${s.color} hover:underline`}
                      >
                        {a.cta || "Abrir"} →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {dismissed.size > 0 && (
          <div className="border-t border-border px-3 py-2">
            <button
              onClick={() => { setDismissed(new Set()); saveSet(DISMISSED_KEY, new Set()); }}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Restaurar {dismissed.size} alerta(s) dispensado(s)
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
