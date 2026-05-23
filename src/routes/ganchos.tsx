import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/route-guards";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Sparkles, Plus, Search, Star, Copy, Trash2, X, TrendingUp, Flame,
  Wand2, Shuffle, Gauge, Download, CheckSquare, Square, LayoutGrid, Calendar as CalendarIcon,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/Header";
import {
  listViralHooks, upsertViralHook, deleteViralHook, toggleFavoriteHook, incrementHookUses,
  generateHooksAI, generateHookVariations, scoreHookAI, bulkDeleteHooks,
} from "@/lib/hooks.functions";
import { logActivity } from "@/lib/activity-logger";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/ganchos")({
  beforeLoad: ({ location }) => requireAuth(location),
  head: () => ({
    meta: [
      { title: "Banco de Ganchos Virais — SHEY N8N" },
      { name: "description", content: "Biblioteca pesquisável de ganchos e headlines virais por nicho e formato." },
    ],
  }),
  component: HooksPage,
});

type Hook = {
  id: string; hook: string; niche: string; format: string; tags: string[];
  performance: string; language: string; source: string | null; notes: string | null;
  uses: number; is_favorite: boolean; created_at?: string;
};

const PERFORMANCE_STYLE: Record<string, string> = {
  alto: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  medio: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  baixo: "bg-zinc-500/15 text-zinc-300 border-zinc-500/40",
};
const FORMAT_EMOJI: Record<string, string> = { reel: "🎬", post: "📷", carrossel: "🖼️", story: "⚡", short: "▶️" };
const EMPTY_FORM: Partial<Hook> = {
  hook: "", niche: "geral", format: "reel", tags: [], performance: "medio",
  language: "pt-br", source: "", notes: "",
};

// Fórmulas/templates prontos
const FORMULAS = [
  { name: "Curiosidade", template: "Ninguém te conta isso sobre [TEMA]" },
  { name: "Lista", template: "5 erros que você faz em [TEMA] e nem percebe" },
  { name: "Dor", template: "Se você ainda [PROBLEMA], precisa ouvir isso" },
  { name: "Contraste", template: "Pare de [X]. Comece a [Y]" },
  { name: "Pergunta", template: "Por que ninguém fala sobre [TEMA]?" },
  { name: "Segredo", template: "O segredo de [PESSOA/NICHO] que ninguém entrega" },
  { name: "Número", template: "Em 30 dias eu [RESULTADO] fazendo só isso" },
  { name: "Polêmica", template: "Isso vai te incomodar, mas [VERDADE]" },
];

type SortKey = "recent" | "uses" | "favorite" | "performance";

