import { createFileRoute, Link } from "@tanstack/react-router";
import { requireAuth } from "@/lib/route-guards";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Users, Search, Loader2, Heart, MessageCircle, TrendingUp, TrendingDown,
  Lightbulb, Copy, AlertTriangle, ListChecks, Clock, Hash, Trash2, History, ExternalLink,
} from "lucide-react";

import { DashboardHeader } from "@/components/dashboard/Header";
import {
  analyzeCompetitor,
  listCompetitorAnalyses,
  getCompetitorAnalysis,
  deleteCompetitorAnalysis,
  type CompetitorReport,
} from "@/lib/competitor.functions";
import { useAuthStore } from "@/lib/auth-store";
import { logActivity } from "@/lib/activity-logger";

export const Route = createFileRoute("/concorrente")({
  beforeLoad: ({ location }) => requireAuth(location),
  head: () => ({
    meta: [
      { title: "Análise de Concorrente — SHEY N8N" },
      { name: "description", content: "Análise profunda de perfis concorrentes no Instagram com insights da SHEY AI." },
    ],
  }),
  component: ConcorrentePage,
});

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
}

function Delta({ value, suffix = "" }: { value: number; suffix?: string }) {
  if (value === 0) return <span className="text-muted-foreground text-xs">igual</span>;
  const positive = value > 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${positive ? "text-emerald-400" : "text-red-400"}`}>
      <Icon className="h-3 w-3" />
      {positive ? "+" : ""}{value}{suffix}
    </span>
  );
}

function ConcorrentePage() {
  const run = useServerFn(analyzeCompetitor);
  const list = useServerFn(listCompetitorAnalyses);
  const get = useServerFn(getCompetitorAnalysis);
  const del = useServerFn(deleteCompetitorAnalysis);
  const profileHandle = useAuthStore((s) => s.user ? s.onboardingByUser[s.user.id]?.handle ?? "" : "");

  const [competitor, setCompetitor] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<CompetitorReport | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  async function refreshHistory() {
    const r = await list();
    if (r.ok) setHistory(r.items);
  }
  useEffect(() => { refreshHistory(); }, []);

  async function handleRun() {
    const c = competitor.replace(/^@/, "").trim();
    if (!profileHandle) { toast.error("Configure seu @ em User primeiro"); return; }
    if (!c) { toast.error("Digite o @ do concorrente"); return; }
    setLoading(true);
    setReport(null);
    const t = toast.loading(`Analisando @${c}... 30-60s`);
    try {
      const r = await run({ data: { competitor: c, baseHandle: profileHandle } });
      toast.dismiss(t);
      if (r.competitor.source === "error") {
        toast.error(r.competitor.error ?? "Falha");
        logActivity({ event_type: "error", description: `Concorrente @${c} falhou`, status: "error" });
      } else {
        setReport(r);
        toast.success(`Análise pronta: @${c}`);
        logActivity({ event_type: "action", description: `Analisou concorrente @${c}`, status: "success", metadata: { competitor: c, followers: r.competitor.profile.followers } });
        refreshHistory();
      }
    } catch (e: any) {
      toast.dismiss(t);
      toast.error(e?.message ?? "Erro");
    } finally {
      setLoading(false);
    }
  }

  async function openHistory(id: string) {
    const r = await get({ data: { id } });
    if (r.ok) {
      setReport(r.report);
      setCompetitor(r.report.competitor.handle);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else toast.error(r.error || "Erro");
  }

  async function removeHistory(id: string) {
    if (!confirm("Excluir esta análise?")) return;
    const r = await del({ data: { id } });
    if (r.ok) { toast.success("Excluída"); refreshHistory(); }
    else toast.error(r.error || "Erro");
  }

  const c = report?.competitor;
  const cmp = report?.compare;
  const ai = report?.insights;

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <DashboardHeader />
      <main className="flex-1 p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Análise de Concorrente
          </h1>

          <p className="text-sm text-muted-foreground mt-1">
            Cole o @ de um perfil concorrente e a SHEY AI gera o relatório de oportunidades.
          </p>
        </div>

        {!profileHandle && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-foreground">Salve o @ desta conta em User para comparar com concorrentes.</p>
            <Link to="/user" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Ir para User</Link>
          </div>
        )}

        {/* Form */}
        <div className="rounded-xl border border-border bg-card p-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <div>
            <label className="text-xs text-muted-foreground">Concorrente *</label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={competitor}
                onChange={(e) => setCompetitor(e.target.value)}
                placeholder="@perfildoconcorrente"
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Seu @ (opcional, pra comparar)</label>
            <input
              value={profileHandle ? `@${profileHandle}` : ""}
              readOnly
              placeholder="@seuperfil"
              className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:border-primary opacity-70 cursor-not-allowed"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleRun}
              disabled={loading || !profileHandle}
              className="px-5 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
              {loading ? "Analisando..." : "Analisar"}
            </button>
          </div>
        </div>

        {/* Relatório */}
        {c && c.source !== "error" && (
          <div className="space-y-5">
            {/* Header do perfil */}
            <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-4 flex-wrap">
              {c.profile.profilePic && (
                <img src={c.profile.profilePic} alt={c.handle} className="h-16 w-16 rounded-full border-2 border-primary/40" />
              )}
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold">@{c.handle}</h2>
                  {c.profile.isVerified && <span className="text-blue-400 text-xs">✓ verificado</span>}
                  {c.profile.isBusiness && <span className="text-xs px-2 py-0.5 rounded-full bg-muted">business</span>}
                </div>
                {c.profile.fullName && <p className="text-sm text-muted-foreground">{c.profile.fullName}</p>}
                {c.profile.bio && <p className="text-xs text-muted-foreground mt-1 max-w-2xl">{c.profile.bio}</p>}
              </div>
              <a
                href={`https://instagram.com/${c.handle}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                Abrir <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {/* Métricas */}
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
              <MetricCard label="Seguidores" value={fmt(c.profile.followers)} delta={cmp && <Delta value={cmp.followersDelta} />} />
              <MetricCard label="Engajamento" value={`${c.metrics.engagementRate}%`} delta={cmp && <Delta value={cmp.engagementDelta} suffix="%" />} />
              <MetricCard label="❤ médio" value={fmt(c.metrics.avgLikes)} delta={cmp && <Delta value={cmp.avgLikesDelta} />} />
              <MetricCard label="💬 médio" value={fmt(c.metrics.avgComments)} delta={cmp && <Delta value={cmp.avgCommentsDelta} />} />
            </div>

            {/* IA Insights */}
            {ai && (
              <div className="grid gap-3 md:grid-cols-2">
                <InsightBlock icon={<Lightbulb className="h-4 w-4" />} title="Diagnóstico" color="primary">
                  <p className="text-sm leading-relaxed">{ai.summary}</p>
                </InsightBlock>
                <InsightList icon={<TrendingUp className="h-4 w-4" />} title="Oportunidades" color="emerald" items={ai.opportunities} />
                <InsightList icon={<Copy className="h-4 w-4" />} title="O que vale replicar" color="blue" items={ai.contentToCopy} />
                <InsightList icon={<AlertTriangle className="h-4 w-4" />} title="Cuidados" color="amber" items={ai.warnings} />
                <div className="md:col-span-2">
                  <InsightList icon={<ListChecks className="h-4 w-4" />} title="Próximas ações" color="primary" items={ai.nextActions} />
                </div>
              </div>
            )}

            {/* Hashtags + horários */}
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-sm font-bold flex items-center gap-2 mb-3"><Hash className="h-4 w-4 text-primary" /> Hashtags mais usadas</h3>
                <div className="flex flex-wrap gap-1.5">
                  {c.metrics.topHashtags.length === 0 && <span className="text-xs text-muted-foreground">Nenhuma</span>}
                  {c.metrics.topHashtags.map((h) => (
                    <span key={h.tag} className="text-xs px-2 py-1 rounded-full bg-primary/15 text-primary border border-primary/30">
                      {h.tag} <span className="text-[10px] opacity-70">×{h.count}</span>
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-sm font-bold flex items-center gap-2 mb-3"><Clock className="h-4 w-4 text-primary" /> Melhores horários</h3>
                <div className="flex flex-wrap gap-1.5">
                  {c.metrics.bestHours.length === 0 && <span className="text-xs text-muted-foreground">Sem dados</span>}
                  {c.metrics.bestHours.map((h) => (
                    <span key={h.hour} className="text-xs px-2 py-1 rounded-md bg-muted">
                      {String(h.hour).padStart(2, "0")}h <span className="opacity-60">· {fmt(h.avgEngagement)}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Top posts */}
            <div>
              <h3 className="text-sm font-bold mb-3">Top posts</h3>
              <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                {c.topPosts.map((p) => (
                  <a
                    key={p.url}
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group rounded-lg overflow-hidden border border-border bg-card hover:border-primary/50 transition"
                  >
                    {p.thumbnail ? (
                      <img src={p.thumbnail} alt="" className="aspect-square object-cover w-full" loading="lazy" />
                    ) : (
                      <div className="aspect-square bg-muted" />
                    )}
                    <div className="p-2 flex justify-between text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {fmt(p.likes)}</span>
                      <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" /> {fmt(p.comments)}</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Histórico */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-bold flex items-center gap-2 mb-3"><History className="h-4 w-4 text-primary" /> Histórico ({history.length})</h3>
          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma análise ainda.</p>
          ) : (
            <div className="grid gap-2">
              {history.map((h) => (
                <div key={h.id} className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-muted/50 transition">
                  <button onClick={() => openHistory(h.id)} className="flex-1 text-left flex items-center gap-3">
                    <span className="font-medium text-sm">@{h.competitor_handle}</span>
                    <span className="text-xs text-muted-foreground">{fmt(h.followers || 0)} seg · {h.engagement_rate}% eng</span>
                    {h.base_handle && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary">vs @{h.base_handle}</span>}
                    <span className="text-xs text-muted-foreground ml-auto mr-2">{new Date(h.created_at).toLocaleDateString("pt-BR")}</span>
                  </button>
                  <button onClick={() => removeHistory(h.id)} className="p-1.5 rounded-md hover:bg-red-500/15 hover:text-red-400 text-muted-foreground transition">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function MetricCard({ label, value, delta }: { label: string; value: string; delta?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {delta && <div className="mt-1">{delta}</div>}
    </div>
  );
}

const COLOR_CLASS: Record<string, string> = {
  primary: "border-primary/30 bg-primary/5",
  emerald: "border-emerald-500/30 bg-emerald-500/5",
  blue: "border-blue-500/30 bg-blue-500/5",
  amber: "border-amber-500/30 bg-amber-500/5",
};
const ICON_COLOR: Record<string, string> = {
  primary: "text-primary",
  emerald: "text-emerald-400",
  blue: "text-blue-400",
  amber: "text-amber-400",
};

function InsightBlock({ icon, title, color, children }: { icon: React.ReactNode; title: string; color: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-xl border p-4 ${COLOR_CLASS[color]}`}>
      <h3 className={`text-sm font-bold flex items-center gap-2 mb-2 ${ICON_COLOR[color]}`}>{icon} {title}</h3>
      {children}
    </div>
  );
}

function InsightList({ icon, title, color, items }: { icon: React.ReactNode; title: string; color: string; items: string[] }) {
  return (
    <InsightBlock icon={icon} title={title} color={color}>
      <ul className="space-y-1.5 text-sm">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2"><span className={`shrink-0 ${ICON_COLOR[color]}`}>›</span><span>{it}</span></li>
        ))}
      </ul>
    </InsightBlock>
  );
}
