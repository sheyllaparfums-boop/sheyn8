import { createFileRoute, ErrorComponent } from "@tanstack/react-router";
import { requireAuth } from "@/lib/route-guards";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  Search,
  RefreshCw,
  Filter,
  PlayCircle,
  Download,
  Radio,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { DashboardHeader } from "@/components/dashboard/Header";
import { getHistorico, type HistoricoEntry } from "@/lib/historico.functions";
import { useAuthStore } from "@/lib/auth-store";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/execucoes")({
  beforeLoad: ({ location }) => requireAuth(location),
  head: () => ({
    meta: [
      { title: "Execuções — SHEY N8N" },
      { name: "description", content: "Histórico e status de execuções de workflows e automações." },
      { property: "og:title", content: "Execuções — SHEY N8N" },
      { property: "og:description", content: "Acompanhe em tempo real as execuções dos seus workflows e automações." },
      { property: "og:image", content: "https://sheyn8n.lovable.app/og-image.jpg" },
      { property: "og:url", content: "https://sheyn8n.lovable.app/execucoes" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://sheyn8n.lovable.app/og-image.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://sheyn8n.lovable.app/execucoes" }],
  }),
  component: ExecucoesPage,
  errorComponent: ({ error, reset }) => (
    <div className="min-h-screen bg-[#080808] p-6 text-white">
      <ErrorComponent error={error} />
      <Button onClick={reset} className="mt-4">Tentar de novo</Button>
    </div>
  ),
});

