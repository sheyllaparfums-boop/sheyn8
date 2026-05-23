import { createFileRoute, Link } from "@tanstack/react-router";
import { requireAuth } from "@/lib/route-guards";
import { Fragment, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Search, Loader2, CheckCircle2, TrendingUp, TrendingDown, Heart, MessageCircle,
  Sparkles, Clock, Hash, AlertTriangle, ExternalLink, History, Trash2, Share2,
  Calendar as CalendarIcon, FileText, Copy, Pencil, Bell, BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/dashboard/Header";
import { analyzeProfile, type ProfileAnalysis } from "@/lib/profile-analysis.functions";
import {
  saveAnalysis, listAnalyses, getAnalysis, deleteAnalysis, toggleSharePublic,
  setSchedule, getNicheBenchmark, saveIdeaAsHook, scheduleActionInCalendar,
} from "@/lib/profile-analysis-history.functions";
import { logActivity } from "@/lib/activity-logger";
import { useAuthStore } from "@/lib/auth-store";

export const Route = createFileRoute("/analise")({
  beforeLoad: ({ location }) => requireAuth(location),
  head: () => ({
    meta: [
      { title: "Análise de Perfil — SHEY N8N" },
      { name: "description", content: "Análise completa do seu perfil Instagram com insights da SHEY AI, histórico, benchmark e ações 1-click." },
    ],
  }),
  component: AnalisePage,
});

const DAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
}

