import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Sparkles, TrendingUp, Heart, MessageCircle, ExternalLink } from "lucide-react";
import { getPublicAnalysisBySlug } from "@/lib/profile-analysis-history.functions";

const reportQuery = (slug: string) =>
  queryOptions({
    queryKey: ["public-analysis", slug],
    queryFn: () => getPublicAnalysisBySlug({ data: { slug } }),
  });

export const Route = createFileRoute("/r/$slug")({
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `Análise @${(loaderData as any).handle} — SHEY N8N` : "Relatório — SHEY N8N" },
      { name: "description", content: "Relatório público de análise de perfil Instagram gerado pela SHEY AI." },
    ],
  }),
  loader: async ({ context, params }) => {
    const r = await context.queryClient.ensureQueryData(reportQuery(params.slug));
    if (!r) throw notFound();
    return r;
  },
  errorComponent: ({ error, reset }) => (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div>
        <p className="text-sm text-muted-foreground">Erro: {error.message}</p>
        <button onClick={reset} className="mt-3 text-xs text-primary underline">tentar de novo</button>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div>
        <h1 className="font-display text-xl font-bold">Relatório não encontrado</h1>
        <p className="text-xs text-muted-foreground mt-1">Link inválido ou o dono desativou o compartilhamento.</p>
        <Link to="/" className="mt-3 inline-block text-xs text-primary underline">voltar</Link>
      </div>
    </div>
  ),
  component: PublicReportPage,
});

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
}

function PublicReportPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(reportQuery(slug));
  if (!data) return null;
  const snap = (data as any).snapshot ?? {};
  const ai = (data as any).ai_insights;
  const topPosts: any[] = snap?.topPosts ?? [];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="font-display text-base font-bold text-foreground">SHEY N8N</Link>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Relatório público · read-only</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="rounded-xl border border-border bg-card p-5">
          <h1 className="font-display text-2xl font-bold text-foreground">@{(data as any).handle}</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Gerado em {new Date((data as any).created_at).toLocaleString("pt-BR")}
          </p>
          <div className="grid grid-cols-4 gap-3 mt-4">
            <Stat label="Seguidores" value={formatNum((data as any).followers)} />
            <Stat label="Engajamento" value={`${(data as any).engagement_rate}%`} highlight />
            <Stat label="Likes médios" value={formatNum((data as any).avg_likes)} />
            <Stat label="Coments médios" value={formatNum((data as any).avg_comments)} />
          </div>
        </div>

        {ai && (
          <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="font-display text-base font-bold text-foreground">SHEY AI · Diagnóstico</h2>
            </div>
            <p className="text-sm text-foreground leading-relaxed">{ai.diagnosis}</p>
            {ai.viralPattern && <p className="text-xs text-muted-foreground italic">Padrão dos virais: {ai.viralPattern}</p>}
            <div className="grid md:grid-cols-2 gap-3">
              <List items={ai.strengths ?? []} title="Pontos fortes" />
              <List items={ai.weaknesses ?? []} title="A melhorar" />
            </div>
            <List items={ai.nextActions ?? []} title="Próximas ações" />
          </div>
        )}

        {topPosts.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-display text-sm font-bold text-foreground mb-3">Top {topPosts.length} posts</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {topPosts.map((p) => (
                <a key={p.url} href={p.url} target="_blank" rel="noopener" className="group rounded-lg border border-border bg-card-elevated overflow-hidden hover:border-primary/40">
                  {p.thumbnail && <img src={p.thumbnail} alt="" className="w-full aspect-square object-cover" loading="lazy" />}
                  <div className="p-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {formatNum(p.likes)}</span>
                    <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {formatNum(p.comments)}</span>
                    <ExternalLink className="w-3 h-3 ml-auto" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        <footer className="text-center text-[11px] text-muted-foreground py-6">
          Gerado por <Link to="/" className="text-primary underline">SHEY N8N</Link> · análise alimentada pela SHEY AI
        </footer>
      </main>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 text-center ${highlight ? "border-primary/30 bg-primary/5" : "border-border bg-card-elevated"}`}>
      <div className={`text-lg font-bold tabular-nums ${highlight ? "text-primary" : "text-foreground"}`}>{value}</div>
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
    </div>
  );
}

function List({ items, title }: { items: string[]; title: string }) {
  if (!items.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card/50 p-3">
      <h4 className="text-[11px] uppercase tracking-wider font-bold text-foreground mb-2">{title}</h4>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="text-xs text-foreground flex gap-2"><span className="text-primary">▸</span><span>{it}</span></li>
        ))}
      </ul>
    </div>
  );
}