const statusStyles: Record<string, { cls: string; label: string; Icon: any }> = {
  success: { cls: "bg-green-500/10 text-green-400 border-green-500/30", label: "Sucesso", Icon: CheckCircle2 },
  error: { cls: "bg-red-500/10 text-red-400 border-red-500/30", label: "Erro", Icon: XCircle },
  pending: { cls: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30", label: "Pendente", Icon: Clock },
  info: { cls: "bg-blue-500/10 text-blue-400 border-blue-500/30", label: "Info", Icon: Activity },
};

function StatusPill({ status }: { status: string }) {
  const s = statusStyles[status] ?? statusStyles.info;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${s.cls}`}>
      <s.Icon className="h-3 w-3" />
      {s.label}
    </span>
  );
}

function formatRelative(dateStr: string): string {
  const d = new Date(dateStr).getTime();
  const diff = Date.now() - d;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m}m atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

function getDuration(entry: HistoricoEntry): number | null {
  const m = entry.metadata;
  if (!m) return null;
  const d = m.duration_ms ?? m.durationMs ?? m.duration;
  return typeof d === "number" ? d : null;
}

function rangeToIso(range: string): string | undefined {
  if (range === "all") return undefined;
  const now = Date.now();
  const map: Record<string, number> = {
    "1h": 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
  };
  const ms = map[range];
  return ms ? new Date(now - ms).toISOString() : undefined;
}

function csvEscape(v: any): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const PAGE_SIZE = 100;

function ExecucoesPage() {
  const { user } = useAuthStore();
  const fetchHistorico = useServerFn(getHistorico);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [eventType, setEventType] = useState("all");
  const [dateRange, setDateRange] = useState("24h");
  const [pageCount, setPageCount] = useState(1);
  const [selected, setSelected] = useState<HistoricoEntry | null>(null);

  const sinceIso = rangeToIso(dateRange);
  const limit = PAGE_SIZE * pageCount;

  const { data, isLoading, refetch, isFetching, error } = useQuery({
    queryKey: ["execucoes", user?.id, user?.role, status, eventType, dateRange, limit],
    queryFn: () =>
      fetchHistorico({
        data: {
          limit,
          offset: 0,
          status,
          eventType,
          sinceIso,
          userId: user?.id,
          userRole: user?.role,
        },
      }),
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  // Realtime
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel("activity_logs_feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_logs" },
        () => refetch(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refetch]);

  const rows: HistoricoEntry[] = data?.rows ?? [];
  const eventTypes: string[] = data?.eventTypes ?? [];
  const total = data?.total ?? 0;

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.description?.toLowerCase().includes(q) ||
        r.event_type?.toLowerCase().includes(q) ||
        r.user_name?.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const stats = useMemo(() => {
    const total = rows.length;
    const success = rows.filter((r) => r.status === "success").length;
    const errors = rows.filter((r) => r.status === "error").length;
    const pending = rows.filter((r) => r.status === "pending").length;
    const rate = total > 0 ? Math.round((success / total) * 100) : 0;
    const durations = rows.map(getDuration).filter((d): d is number => d != null);
    const avgMs = durations.length
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;
    return { total, success, errors, pending, rate, avgMs };
  }, [rows]);

  const handleExport = () => {
    if (!filtered.length) {
      toast.error("Nada para exportar");
      return;
    }
    const header = ["data", "status", "evento", "descrição", "usuário", "duração_ms"];
    const lines = [
      header.join(","),
      ...filtered.map((r) =>
        [
          r.created_at,
          r.status,
          r.event_type,
          r.description,
          r.user_name ?? "",
          getDuration(r) ?? "",
        ]
          .map(csvEscape)
          .join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `execucoes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filtered.length} linhas exportadas`);
  };

  return (
    <div className="min-h-screen bg-[#080808] pb-24 md:pb-12">
      <DashboardHeader />

      <div className="px-4 md:px-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-primary/80">
              <PlayCircle className="h-4 w-4" />
              Plataforma
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/30 px-2 py-0.5 text-[9px]">
                <Radio className="h-2.5 w-2.5 animate-pulse" /> AO VIVO
              </span>
            </div>
            <h1 className="mt-1 text-3xl md:text-4xl font-black tracking-tight text-white">
              Execuções
            </h1>
            <p className="mt-1 text-sm text-gray-400 max-w-xl">
              Acompanhe em tempo real cada execução de workflow, automação e ação da plataforma.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="border-white/10 bg-white/5 hover:bg-white/10"
            >
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="border-white/10 bg-white/5 hover:bg-white/10"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Total", value: stats.total, accent: "text-white" },
            { label: "Sucesso", value: stats.success, accent: "text-green-400" },
            { label: "Erros", value: stats.errors, accent: "text-red-400" },
            { label: "Taxa", value: `${stats.rate}%`, accent: "text-primary" },
            {
              label: "Duração média",
              value: stats.avgMs ? `${(stats.avgMs / 1000).toFixed(2)}s` : "—",
              accent: "text-cyan-400",
              icon: Timer,
            },
          ].map((s) => (
            <Card key={s.label} className="bg-[#0f0f0f] border-white/5">
              <CardContent className="p-4">
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  {s.label}
                </div>
                <div className={`mt-1 text-2xl font-black ${s.accent}`}>{s.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Buscar por descrição, evento ou usuário…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-[#0f0f0f] border-white/10"
            />
          </div>
          <Select value={dateRange} onValueChange={(v) => { setDateRange(v); setPageCount(1); }}>
            <SelectTrigger className="w-full md:w-40 bg-[#0f0f0f] border-white/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Última hora</SelectItem>
              <SelectItem value="24h">Últimas 24h</SelectItem>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="all">Tudo</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPageCount(1); }}>
            <SelectTrigger className="w-full md:w-40 bg-[#0f0f0f] border-white/10">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="success">Sucesso</SelectItem>
              <SelectItem value="error">Erro</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>
          <Select value={eventType} onValueChange={(v) => { setEventType(v); setPageCount(1); }}>
            <SelectTrigger className="w-full md:w-56 bg-[#0f0f0f] border-white/10">
              <SelectValue placeholder="Tipo de evento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos eventos</SelectItem>
              {eventTypes.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Feed */}
        <Card className="bg-[#0f0f0f] border-white/5">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="p-12 text-center">
                <XCircle className="mx-auto h-10 w-10 text-red-400 mb-3" />
                <div className="text-sm font-bold text-white">Erro ao carregar</div>
                <div className="text-xs text-gray-500 mt-1">{(error as Error).message}</div>
                <Button size="sm" variant="outline" className="mt-4" onClick={() => refetch()}>
                  Tentar novamente
                </Button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <Activity className="mx-auto h-10 w-10 text-gray-600 mb-3" />
                <div className="text-sm font-bold text-white">Nenhuma execução encontrada</div>
                <div className="text-xs text-gray-500 mt-1">
                  Ajuste os filtros ou aguarde novas execuções.
                </div>
              </div>
            ) : (
              <>
                <ul className="divide-y divide-white/5">
                  {filtered.map((r) => {
                    const dur = getDuration(r);
                    return (
                      <li
                        key={r.id}
                        onClick={() => setSelected(r)}
                        className="flex items-start gap-3 p-4 hover:bg-white/[0.03] transition-colors cursor-pointer"
                      >
                        <div className="mt-0.5">
                          <StatusPill status={r.status} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-white truncate">{r.description}</span>
                            <Badge variant="outline" className="text-[10px] border-white/10 text-gray-400">
                              {r.event_type}
                            </Badge>
                            {dur != null && (
                              <Badge variant="outline" className="text-[10px] border-cyan-500/20 text-cyan-400">
                                {(dur / 1000).toFixed(2)}s
                              </Badge>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                            <span>{formatRelative(r.created_at)}</span>
                            {r.user_name && <span>• {r.user_name}</span>}
                            <span className="hidden md:inline">• {new Date(r.created_at).toLocaleString("pt-BR")}</span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {rows.length < total && (
                  <div className="p-4 border-t border-white/5 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPageCount((p) => p + 1)}
                      disabled={isFetching}
                      className="border-white/10 bg-white/5 hover:bg-white/10"
                    >
                      {isFetching ? "Carregando…" : `Carregar mais (${total - rows.length} restantes)`}
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail sheet */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="bg-[#0a0a0a] border-white/10 text-white w-full sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2 mb-2">
                  <StatusPill status={selected.status} />
                  <Badge variant="outline" className="text-[10px] border-white/10 text-gray-400">
                    {selected.event_type}
                  </Badge>
                </div>
                <SheetTitle className="text-white">{selected.description}</SheetTitle>
                <SheetDescription className="text-gray-400">
                  {new Date(selected.created_at).toLocaleString("pt-BR")}
                  {selected.user_name && ` • ${selected.user_name}`}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4 text-sm">
                {getDuration(selected) != null && (
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Duração</div>
                    <div className="text-cyan-400 font-mono">
                      {(getDuration(selected)! / 1000).toFixed(3)}s
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">ID</div>
                  <code className="text-xs text-gray-300 break-all">{selected.id}</code>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Metadata</div>
                  <pre className="text-xs bg-black/40 border border-white/5 rounded p-3 overflow-x-auto text-gray-300">
{selected.metadata ? JSON.stringify(selected.metadata, null, 2) : "(vazio)"}
                  </pre>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