function AnalisePage() {
  const user = useAuthStore((s) => s.user);
  const onboardingHandle = useAuthStore((s) => (s.user ? s.onboardingByUser[s.user.id]?.handle ?? "" : ""));
  const niche = useAuthStore((s) => (s.user ? s.onboardingByUser[s.user.id]?.niche ?? "geral" : "geral"));

  const [handle, setHandle] = useState(onboardingHandle);
  const [editable, setEditable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProfileAnalysis | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [benchmark, setBenchmark] = useState<any>(null);
  const [showHistory, setShowHistory] = useState(false);

  const run = useServerFn(analyzeProfile);
  const save = useServerFn(saveAnalysis);
  const list = useServerFn(listAnalyses);
  const getOne = useServerFn(getAnalysis);
  const del = useServerFn(deleteAnalysis);
  const togglePub = useServerFn(toggleSharePublic);
  const setSched = useServerFn(setSchedule);
  const bench = useServerFn(getNicheBenchmark);
  const saveHook = useServerFn(saveIdeaAsHook);
  const schedCal = useServerFn(scheduleActionInCalendar);

  useEffect(() => setHandle(onboardingHandle), [onboardingHandle]);

  const refreshHistory = async (h?: string) => {
    try {
      const r = await list({ data: { handle: h ?? handle } });
      setHistory(r.rows);
    } catch {}
  };

  useEffect(() => {
    if (user) refreshHistory();
    if (user && niche) bench({ data: { niche } }).then(setBenchmark).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, niche]);

  const previous = history.find((h) => h.id !== currentId);

  const delta = useMemo(() => {
    if (!result || result.source !== "apify" || !previous) return null;
    return {
      followers: result.profile.followers - previous.followers,
      engagement: Number((result.metrics.engagementRate - Number(previous.engagement_rate ?? 0)).toFixed(2)),
      likes: result.metrics.avgLikes - previous.avg_likes,
    };
  }, [result, previous]);

  const handleAnalyze = async () => {
    const h = handle.replace(/^@/, "").trim();
    if (!h) { toast.error("Informe um @"); return; }
    setLoading(true); setResult(null); setCurrentId(null);
    const t = toast.loading(`Analisando @${h}... pode levar 30-60s`);
    try {
      const r = await run({ data: { handle: h } });
      setResult(r);
      toast.dismiss(t);
      if (r.source === "error") {
        toast.error(r.error ?? "Falha");
        logActivity({ event_type: "error", description: `Análise de @${h} falhou`, status: "error", metadata: { handle: h, error: r.error } });
      } else {
        toast.success(`Análise completa: @${h}`);
        // salvar histórico
        try {
          const saved = await save({ data: { handle: h, analysis: r, niche } });
          if (saved.id) setCurrentId(saved.id);
          await refreshHistory(h);
        } catch (e: any) {
          console.warn("save analysis failed", e?.message);
        }
        logActivity({ event_type: "action", description: `Analisou perfil @${h}`, status: "success", metadata: { handle: h, followers: r.profile.followers, engagement: r.metrics.engagementRate } });
        // notificação nativa
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification("Análise pronta", { body: `@${h} · ${r.metrics.engagementRate}% engajamento` });
        }
      }
    } catch (e: any) {
      toast.dismiss(t);
      toast.error(e?.message ?? "Erro");
    } finally {
      setLoading(false);
    }
  };

  const loadFromHistory = async (id: string) => {
    try {
      const row = await getOne({ data: { id } });
      if (row?.snapshot) {
        setResult(row.snapshot as any);
        setCurrentId(id);
        setShowHistory(false);
        toast.success("Snapshot carregado");
      }
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apagar essa análise?")) return;
    await del({ data: { id } });
    await refreshHistory();
    toast.success("Apagado");
  };

  const handleShare = async (id: string, currentPublic: boolean) => {
    const r = await togglePub({ data: { id, makePublic: !currentPublic } });
    await refreshHistory();
    if (r.slug) {
      const url = `${window.location.origin}/r/${r.slug}`;
      await navigator.clipboard.writeText(url).catch(() => {});
      toast.success("Link público copiado");
    } else {
      toast.success("Link público desativado");
    }
  };

  const handleSchedule = async (id: string, enabled: boolean) => {
    await setSched({ data: { id, enabled, cron: enabled ? "0 9 * * 1" : null } });
    await refreshHistory();
    toast.success(enabled ? "Reanálise semanal (seg 09h)" : "Agendamento removido");
  };

  const askNotifications = () => {
    if (typeof Notification === "undefined") return;
    Notification.requestPermission().then((p) => {
      if (p === "granted") toast.success("Notificações ativadas");
    });
  };

  const exportPDF = () => window.print();

  const sendIdeaToCarousel = (idea: string) => {
    try { sessionStorage.setItem("carousel_prefill", JSON.stringify({ topic: idea })); } catch {}
    window.location.href = "/carrossel";
  };

  const sendPostToTranscription = (url: string) => {
    try { sessionStorage.setItem("transcription_prefill", url); } catch {}
    window.location.href = "/transcricao";
  };

  // Engagement trend line (sparkline) — histórico
  const trendPoints = useMemo(() => {
    const sorted = [...history].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return sorted.map((r) => ({ date: r.created_at, eng: Number(r.engagement_rate ?? 0), foll: r.followers }));
  }, [history]);

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      <div className="flex-1 space-y-6 px-4 py-6 md:px-8 md:py-8 print:p-0">
        {/* Search */}
        <div className="rounded-xl border border-border bg-card p-5 print:hidden">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
            <h1 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" /> Análise de Perfil
            </h1>
            <div className="flex items-center gap-2">
              <button onClick={askNotifications} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                <Bell className="w-3.5 h-3.5" /> Notificar quando terminar
              </button>
              <button onClick={() => setShowHistory((v) => !v)} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card-elevated px-3 py-1.5 text-xs font-semibold hover:border-primary/40">
                <History className="w-3.5 h-3.5" /> Histórico ({history.length})
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-4">SHEY AI diagnostica e sugere próximas ações. Analise seu @ ou qualquer perfil público.</p>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={handle}
                readOnly={!editable}
                onChange={(e) => setHandle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                placeholder="@usuario"
                disabled={loading}
                className="w-full rounded-md border border-border bg-background pl-9 pr-10 py-2 text-sm focus:outline-none focus:border-primary disabled:opacity-60"
              />
              <button
                onClick={() => setEditable((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                title={editable ? "Travar" : "Editar @"}
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
            <button
              onClick={handleAnalyze}
              disabled={loading || !handle}
              className="inline-flex items-center gap-2 rounded-md bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {loading ? "Analisando..." : "Analisar"}
            </button>
          </div>

          {/* Histórico inline */}
          {showHistory && (
            <div className="mt-4 border-t border-border pt-4 space-y-2 max-h-72 overflow-y-auto">
              {history.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma análise ainda. Rode uma análise pra começar a montar histórico.</p>
              ) : history.map((h) => (
                <div key={h.id} className="flex items-center gap-2 text-xs rounded-md border border-border bg-card-elevated px-3 py-2">
                  <button onClick={() => loadFromHistory(h.id)} className="flex-1 text-left">
                    <div className="font-semibold text-foreground">@{h.handle} · {h.engagement_rate}% eng</div>
                    <div className="text-muted-foreground">{new Date(h.created_at).toLocaleString("pt-BR")} · {formatNum(h.followers)} seg</div>
                  </button>
                  <button onClick={() => handleShare(h.id, h.is_public)} title={h.is_public ? "Pública" : "Compartilhar"} className={`p-1.5 rounded hover:bg-muted ${h.is_public ? "text-primary" : "text-muted-foreground"}`}>
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleSchedule(h.id, !h.schedule_enabled)} title={h.schedule_enabled ? "Agendado (seg 09h)" : "Agendar semanal"} className={`p-1.5 rounded hover:bg-muted ${h.schedule_enabled ? "text-primary" : "text-muted-foreground"}`}>
                    <CalendarIcon className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(h.id)} className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3">
            <div className="rounded-xl border border-border bg-card p-8 text-center animate-pulse">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
              <p className="text-sm text-foreground font-semibold">Coletando dados via Apify + SHEY AI...</p>
              <p className="text-xs text-muted-foreground mt-1">Isso pode levar até 1 minuto. Você pode sair da aba — vamos te notificar.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[0,1,2,3].map((i) => <div key={i} className="h-24 rounded-xl border border-border bg-card animate-pulse" />)}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !result && (
          <div className="rounded-xl border border-dashed border-border bg-card/40 p-8 text-center print:hidden">
            <BarChart3 className="w-12 h-12 text-primary/40 mx-auto mb-3" />
            <h3 className="font-display text-base font-bold text-foreground">Nenhuma análise ainda</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              Clique em <strong>Analisar</strong> pra ver: seguidores, engajamento, melhores horários, top hashtags, diagnóstico da IA,
              padrão dos virais, bio otimizada e próximas ações da semana.
            </p>
          </div>
        )}

        {/* Error */}
        {result?.source === "error" && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-5 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-400">Não foi possível analisar</h3>
              <p className="text-xs text-muted-foreground mt-1">{result.error}</p>
            </div>
          </div>
        )}

        {/* Result */}
        {result?.source === "apify" && (
          <>
            {/* Alerta de queda */}
            {result.metrics.engagementTrend <= -20 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3">
                <TrendingDown className="w-5 h-5 text-amber-400 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-400 text-sm">Engajamento em queda</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Posts recentes performam <strong>{Math.abs(result.metrics.engagementTrend)}%</strong> menos que os antigos.
                    Revisar gancho, formato e horário.
                  </p>
                </div>
              </div>
            )}

            {/* Print + Share toolbar */}
            <div className="flex items-center gap-2 flex-wrap print:hidden">
              <button onClick={exportPDF} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card-elevated px-3 py-1.5 text-xs font-semibold hover:border-primary/40">
                <FileText className="w-3.5 h-3.5" /> Exportar PDF
              </button>
              {currentId && (
                <button onClick={() => handleShare(currentId, false)} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card-elevated px-3 py-1.5 text-xs font-semibold hover:border-primary/40">
                  <Share2 className="w-3.5 h-3.5" /> Compartilhar (link público)
                </button>
              )}
              {delta && (
                <div className="inline-flex items-center gap-3 text-xs ml-auto text-muted-foreground">
                  <span>vs anterior:</span>
                  <DeltaChip label="seg" value={delta.followers} />
                  <DeltaChip label="eng" value={delta.engagement} suffix="%" />
                  <DeltaChip label="likes" value={delta.likes} />
                </div>
              )}
            </div>

            {/* Profile card */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-4 flex-wrap">
                {result.profile.profilePic ? (
                  <img src={result.profile.profilePic} alt={result.handle} className="w-16 h-16 rounded-full object-cover ring-2 ring-primary/30" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-muted" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-lg font-bold text-foreground">@{result.handle}</h2>
                    {result.profile.isVerified && <CheckCircle2 className="w-4 h-4 text-primary" />}
                    {result.profile.isBusiness && <span className="text-[10px] uppercase font-semibold text-muted-foreground border border-border rounded px-1.5">business</span>}
                  </div>
                  {result.profile.fullName && <p className="text-sm text-muted-foreground">{result.profile.fullName}</p>}
                  {result.profile.bio && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{result.profile.bio}</p>}
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div><div className="text-lg font-bold text-foreground tabular-nums">{formatNum(result.profile.followers)}</div><div className="text-[10px] uppercase text-muted-foreground">seguidores</div></div>
                  <div><div className="text-lg font-bold text-foreground tabular-nums">{formatNum(result.profile.following)}</div><div className="text-[10px] uppercase text-muted-foreground">seguindo</div></div>
                  <div><div className="text-lg font-bold text-foreground tabular-nums">{formatNum(result.profile.postsCount)}</div><div className="text-[10px] uppercase text-muted-foreground">posts</div></div>
                </div>
              </div>
            </div>

            {/* Metrics grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricBox icon={Heart} label="Curtidas médias" value={formatNum(result.metrics.avgLikes)} />
              <MetricBox icon={MessageCircle} label="Coments médios" value={formatNum(result.metrics.avgComments)} />
              <MetricBox icon={TrendingUp} label="Engajamento" value={`${result.metrics.engagementRate}%`} highlight />
              <MetricBox icon={Sparkles} label="Posts analisados" value={String(result.topPosts.length)} />
            </div>

            {/* Benchmark vs nicho */}
            {benchmark && benchmark.sample > 1 && (
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-display text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" /> Benchmark vs nicho <span className="text-muted-foreground font-normal">({niche} · {benchmark.sample} perfis)</span>
                </h3>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <BenchRow label="Engajamento" mine={result.metrics.engagementRate} avg={benchmark.avgEngagement} suffix="%" />
                  <BenchRow label="Likes médios" mine={result.metrics.avgLikes} avg={benchmark.avgLikes} />
                  <BenchRow label="Coments médios" mine={result.metrics.avgComments} avg={benchmark.avgComments} />
                </div>
              </div>
            )}

            {/* Histórico sparkline */}
            {trendPoints.length >= 2 && (
              <div className="rounded-xl border border-border bg-card p-5 print:hidden">
                <h3 className="font-display text-sm font-bold text-foreground mb-3">Evolução · {trendPoints.length} análises</h3>
                <Sparkline points={trendPoints.map((p) => p.eng)} label="engajamento %" />
              </div>
            )}

            {/* AI insights */}
            {result.ai && (
              <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h3 className="font-display text-base font-bold text-foreground">SHEY AI · Diagnóstico</h3>
                </div>
                <p className="text-sm text-foreground leading-relaxed">{result.ai.diagnosis}</p>

                <div className="grid md:grid-cols-2 gap-4">
                  <InsightList title="Pontos fortes" items={result.ai.strengths} tone="emerald" />
                  <InsightList title="Pontos a melhorar" items={result.ai.weaknesses} tone="amber" />
                </div>

                {/* Padrão viral */}
                {result.ai.viralPattern && (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                    <h4 className="text-[11px] uppercase tracking-wider font-bold text-primary mb-1">Padrão dos virais</h4>
                    <p className="text-xs text-foreground">{result.ai.viralPattern}</p>
                  </div>
                )}

                {/* Bio otimizada */}
                {result.ai.bioRewrite && (
                  <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-[11px] uppercase tracking-wider font-bold text-cyan-400">Bio otimizada</h4>
                      <button
                        onClick={() => { navigator.clipboard.writeText(result.ai!.bioRewrite); toast.success("Copiada"); }}
                        className="text-cyan-400 hover:text-cyan-300"
                      ><Copy className="w-3 h-3" /></button>
                    </div>
                    <p className="text-xs text-foreground italic">"{result.ai.bioRewrite}"</p>
                  </div>
                )}

                {/* Próximas ações com botão agendar */}
                <div className="rounded-lg border border-primary/30 bg-card/50 p-3">
                  <h4 className="text-[11px] uppercase tracking-wider font-bold text-primary mb-2">Próximas ações (esta semana)</h4>
                  <ul className="space-y-1.5">
                    {result.ai.nextActions.map((a, i) => (
                      <li key={i} className="text-xs flex gap-2 items-start">
                        <span className="text-primary mt-0.5">▸</span>
                        <span className="flex-1 text-foreground">{a}</span>
                        <button
                          onClick={async () => {
                            const d = new Date(); d.setDate(d.getDate() + i + 1); d.setHours(9, 0, 0, 0);
                            await schedCal({ data: { title: a, scheduledAt: d.toISOString(), notes: `Da análise de @${result.handle}` } });
                            toast.success("Agendado no calendário");
                          }}
                          className="text-[10px] uppercase font-bold text-primary hover:underline shrink-0"
                        >agendar</button>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Ideias de conteúdo com ações */}
                <div className="rounded-lg border border-cyan-500/20 bg-card/50 p-3">
                  <h4 className="text-[11px] uppercase tracking-wider font-bold text-cyan-400 mb-2">Ideias de conteúdo</h4>
                  <ul className="space-y-2">
                    {result.ai.contentIdeas.map((it, i) => (
                      <li key={i} className="text-xs flex gap-2 items-start">
                        <span className="text-cyan-400 mt-0.5">▸</span>
                        <span className="flex-1 text-foreground">{it}</span>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            onClick={async () => { await saveHook({ data: { hook: it, niche, source: `analise:${result.handle}` } }); toast.success("Gancho salvo"); }}
                            className="text-[10px] uppercase font-bold text-cyan-400 hover:underline"
                          >gancho</button>
                          <button
                            onClick={() => sendIdeaToCarousel(it)}
                            className="text-[10px] uppercase font-bold text-primary hover:underline"
                          >carrossel</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Hashtags novas sugeridas */}
                {result.ai.newHashtags && result.ai.newHashtags.length > 0 && (
                  <div className="rounded-lg border border-border bg-card/50 p-3">
                    <h4 className="text-[11px] uppercase tracking-wider font-bold text-foreground mb-2">Hashtags novas pra testar</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {result.ai.newHashtags.map((h) => (
                        <button
                          key={h}
                          onClick={() => { navigator.clipboard.writeText(h); toast.success(`${h} copiada`); }}
                          className="inline-flex items-center rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-[11px] font-mono text-primary hover:bg-primary/10"
                        >{h}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Heatmap dia × hora */}
            {result.metrics.bestSlots.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-display text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" /> Quando postar (dia × hora)
                </h3>
                <Heatmap slots={result.metrics.bestSlots} />
              </div>
            )}

            {/* Best hours + hashtags */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-primary" />
                  <h3 className="font-display text-sm font-bold text-foreground">Melhores horários</h3>
                </div>
                {result.metrics.bestHours.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sem dados suficientes.</p>
                ) : (
                  <div className="space-y-2">
                    {result.metrics.bestHours.map((h) => (
                      <div key={h.hour} className="flex items-center justify-between text-xs">
                        <span className="font-mono font-semibold text-foreground tabular-nums">{String(h.hour).padStart(2,"0")}:00</span>
                        <div className="flex-1 mx-3 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${Math.min(100, (h.avgEngagement / (result.metrics.bestHours[0]?.avgEngagement || 1)) * 100)}%` }} />
                        </div>
                        <span className="text-muted-foreground tabular-nums">{formatNum(h.avgEngagement)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Hash className="w-4 h-4 text-primary" />
                  <h3 className="font-display text-sm font-bold text-foreground">Top hashtags</h3>
                </div>
                {result.metrics.topHashtags.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhuma hashtag detectada.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {result.metrics.topHashtags.map((h) => (
                      <span key={h.tag} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-mono text-foreground">
                        {h.tag} <span className="text-muted-foreground">×{h.count}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Top posts */}
            {result.topPosts.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-display text-sm font-bold text-foreground mb-3">Top {result.topPosts.length} posts por engajamento</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {result.topPosts.map((p) => (
                    <div key={p.url} className="group rounded-lg border border-border bg-card-elevated overflow-hidden hover:border-primary/40 transition-colors">
                      {p.thumbnail && <img src={p.thumbnail} alt="" className="w-full aspect-square object-cover" loading="lazy" />}
                      <div className="p-2 space-y-1.5">
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {formatNum(p.likes)}</span>
                          <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {formatNum(p.comments)}</span>
                          <a href={p.url} target="_blank" rel="noopener" className="ml-auto opacity-60 hover:opacity-100"><ExternalLink className="w-3 h-3" /></a>
                        </div>
                        {p.caption && <p className="text-[11px] text-foreground line-clamp-2">{p.caption}</p>}
                        <button
                          onClick={() => sendPostToTranscription(p.url)}
                          className="w-full text-[10px] uppercase font-bold text-primary hover:underline text-left"
                        >▸ transcrever</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function MetricBox({ icon: Icon, label, value, highlight }: { icon: any; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${highlight ? "text-primary" : "text-muted-foreground"}`} />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>
      </div>
      <div className={`text-2xl font-bold tabular-nums ${highlight ? "text-primary" : "text-foreground"}`}>{value}</div>
    </div>
  );
}

function InsightList({ title, items, tone }: { title: string; items: string[]; tone: "emerald" | "amber" | "primary" | "cyan" }) {
  const toneCls: Record<string, string> = {
    emerald: "text-emerald-400 border-emerald-500/20",
    amber: "text-amber-400 border-amber-500/20",
    primary: "text-primary border-primary/30",
    cyan: "text-cyan-400 border-cyan-500/20",
  };
  return (
    <div className={`rounded-lg border bg-card/50 p-3 ${toneCls[tone]}`}>
      <h4 className="text-[11px] uppercase tracking-wider font-bold mb-2">{title}</h4>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="text-xs text-foreground flex gap-2">
            <span className={tone === "primary" ? "text-primary" : tone === "emerald" ? "text-emerald-400" : tone === "amber" ? "text-amber-400" : "text-cyan-400"}>▸</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DeltaChip({ label, value, suffix = "" }: { label: string; value: number; suffix?: string }) {
  const up = value > 0;
  const flat = value === 0;
  const cls = flat ? "text-muted-foreground" : up ? "text-emerald-400" : "text-red-400";
  const arrow = flat ? "—" : up ? "▲" : "▼";
  return (
    <span className={`inline-flex items-center gap-1 ${cls}`}>
      {arrow} {Math.abs(value)}{suffix} <span className="text-muted-foreground">{label}</span>
    </span>
  );
}

function BenchRow({ label, mine, avg, suffix = "" }: { label: string; mine: number; avg: number; suffix?: string }) {
  const diff = avg > 0 ? ((mine - avg) / avg) * 100 : 0;
  const up = diff > 0;
  return (
    <div className="rounded-lg border border-border bg-card-elevated p-3">
      <div className="text-[10px] uppercase text-muted-foreground font-semibold">{label}</div>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-lg font-bold text-foreground tabular-nums">{mine}{suffix}</span>
        <span className="text-[10px] text-muted-foreground">vs {avg}{suffix}</span>
      </div>
      <div className={`text-[11px] font-semibold mt-0.5 ${up ? "text-emerald-400" : diff === 0 ? "text-muted-foreground" : "text-red-400"}`}>
        {up ? "▲" : diff === 0 ? "—" : "▼"} {Math.abs(Math.round(diff))}% vs nicho
      </div>
    </div>
  );
}

function Sparkline({ points, label }: { points: number[]; label: string }) {
  if (points.length === 0) return null;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  const w = 600; const h = 60;
  const step = w / Math.max(1, points.length - 1);
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"} ${i * step} ${h - ((p - min) / range) * (h - 4) - 2}`).join(" ");
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-16">
        <path d={d} fill="none" stroke="oklch(var(--primary))" strokeWidth="2" />
        {points.map((p, i) => (
          <circle key={i} cx={i * step} cy={h - ((p - min) / range) * (h - 4) - 2} r="2.5" fill="oklch(var(--primary))" />
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
        <span>{label}</span>
        <span>min {min} · max {max}</span>
      </div>
    </div>
  );
}

function Heatmap({ slots }: { slots: { day: number; hour: number; avgEngagement: number }[] }) {
  const max = Math.max(...slots.map((s) => s.avgEngagement), 1);
  const grid = new Map<string, number>();
  for (const s of slots) grid.set(`${s.day}-${s.hour}`, s.avgEngagement);
  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        <div className="grid" style={{ gridTemplateColumns: `auto repeat(24, minmax(14px, 1fr))` }}>
          <div />
          {Array.from({ length: 24 }).map((_, h) => (
            <div key={h} className="text-[9px] text-muted-foreground text-center">{h}</div>
          ))}
          {DAYS.map((d, di) => (
            <Fragment key={`row-${di}`}>
              <div className="text-[10px] text-muted-foreground pr-2 text-right self-center">{d}</div>
              {Array.from({ length: 24 }).map((_, h) => {
                const v = grid.get(`${di}-${h}`) ?? 0;
                const intensity = v / max;
                return (
                  <div
                    key={`${di}-${h}`}
                    title={v ? `${d} ${h}h · ${v} eng` : ""}
                    className="aspect-square rounded-sm border border-border/30"
                    style={{ background: v > 0 ? `oklch(var(--primary) / ${0.15 + intensity * 0.85})` : "transparent" }}
                  />
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