function HooksPage() {
  const list = useServerFn(listViralHooks);
  const upsert = useServerFn(upsertViralHook);
  const del = useServerFn(deleteViralHook);
  const toggleFav = useServerFn(toggleFavoriteHook);
  const incUses = useServerFn(incrementHookUses);
  const genAI = useServerFn(generateHooksAI);
  const genVar = useServerFn(generateHookVariations);
  const scoreFn = useServerFn(scoreHookAI);
  const bulkDel = useServerFn(bulkDeleteHooks);

  const [hooks, setHooks] = useState<Hook[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [nicheFilter, setNicheFilter] = useState("all");
  const [formatFilter, setFormatFilter] = useState("all");
  const [perfFilter, setPerfFilter] = useState("all");
  const [onlyFav, setOnlyFav] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("recent");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Hook>>(EMPTY_FORM);
  const [tagsInput, setTagsInput] = useState("");
  const [scoring, setScoring] = useState(false);
  const [scoreResult, setScoreResult] = useState<{ score: number; strengths: string[]; improvements: string[] } | null>(null);
  const [variations, setVariations] = useState<string[]>([]);
  const [genVarLoading, setGenVarLoading] = useState(false);

  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiForm, setAiForm] = useState({ topic: "", niche: "geral", format: "reel", tone: "provocador", count: 10 });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResults, setAiResults] = useState<{ hook: string; score: number; tags: string[]; performance: string }[]>([]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<{ kind: "one" | "bulk"; hook?: Hook } | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 24;

  async function refresh() {
    setLoading(true);
    const r = await list();
    if (r.ok) setHooks(r.hooks as Hook[]);
    else toast.error(r.error || "Erro ao carregar");
    setLoading(false);
  }
  useEffect(() => { refresh(); }, []);
  useEffect(() => { setPage(1); setSelected(new Set()); }, [search, nicheFilter, formatFilter, perfFilter, onlyFav, sortBy]);

  const niches = useMemo(() => {
    const s = new Set<string>(); hooks.forEach((h) => s.add(h.niche)); return Array.from(s).sort();
  }, [hooks]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let arr = hooks.filter((h) => {
      if (onlyFav && !h.is_favorite) return false;
      if (nicheFilter !== "all" && h.niche !== nicheFilter) return false;
      if (formatFilter !== "all" && h.format !== formatFilter) return false;
      if (perfFilter !== "all" && h.performance !== perfFilter) return false;
      if (!q) return true;
      return h.hook.toLowerCase().includes(q) || h.niche.toLowerCase().includes(q) ||
        (h.tags || []).some((t) => t.toLowerCase().includes(q));
    });
    const perfRank: Record<string, number> = { alto: 3, medio: 2, baixo: 1 };
    arr = [...arr].sort((a, b) => {
      if (sortBy === "uses") return b.uses - a.uses;
      if (sortBy === "favorite") return Number(b.is_favorite) - Number(a.is_favorite);
      if (sortBy === "performance") return (perfRank[b.performance] || 0) - (perfRank[a.performance] || 0);
      return (b.created_at || "").localeCompare(a.created_at || "");
    });
    return arr;
  }, [hooks, search, nicheFilter, formatFilter, perfFilter, onlyFav, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function openCreate() {
    setEditing(EMPTY_FORM); setTagsInput(""); setScoreResult(null); setVariations([]); setModalOpen(true);
  }
  function openEdit(h: Hook) {
    setEditing(h); setTagsInput((h.tags || []).join(", ")); setScoreResult(null); setVariations([]); setModalOpen(true);
  }
  function applyFormula(t: string) {
    setEditing((e) => ({ ...e, hook: t }));
  }

  // Detecção de duplicado (similaridade simples)
  function isDuplicate(text: string) {
    const norm = text.trim().toLowerCase().replace(/[^a-z0-9 ]/g, "");
    return hooks.some((h) => h.id !== editing.id &&
      h.hook.trim().toLowerCase().replace(/[^a-z0-9 ]/g, "") === norm);
  }

  async function handleSave() {
    if (!editing.hook || editing.hook.trim().length < 3) { toast.error("Mínimo 3 caracteres"); return; }
    if (!editing.id && isDuplicate(editing.hook)) {
      if (!window.confirm("Já existe um gancho idêntico. Salvar mesmo assim?")) return;
    }
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    const r = await upsert({
      data: {
        id: editing.id, hook: editing.hook.trim(), niche: (editing.niche || "geral").trim(),
        format: (editing.format as any) || "reel", tags,
        performance: (editing.performance as any) || "medio",
        language: editing.language || "pt-br",
        source: editing.source || null, notes: editing.notes || null,
        is_favorite: editing.is_favorite,
      },
    });
    if (r.ok) {
      toast.success(editing.id ? "Atualizado" : "Criado");
      await logActivity({ event_type: "action", description: `Gancho ${editing.id ? "atualizado" : "criado"}: ${editing.hook.slice(0, 60)}`, status: "success" });
      setModalOpen(false); refresh();
    } else toast.error(r.error || "Erro");
  }

  async function handleScore() {
    if (!editing.hook || editing.hook.trim().length < 3) return;
    setScoring(true); setScoreResult(null);
    const r = await scoreFn({ data: { hook: editing.hook.trim() } });
    setScoring(false);
    if (r.ok) setScoreResult({ score: r.score, strengths: r.strengths, improvements: r.improvements });
    else toast.error(r.error || "Erro ao avaliar");
  }

  async function handleVariations() {
    if (!editing.hook || editing.hook.trim().length < 3) return;
    setGenVarLoading(true); setVariations([]);
    const r = await genVar({ data: { hook: editing.hook.trim(), count: 5 } });
    setGenVarLoading(false);
    if (r.ok) setVariations(r.variations);
    else toast.error(r.error || "Erro ao gerar variações");
  }

  async function handleAiGenerate(save: boolean) {
    if (!aiForm.topic.trim()) { toast.error("Informe um tema"); return; }
    setAiLoading(true);
    const r = await genAI({ data: { ...aiForm, save } as any });
    setAiLoading(false);
    if (r.ok) {
      setAiResults(r.hooks);
      if (save) { toast.success(`${r.hooks.length} ganchos salvos!`); refresh(); }
    } else toast.error(r.error || "Erro IA");
  }

  async function saveSingleAi(item: { hook: string; tags: string[]; performance: string }) {
    const r = await upsert({
      data: {
        hook: item.hook, niche: aiForm.niche, format: aiForm.format as any,
        tags: item.tags, performance: item.performance as any, language: "pt-br",
        source: null, notes: null,
      },
    });
    if (r.ok) { toast.success("Salvo"); refresh(); }
  }

  async function handleDelete(h: Hook) {
    const r = await del({ data: { id: h.id } });
    if (r.ok) { toast.success("Excluído"); refresh(); }
    else toast.error(r.error || "Erro");
  }
  async function handleBulkDelete() {
    if (selected.size === 0) return;
    const r = await bulkDel({ data: { ids: Array.from(selected) } });
    if (r.ok) { toast.success(`${r.count} excluídos`); setSelected(new Set()); refresh(); }
    else toast.error(r.error || "Erro");
  }

  async function handleFav(h: Hook) {
    setHooks((prev) => prev.map((x) => (x.id === h.id ? { ...x, is_favorite: !x.is_favorite } : x)));
    await toggleFav({ data: { id: h.id, is_favorite: !h.is_favorite } });
  }
  async function handleCopy(h: Hook) {
    await navigator.clipboard.writeText(h.hook);
    toast.success("Copiado!");
    const r = await incUses({ data: { id: h.id } });
    if (r.ok) setHooks((prev) => prev.map((x) => (x.id === h.id ? { ...x, uses: r.uses } : x)));
  }

  function toggleSelect(id: string) {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function selectAllPage() {
    setSelected((s) => { const n = new Set(s); pageItems.forEach((h) => n.add(h.id)); return n; });
  }

  function exportCSV() {
    const rows = [["hook", "niche", "format", "performance", "tags", "uses", "favorite", "language", "source", "notes"]];
    filtered.forEach((h) => rows.push([
      h.hook, h.niche, h.format, h.performance, (h.tags || []).join("|"),
      String(h.uses), String(h.is_favorite), h.language, h.source || "", h.notes || "",
    ]));
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    downloadFile(csv, "ganchos.csv", "text/csv");
  }
  function exportJSON() { downloadFile(JSON.stringify(filtered, null, 2), "ganchos.json", "application/json"); }
  function downloadFile(content: string, name: string, type: string) {
    const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
  }

  function sendToCarousel(h: Hook) {
    sessionStorage.setItem("carousel_topic", h.hook);
    window.location.href = "/carrossel";
  }
  function sendToCalendar(h: Hook) {
    sessionStorage.setItem("calendar_title", h.hook);
    window.location.href = "/calendario";
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <DashboardHeader />
      <main className="flex-1 p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" /> Banco de Ganchos Virais
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {hooks.length} ganchos · {filtered.length} filtrados
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => { setAiResults([]); setAiModalOpen(true); }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium hover:opacity-90">
              <Wand2 className="h-4 w-4" /> Gerar com IA
            </button>
            <button onClick={openCreate}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
              <Plus className="h-4 w-4" /> Novo
            </button>
          </div>
        </div>

        {/* Filtros responsivos */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar gancho, nicho, tag..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-card border border-border text-sm focus:outline-none focus:border-primary" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <select value={nicheFilter} onChange={(e) => setNicheFilter(e.target.value)} className="px-3 py-2 rounded-lg bg-card border border-border text-sm">
              <option value="all">Todos nichos</option>
              {niches.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <select value={formatFilter} onChange={(e) => setFormatFilter(e.target.value)} className="px-3 py-2 rounded-lg bg-card border border-border text-sm">
              <option value="all">Todos formatos</option>
              <option value="reel">Reel</option><option value="post">Post</option>
              <option value="carrossel">Carrossel</option><option value="story">Story</option><option value="short">Short</option>
            </select>
            <select value={perfFilter} onChange={(e) => setPerfFilter(e.target.value)} className="px-3 py-2 rounded-lg bg-card border border-border text-sm">
              <option value="all">Toda perf.</option>
              <option value="alto">Alto</option><option value="medio">Médio</option><option value="baixo">Baixo</option>
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} className="px-3 py-2 rounded-lg bg-card border border-border text-sm">
              <option value="recent">↓ Recentes</option>
              <option value="uses">↓ Mais usados</option>
              <option value="performance">↓ Performance</option>
              <option value="favorite">★ Favoritos</option>
            </select>
            <button onClick={() => setOnlyFav((v) => !v)}
              className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm transition ${
                onlyFav ? "bg-amber-500/20 border-amber-500/50 text-amber-300" : "bg-card border-border text-muted-foreground hover:text-foreground"
              }`}>
              <Star className={`h-4 w-4 ${onlyFav ? "fill-amber-300" : ""}`} /> Fav
            </button>
          </div>
        </div>

        {/* Barra de ações em massa */}
        {(selected.size > 0 || filtered.length > 0) && (
          <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
            <div className="flex items-center gap-2">
              {selected.size > 0 ? (
                <>
                  <span className="text-foreground font-medium">{selected.size} selecionados</span>
                  <button onClick={() => setConfirmDelete({ kind: "bulk" })} className="px-2 py-1 rounded bg-red-500/15 text-red-300 hover:bg-red-500/25">
                    Excluir
                  </button>
                  <button onClick={() => setSelected(new Set())} className="px-2 py-1 rounded bg-muted hover:bg-muted/70">Limpar</button>
                </>
              ) : (
                <button onClick={selectAllPage} className="px-2 py-1 rounded bg-muted hover:bg-muted/70 text-muted-foreground">
                  Selecionar página
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={exportCSV} className="flex items-center gap-1 px-2 py-1 rounded bg-muted hover:bg-muted/70 text-muted-foreground">
                <Download className="h-3 w-3" /> CSV
              </button>
              <button onClick={exportJSON} className="flex items-center gap-1 px-2 py-1 rounded bg-muted hover:bg-muted/70 text-muted-foreground">
                <Download className="h-3 w-3" /> JSON
              </button>
            </div>
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg">
            Nenhum gancho. Use <span className="text-primary">Gerar com IA</span> ou crie manualmente.
          </div>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {pageItems.map((h) => {
                const sel = selected.has(h.id);
                return (
                  <div key={h.id} className={`group rounded-xl border p-4 flex flex-col gap-3 transition ${
                    sel ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/50"
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <button onClick={() => toggleSelect(h.id)} className="text-muted-foreground hover:text-primary">
                        {sel ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
                      </button>
                      <span className="text-xl">{FORMAT_EMOJI[h.format] || "✨"}</span>
                      <button onClick={() => handleFav(h)} className="text-muted-foreground hover:text-amber-300" title="Favoritar">
                        <Star className={`h-4 w-4 ${h.is_favorite ? "fill-amber-300 text-amber-300" : ""}`} />
                      </button>
                    </div>
                    <p className="text-[15px] leading-snug font-medium flex-1">{h.hook}</p>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">{h.niche}</span>
                      <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border ${PERFORMANCE_STYLE[h.performance] || PERFORMANCE_STYLE.medio}`}>
                        {h.performance === "alto" && <Flame className="inline h-3 w-3 mr-1" />}{h.performance}
                      </span>
                      {(h.tags || []).slice(0, 3).map((t) => (
                        <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">#{t}</span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" /> {h.uses}
                      </span>
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => handleCopy(h)} className="p-1.5 rounded-md hover:bg-primary/15 hover:text-primary" title="Copiar"><Copy className="h-4 w-4" /></button>
                        <button onClick={() => sendToCarousel(h)} className="p-1.5 rounded-md hover:bg-purple-500/15 hover:text-purple-300" title="Usar no carrossel"><LayoutGrid className="h-4 w-4" /></button>
                        <button onClick={() => sendToCalendar(h)} className="p-1.5 rounded-md hover:bg-blue-500/15 hover:text-blue-300" title="Agendar"><CalendarIcon className="h-4 w-4" /></button>
                        <button onClick={() => openEdit(h)} className="px-2 py-1 text-xs rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">Editar</button>
                        <button onClick={() => setConfirmDelete({ kind: "one", hook: h })} className="p-1.5 rounded-md hover:bg-red-500/15 hover:text-red-400 text-muted-foreground" title="Excluir"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 rounded bg-card border border-border text-sm disabled:opacity-40">← Anterior</button>
                <span className="text-sm text-muted-foreground">Pág {page} de {totalPages}</span>
                <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 rounded bg-card border border-border text-sm disabled:opacity-40">Próxima →</button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Modal criar/editar */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-card border border-border rounded-xl w-full max-w-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-bold">{editing.id ? "Editar gancho" : "Novo gancho"}</h2>
              <button onClick={() => setModalOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>

            {/* Fórmulas */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Fórmulas prontas (clique pra usar):</p>
              <div className="flex flex-wrap gap-1.5">
                {FORMULAS.map((f) => (
                  <button key={f.name} onClick={() => applyFormula(f.template)}
                    className="text-[11px] px-2 py-1 rounded-full bg-muted hover:bg-primary/20 hover:text-primary transition">
                    {f.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-muted-foreground">Gancho *</label>
                  <div className="flex gap-1">
                    <button onClick={handleScore} disabled={scoring || !editing.hook}
                      className="text-[11px] flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-40">
                      <Gauge className="h-3 w-3" /> {scoring ? "Avaliando..." : "Score IA"}
                    </button>
                    <button onClick={handleVariations} disabled={genVarLoading || !editing.hook}
                      className="text-[11px] flex items-center gap-1 px-2 py-1 rounded bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 disabled:opacity-40">
                      <Shuffle className="h-3 w-3" /> {genVarLoading ? "Gerando..." : "Variações"}
                    </button>
                  </div>
                </div>
                <textarea value={editing.hook || ""} onChange={(e) => setEditing({ ...editing, hook: e.target.value })} rows={3}
                  placeholder="Ex: Você está fazendo isso errado e nem sabia"
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:border-primary resize-none" />
                {editing.hook && !editing.id && isDuplicate(editing.hook) && (
                  <p className="text-[11px] text-amber-400 mt-1">⚠ Gancho idêntico já existe na biblioteca</p>
                )}
              </div>

              {scoreResult && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-emerald-300">{scoreResult.score}/10</span>
                    <span className="text-xs text-muted-foreground">Score de viralidade</span>
                  </div>
                  {scoreResult.strengths.length > 0 && (
                    <div><p className="text-[11px] text-emerald-300 font-medium">✓ Pontos fortes:</p>
                      <ul className="text-xs text-muted-foreground list-disc list-inside">{scoreResult.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
                    </div>
                  )}
                  {scoreResult.improvements.length > 0 && (
                    <div><p className="text-[11px] text-amber-300 font-medium">→ Sugestões:</p>
                      <ul className="text-xs text-muted-foreground list-disc list-inside">{scoreResult.improvements.map((s, i) => <li key={i}>{s}</li>)}</ul>
                    </div>
                  )}
                </div>
              )}

              {variations.length > 0 && (
                <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-3 space-y-1.5">
                  <p className="text-[11px] text-purple-300 font-medium mb-1">Variações geradas:</p>
                  {variations.map((v, i) => (
                    <button key={i} onClick={() => setEditing((e) => ({ ...e, hook: v }))}
                      className="block w-full text-left text-xs px-2 py-1.5 rounded bg-background/50 hover:bg-primary/15 hover:text-primary transition">
                      {v}
                    </button>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Nicho</label>
                  <input value={editing.niche || ""} onChange={(e) => setEditing({ ...editing, niche: e.target.value })} placeholder="marketing, fitness..."
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Formato</label>
                  <select value={editing.format || "reel"} onChange={(e) => setEditing({ ...editing, format: e.target.value as any })}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-sm">
                    <option value="reel">Reel</option><option value="post">Post</option>
                    <option value="carrossel">Carrossel</option><option value="story">Story</option><option value="short">Short</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Performance</label>
                  <select value={editing.performance || "medio"} onChange={(e) => setEditing({ ...editing, performance: e.target.value as any })}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-sm">
                    <option value="alto">Alto</option><option value="medio">Médio</option><option value="baixo">Baixo</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Idioma</label>
                  <input value={editing.language || "pt-br"} onChange={(e) => setEditing({ ...editing, language: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:border-primary" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Tags (separadas por vírgula)</label>
                <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="curiosidade, lista, dor"
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Fonte (opcional)</label>
                <input value={editing.source || ""} onChange={(e) => setEditing({ ...editing, source: e.target.value })} placeholder="@perfil, link, criador..."
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Notas (opcional)</label>
                <textarea value={editing.notes || ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} rows={2}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:border-primary resize-none" />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              {editing.id && (
                <button onClick={() => { setModalOpen(false); setConfirmDelete({ kind: "one", hook: editing as Hook }); }}
                  className="px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10">Excluir</button>
              )}
              <div className="flex-1" />
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg text-sm bg-muted hover:bg-muted/70">Cancelar</button>
              <button onClick={handleSave} className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground font-medium hover:opacity-90">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Geração IA */}
      {aiModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setAiModalOpen(false)}>
          <div className="bg-card border border-border rounded-xl w-full max-w-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-bold flex items-center gap-2">
                <Wand2 className="h-5 w-5 text-purple-400" /> Gerar ganchos com IA
              </h2>
              <button onClick={() => setAiModalOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Tema / produto / dor *</label>
                <input value={aiForm.topic} onChange={(e) => setAiForm({ ...aiForm, topic: e.target.value })}
                  placeholder="Ex: emagrecimento sem dieta, vender no Instagram, agência de marketing..."
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:border-primary" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Nicho</label>
                  <input value={aiForm.niche} onChange={(e) => setAiForm({ ...aiForm, niche: e.target.value })}
                    className="w-full mt-1 px-2 py-2 rounded-lg bg-background border border-border text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Formato</label>
                  <select value={aiForm.format} onChange={(e) => setAiForm({ ...aiForm, format: e.target.value })}
                    className="w-full mt-1 px-2 py-2 rounded-lg bg-background border border-border text-sm">
                    <option value="reel">Reel</option><option value="post">Post</option>
                    <option value="carrossel">Carrossel</option><option value="story">Story</option><option value="short">Short</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Tom</label>
                  <select value={aiForm.tone} onChange={(e) => setAiForm({ ...aiForm, tone: e.target.value })}
                    className="w-full mt-1 px-2 py-2 rounded-lg bg-background border border-border text-sm">
                    <option value="provocador">Provocador</option>
                    <option value="didatico">Didático</option>
                    <option value="storytelling">História</option>
                    <option value="humor">Humor</option>
                    <option value="venda">Venda</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Qtd</label>
                  <input type="number" min={3} max={15} value={aiForm.count}
                    onChange={(e) => setAiForm({ ...aiForm, count: Math.max(3, Math.min(15, Number(e.target.value) || 10)) })}
                    className="w-full mt-1 px-2 py-2 rounded-lg bg-background border border-border text-sm" />
                </div>
              </div>
              <div className="flex gap-2">
                <button disabled={aiLoading} onClick={() => handleAiGenerate(false)}
                  className="flex-1 px-3 py-2 rounded-lg bg-muted hover:bg-muted/70 text-sm font-medium disabled:opacity-50">
                  {aiLoading ? "Gerando..." : "Pré-visualizar"}
                </button>
                <button disabled={aiLoading} onClick={() => handleAiGenerate(true)}
                  className="flex-1 px-3 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
                  {aiLoading ? "..." : `Gerar + salvar ${aiForm.count}`}
                </button>
              </div>
            </div>

            {aiResults.length > 0 && (
              <div className="space-y-2 max-h-80 overflow-y-auto pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">{aiResults.length} ganchos gerados:</p>
                {aiResults.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-background border border-border">
                    <span className="text-xs font-bold text-emerald-300 mt-0.5">{r.score}/10</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{r.hook}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {r.tags.map((t) => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">#{t}</span>)}
                      </div>
                    </div>
                    <button onClick={() => saveSingleAi(r)} className="text-[11px] px-2 py-1 rounded bg-primary/15 text-primary hover:bg-primary/25">Salvar</button>
                    <button onClick={() => { navigator.clipboard.writeText(r.hook); toast.success("Copiado"); }}
                      className="text-muted-foreground hover:text-primary p-1"><Copy className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmação exclusão */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDelete?.kind === "bulk" ? `Excluir ${selected.size} ganchos?` : "Excluir gancho?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.kind === "one" ? `"${confirmDelete.hook?.hook.slice(0, 80)}"` : "Esta ação não pode ser desfeita."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (confirmDelete?.kind === "bulk") await handleBulkDelete();
              else if (confirmDelete?.hook) await handleDelete(confirmDelete.hook);
              setConfirmDelete(null);
            }} className="bg-red-500 hover:bg-red-600">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
