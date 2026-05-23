import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { requireAuth } from "@/lib/route-guards";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  LayoutGrid, Sparkles, Wand2, Copy, Star, Trash2, ChevronLeft, ChevronRight,
  Loader2, Download, RefreshCw, X, Pencil, Plus, GripVertical, Image as ImageIcon,
  FileDown, Gauge, Shuffle, CalendarPlus, BookmarkPlus, Search, CopyPlus, Package,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/Header";
import {
  generateCarousel, listCarousels, getCarousel, deleteCarousel, toggleFavoriteCarousel,
  regenerateSlide, generateCoverVariations, scoreCover, updateCarousel, duplicateCarousel,
  type GeneratedCarousel, type CarouselSlide,
} from "@/lib/carousel.functions";
import { upsertViralHook } from "@/lib/hooks.functions";
import { logActivity } from "@/lib/activity-logger";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, useSortable, horizontalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";

export const Route = createFileRoute("/carrossel")({
  beforeLoad: ({ location }) => requireAuth(location),
  head: () => ({
    meta: [
      { title: "Gerador de Carrossel — SHEY N8N" },
      { name: "description", content: "Gere, edite e exporte carrosséis com IA: PNG, PDF, score de viralidade e variações." },
    ],
  }),
  component: CarouselPage,
});

type SavedRow = {
  id: string; topic: string; niche: string; tone: string; format: string;
  slide_count: number; is_favorite: boolean; created_at: string;
};

const THEMES: Record<string, { name: string; bg: string; fg: string; accent: string }> = {
  "dark-purple": { name: "Roxo Neon", bg: "linear-gradient(135deg,#0f0a1f 0%,#2a1056 100%)", fg: "#ffffff", accent: "#a78bfa" },
  "midnight":    { name: "Midnight",  bg: "linear-gradient(135deg,#020617 0%,#1e293b 100%)", fg: "#f1f5f9", accent: "#38bdf8" },
  "sunset":      { name: "Sunset",    bg: "linear-gradient(135deg,#7c2d12 0%,#e11d48 100%)", fg: "#fff7ed", accent: "#fde047" },
  "minimal":     { name: "Minimal",   bg: "#fafafa", fg: "#0a0a0a", accent: "#8b5cf6" },
  "emerald":     { name: "Emerald",   bg: "linear-gradient(135deg,#022c22 0%,#047857 100%)", fg: "#ecfdf5", accent: "#fcd34d" },
  "rose":        { name: "Rose Gold", bg: "linear-gradient(135deg,#4c0519 0%,#e11d48 60%,#fb7185 100%)", fg: "#fff1f2", accent: "#fda4af" },
  "ocean":       { name: "Ocean",     bg: "linear-gradient(135deg,#082f49 0%,#0891b2 100%)", fg: "#f0f9ff", accent: "#67e8f9" },
  "mono":        { name: "Mono Pop",  bg: "#0a0a0a", fg: "#fafafa", accent: "#facc15" },
};

const FORMAT_RATIO: Record<string, { name: string; ratio: string; w: number; h: number }> = {
  instagram: { name: "Instagram 1:1", ratio: "1/1", w: 1080, h: 1080 },
  linkedin:  { name: "LinkedIn 4:5",  ratio: "4/5", w: 1080, h: 1350 },
  tiktok:    { name: "TikTok 9:16",   ratio: "9/16", w: 1080, h: 1920 },
};

// ===== Slide visual =====
function SlideCard({
  slide, theme, total, format, brand,
}: { slide: CarouselSlide; theme: typeof THEMES[string]; total: number; format: string; brand?: string }) {
  const isCover = slide.role === "capa";
  return (
    <div
      className="w-full rounded-2xl p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden"
      style={{ background: theme.bg, color: theme.fg, aspectRatio: FORMAT_RATIO[format]?.ratio || "1/1" }}
    >
      <div className="flex items-center justify-between text-xs opacity-70">
        <span className="font-mono uppercase tracking-widest" style={{ color: theme.accent }}>{slide.role}</span>
        <span className="font-mono">{slide.index}/{total}</span>
      </div>
      <div className="flex-1 flex flex-col justify-center gap-4">
        <h3 className={`font-display font-black leading-tight ${isCover ? "text-4xl md:text-5xl" : "text-2xl md:text-3xl"}`}
            style={{ color: isCover ? theme.accent : theme.fg }}>
          {slide.title}
        </h3>
        {!isCover && <p className="text-base md:text-lg opacity-90 leading-relaxed whitespace-pre-wrap">{slide.body}</p>}
        {isCover && slide.body && <p className="text-sm opacity-70 italic">{slide.body}</p>}
      </div>
      <div className="flex items-center justify-between text-[10px] opacity-60 font-mono uppercase tracking-wider">
        <span>💡 {slide.visualHint}</span>
        <span style={{ color: theme.accent }}>{brand || "SHEY AI"}</span>
      </div>
    </div>
  );
}

// ===== Sortable thumbnail =====
function SortableThumb({ id, index, slide, theme, active, onClick }:
  { id: string; index: number; slide: CarouselSlide; theme: typeof THEMES[string]; active: boolean; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <button onClick={onClick} className={`aspect-square w-full rounded-md text-[10px] p-2 flex flex-col justify-between text-left transition-all ${active ? "ring-2 ring-primary" : "opacity-70 hover:opacity-100"}`}
              style={{ background: theme.bg, color: theme.fg }}>
        <span className="font-mono opacity-70">{index + 1}</span>
        <span className="font-bold line-clamp-2 leading-tight">{slide.title}</span>
      </button>
      <button {...attributes} {...listeners} className="absolute top-1 right-1 p-0.5 rounded bg-black/40 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing">
        <GripVertical className="h-3 w-3 text-white" />
      </button>
    </div>
  );
}

// ===== Main =====
function CarouselPage() {
  const navigate = useNavigate();
  const generate = useServerFn(generateCarousel);
  const list = useServerFn(listCarousels);
  const getOne = useServerFn(getCarousel);
  const del = useServerFn(deleteCarousel);
  const fav = useServerFn(toggleFavoriteCarousel);
  const regen = useServerFn(regenerateSlide);
  const variations = useServerFn(generateCoverVariations);
  const score = useServerFn(scoreCover);
  const update = useServerFn(updateCarousel);
  const dup = useServerFn(duplicateCarousel);
  const saveHook = useServerFn(upsertViralHook);

  const [topic, setTopic] = useState("");
  const [niche, setNiche] = useState("marketing");
  const [tone, setTone] = useState<"didatico" | "provocador" | "storytelling" | "tecnico" | "humor" | "venda">("didatico");
  const [audience, setAudience] = useState("");
  const [slideCount, setSlideCount] = useState(7);
  const [format, setFormat] = useState<"instagram" | "linkedin" | "tiktok">("instagram");
  const [theme, setTheme] = useState("dark-purple");
  const [hookHint, setHookHint] = useState("");
  const [brand, setBrand] = useState("");

  const [loading, setLoading] = useState(false);
  const [carouselId, setCarouselId] = useState<string | undefined>();
  const [carousel, setCarousel] = useState<GeneratedCarousel | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [savedList, setSavedList] = useState<SavedRow[]>([]);
  const [listLoading, setListLoading] = useState(true);

  const [editingSlide, setEditingSlide] = useState<CarouselSlide | null>(null);
  const [regenInstruction, setRegenInstruction] = useState("");
  const [regenLoading, setRegenLoading] = useState(false);

  const [variationsOpen, setVariationsOpen] = useState(false);
  const [variationsList, setVariationsList] = useState<Array<{ title: string; body: string; angle: string }>>([]);
  const [variationsLoading, setVariationsLoading] = useState(false);

  const [scoreOpen, setScoreOpen] = useState(false);
  const [scoreData, setScoreData] = useState<any>(null);
  const [scoreLoading, setScoreLoading] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterFmt, setFilterFmt] = useState<string>("all");
  const [filterFav, setFilterFav] = useState(false);

  const themeObj = THEMES[theme] ?? THEMES["dark-purple"];
  const slideRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const loadList = async () => {
    setListLoading(true);
    const r = await list();
    if (r.ok) setSavedList(r.items as SavedRow[]);
    setListLoading(false);
  };

  // Hydrate from sessionStorage (gancho do banco / transcrição)
  useEffect(() => {
    try {
      const seed = sessionStorage.getItem("carousel_seed");
      if (seed) {
        const p = JSON.parse(seed);
        if (p.topic) setTopic(p.topic);
        if (p.hook) setHookHint(p.hook);
        if (p.niche) setNiche(p.niche);
        if (p.tone) setTone(p.tone);
        sessionStorage.removeItem("carousel_seed");
        toast.success("Conteúdo recebido — pronto pra gerar!");
      }
    } catch {}
    loadList();
  }, []);

  const handleGenerate = async () => {
    if (topic.trim().length < 5) { toast.error("Descreva melhor o tópico (mín. 5)"); return; }
    setLoading(true);
    const t = toast.loading("Gerando carrossel...");
    try {
      const r = await generate({ data: { topic, niche, tone, audience, slideCount, format, theme, hookHint: hookHint || null } });
      toast.dismiss(t);
      if (!r.ok) { toast.error(r.error || "Falha"); return; }
      setCarousel(r.carousel);
      setCarouselId(r.savedId);
      setCurrentSlide(0);
      toast.success("Carrossel pronto! 🎯");
      logActivity({ event_type: "action", description: `Carrossel: ${topic.slice(0, 60)}`, status: "success" });
      loadList();
    } catch (e: any) { toast.dismiss(t); toast.error(e?.message || "Erro"); }
    finally { setLoading(false); }
  };

  const handleLoad = async (id: string) => {
    const r = await getOne({ data: { id } });
    if (!r.ok) { toast.error(r.error); return; }
    const row: any = r.carousel;
    setCarouselId(id);
    setCarousel({
      topic: row.topic, niche: row.niche, tone: row.tone, audience: row.audience || "",
      hook: row.hook, slides: row.slides, caption: row.caption, hashtags: row.hashtags,
      cta: row.cta, format: row.format, theme: row.theme, slideCount: row.slide_count,
    });
    setTheme(row.theme);
    setFormat(row.format);
    setCurrentSlide(0);
    toast.success("Carregado");
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const r = await del({ data: { id: deleteId } });
    setDeleteId(null);
    if (r.ok) { toast.success("Excluído"); loadList(); }
  };

  const handleFav = async (id: string, current: boolean) => {
    await fav({ data: { id, is_favorite: !current } });
    loadList();
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const copyAll = () => {
    if (!carousel) return;
    const txt = `${carousel.caption}\n\n${carousel.cta}\n\n${carousel.hashtags.map(h => `#${h}`).join(" ")}`;
    navigator.clipboard.writeText(txt);
    toast.success("Legenda + CTA + hashtags copiados!");
  };

  // ===== Edição inline =====
  const persistSlides = async (slides: CarouselSlide[]) => {
    if (!carouselId) return;
    await update({ data: { id: carouselId, slides } });
  };

  const handleSaveEdit = async () => {
    if (!editingSlide || !carousel) return;
    const updated = carousel.slides.map(s => s.index === editingSlide.index ? editingSlide : s);
    setCarousel({ ...carousel, slides: updated });
    setEditingSlide(null);
    persistSlides(updated);
    toast.success("Slide atualizado");
  };

  const handleRegen = async () => {
    if (!editingSlide || !carousel) return;
    setRegenLoading(true);
    const r = await regen({ data: {
      topic: carousel.topic, niche: carousel.niche, tone: carousel.tone,
      role: editingSlide.role, currentTitle: editingSlide.title, instruction: regenInstruction,
    }});
    setRegenLoading(false);
    if (!r.ok) { toast.error(r.error); return; }
    setEditingSlide({ ...editingSlide, ...r.slide });
    toast.success("Regerado");
  };

  const handleAddSlide = () => {
    if (!carousel) return;
    const newSlide: CarouselSlide = {
      index: carousel.slides.length + 1, role: "desenvolvimento",
      title: "Novo slide", body: "Edite este slide", visualHint: "—",
    };
    const slides = [...carousel.slides, newSlide];
    setCarousel({ ...carousel, slides });
    persistSlides(slides);
  };

  const handleRemoveSlide = (idx: number) => {
    if (!carousel || carousel.slides.length <= 3) { toast.error("Mín. 3 slides"); return; }
    const slides = carousel.slides.filter((_, i) => i !== idx).map((s, i) => ({ ...s, index: i + 1 }));
    setCarousel({ ...carousel, slides });
    setCurrentSlide(Math.max(0, currentSlide - (idx <= currentSlide ? 1 : 0)));
    persistSlides(slides);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || !carousel || active.id === over.id) return;
    const oldIdx = carousel.slides.findIndex(s => `s-${s.index}` === active.id);
    const newIdx = carousel.slides.findIndex(s => `s-${s.index}` === over.id);
    const reordered = arrayMove(carousel.slides, oldIdx, newIdx).map((s, i) => ({ ...s, index: i + 1 }));
    setCarousel({ ...carousel, slides: reordered });
    persistSlides(reordered);
  };

  // ===== Variações =====
  const handleVariations = async () => {
    if (!carousel) return;
    setVariationsOpen(true); setVariationsLoading(true);
    const r = await variations({ data: { topic: carousel.topic, niche: carousel.niche, tone: carousel.tone } });
    setVariationsLoading(false);
    if (!r.ok) { toast.error(r.error); return; }
    setVariationsList(r.variations);
  };

  const applyVariation = (v: { title: string; body: string }) => {
    if (!carousel) return;
    const slides = carousel.slides.map(s => s.index === 1 ? { ...s, title: v.title, body: v.body } : s);
    setCarousel({ ...carousel, slides });
    persistSlides(slides);
    setVariationsOpen(false);
    toast.success("Capa atualizada");
  };

  // ===== Score =====
  const handleScore = async () => {
    if (!carousel) return;
    const cover = carousel.slides[0];
    setScoreOpen(true); setScoreLoading(true);
    const r = await score({ data: { title: cover.title, body: cover.body } });
    setScoreLoading(false);
    if (!r.ok) { toast.error(r.error); return; }
    setScoreData(r);
  };

  // ===== Export PNG (slide atual) =====
  const exportSlidePng = async () => {
    if (!slideRef.current || !carousel) return;
    const t = toast.loading("Exportando PNG...");
    try {
      const dataUrl = await toPng(slideRef.current, { pixelRatio: 2, cacheBust: true });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `slide-${currentSlide + 1}.png`;
      a.click();
      toast.dismiss(t); toast.success("PNG salvo");
    } catch (e: any) { toast.dismiss(t); toast.error(e?.message || "Erro"); }
  };

  // ===== Export PDF (todos) =====
  const exportPdf = async () => {
    if (!carousel) return;
    const t = toast.loading("Gerando PDF...");
    try {
      const ratio = FORMAT_RATIO[carousel.format];
      const pdf = new jsPDF({ unit: "px", format: [ratio.w, ratio.h], orientation: ratio.w > ratio.h ? "l" : "p" });
      const container = document.createElement("div");
      container.style.position = "fixed"; container.style.left = "-99999px"; container.style.top = "0";
      container.style.width = `${ratio.w}px`;
      document.body.appendChild(container);

      for (let i = 0; i < carousel.slides.length; i++) {
        const slide = carousel.slides[i];
        const el = document.createElement("div");
        el.style.width = `${ratio.w}px`;
        el.style.height = `${ratio.h}px`;
        el.style.padding = "60px";
        el.style.display = "flex";
        el.style.flexDirection = "column";
        el.style.justifyContent = "space-between";
        el.style.background = themeObj.bg;
        el.style.color = themeObj.fg;
        el.style.fontFamily = "system-ui, -apple-system, sans-serif";
        el.innerHTML = `
          <div style="display:flex;justify-content:space-between;font-family:monospace;font-size:18px;opacity:.7">
            <span style="color:${themeObj.accent};text-transform:uppercase;letter-spacing:3px">${slide.role}</span>
            <span>${slide.index}/${carousel.slides.length}</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:24px;flex:1;justify-content:center">
            <h2 style="font-size:${slide.role === "capa" ? "92px" : "60px"};font-weight:900;line-height:1.05;letter-spacing:-.02em;color:${slide.role === "capa" ? themeObj.accent : themeObj.fg}">${escapeHtml(slide.title)}</h2>
            ${slide.role !== "capa" ? `<p style="font-size:36px;line-height:1.4;opacity:.9">${escapeHtml(slide.body)}</p>` : ""}
          </div>
          <div style="display:flex;justify-content:space-between;font-family:monospace;font-size:16px;opacity:.6;text-transform:uppercase;letter-spacing:2px">
            <span>💡 ${escapeHtml(slide.visualHint)}</span>
            <span style="color:${themeObj.accent}">${escapeHtml(brand || "SHEY AI")}</span>
          </div>`;
        container.appendChild(el);
        const dataUrl = await toPng(el, { pixelRatio: 1 });
        if (i > 0) pdf.addPage([ratio.w, ratio.h], ratio.w > ratio.h ? "l" : "p");
        pdf.addImage(dataUrl, "PNG", 0, 0, ratio.w, ratio.h);
        container.removeChild(el);
      }
      document.body.removeChild(container);
      pdf.save(`carrossel-${carousel.topic.slice(0, 30).replace(/\W+/g, "-")}.pdf`);
      toast.dismiss(t); toast.success("PDF pronto");
    } catch (e: any) { toast.dismiss(t); toast.error(e?.message || "Erro PDF"); }
  };

  // ===== Send to calendar =====
  const sendToCalendar = () => {
    if (!carousel) return;
    sessionStorage.setItem("calendar_seed", JSON.stringify({
      title: carousel.topic, hook: carousel.hook, content_type: "carrossel",
      platform: carousel.format, notes: carousel.caption, source: "carrossel",
    }));
    navigate({ to: "/calendario" });
  };

  // ===== Salvar capa como gancho =====
  const saveCoverAsHook = async () => {
    if (!carousel) return;
    const r = await saveHook({ data: {
      hook: carousel.slides[0].title, niche: carousel.niche, format: "carrossel",
      tags: [carousel.tone], performance: "medio", language: "pt-br",
      source: "carrossel", notes: carousel.topic,
    }});
    if (r.ok) toast.success("Capa salva em Ganchos!"); else toast.error(r.error || "Erro");
  };

  const filtered = useMemo(() => savedList.filter(r => {
    if (filterFav && !r.is_favorite) return false;
    if (filterFmt !== "all" && r.format !== filterFmt) return false;
    if (search && !r.topic.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [savedList, search, filterFmt, filterFav]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <DashboardHeader />

      {/* Form */}
      <div className="rounded-xl border border-border bg-card/50 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Wand2 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Configurar carrossel</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="text-xs uppercase tracking-wide text-muted-foreground mb-1 block">Tópico *</label>
            <textarea value={topic} onChange={(e) => setTopic(e.target.value)}
              placeholder="Ex: 5 erros que travam o crescimento no Instagram"
              className="w-full rounded-md bg-background border border-border p-3 text-sm min-h-[70px]" />
          </div>
          <div><label className="text-xs uppercase text-muted-foreground mb-1 block">Nicho</label>
            <input value={niche} onChange={(e) => setNiche(e.target.value)} className="w-full rounded-md bg-background border border-border p-2.5 text-sm" /></div>
          <div><label className="text-xs uppercase text-muted-foreground mb-1 block">Público</label>
            <input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="ex: criadores iniciantes" className="w-full rounded-md bg-background border border-border p-2.5 text-sm" /></div>
          <div><label className="text-xs uppercase text-muted-foreground mb-1 block">Tom</label>
            <select value={tone} onChange={(e) => setTone(e.target.value as any)} className="w-full rounded-md bg-background border border-border p-2.5 text-sm">
              <option value="didatico">Didático</option><option value="provocador">Provocador</option>
              <option value="storytelling">Storytelling</option><option value="tecnico">Técnico</option>
              <option value="humor">Humor</option><option value="venda">Venda</option>
            </select></div>
          <div><label className="text-xs uppercase text-muted-foreground mb-1 block">Formato</label>
            <select value={format} onChange={(e) => setFormat(e.target.value as any)} className="w-full rounded-md bg-background border border-border p-2.5 text-sm">
              {Object.entries(FORMAT_RATIO).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
            </select></div>
          <div><label className="text-xs uppercase text-muted-foreground mb-1 block">Slides: {slideCount}</label>
            <input type="range" min={5} max={12} value={slideCount} onChange={(e) => setSlideCount(parseInt(e.target.value))} className="w-full accent-primary" /></div>
          <div><label className="text-xs uppercase text-muted-foreground mb-1 block">Tema</label>
            <select value={theme} onChange={(e) => setTheme(e.target.value)} className="w-full rounded-md bg-background border border-border p-2.5 text-sm">
              {Object.entries(THEMES).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
            </select></div>
          <div className="md:col-span-2"><label className="text-xs uppercase text-muted-foreground mb-1 block">Gancho (opcional)</label>
            <input value={hookHint} onChange={(e) => setHookHint(e.target.value)} placeholder="Cole do banco de Ganchos" className="w-full rounded-md bg-background border border-border p-2.5 text-sm" /></div>
          <div className="md:col-span-2"><label className="text-xs uppercase text-muted-foreground mb-1 block">Sua marca (assinatura)</label>
            <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="@suamarca" className="w-full rounded-md bg-background border border-border p-2.5 text-sm" /></div>
        </div>

        <button onClick={handleGenerate} disabled={loading}
          className="mt-4 w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground px-5 py-2.5 font-semibold hover:opacity-90 disabled:opacity-50">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? "Gerando..." : "Gerar com IA"}
        </button>
      </div>

      {/* Skeleton */}
      {loading && !carousel && (
        <div className="rounded-xl border border-border bg-card/50 p-5">
          <div className="max-w-md mx-auto space-y-3">
            <div className="aspect-square w-full rounded-2xl bg-muted animate-pulse" />
            <div className="grid grid-cols-6 gap-2">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="aspect-square rounded-md bg-muted animate-pulse" />)}
            </div>
          </div>
        </div>
      )}

      {/* Preview */}
      {carousel && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          <div className="rounded-xl border border-border bg-card/50 p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <h3 className="font-bold text-lg">Preview</h3>
                <p className="text-xs text-muted-foreground">{carousel.slides.length} slides · {FORMAT_RATIO[carousel.format]?.name} · {THEMES[carousel.theme]?.name}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <ToolbarBtn onClick={handleVariations} icon={Shuffle} label="Variações" />
                <ToolbarBtn onClick={handleScore} icon={Gauge} label="Score" />
                <ToolbarBtn onClick={exportSlidePng} icon={ImageIcon} label="PNG" />
                <ToolbarBtn onClick={exportPdf} icon={FileDown} label="PDF" />
                <ToolbarBtn onClick={copyAll} icon={Package} label="Copiar tudo" />
                <ToolbarBtn onClick={sendToCalendar} icon={CalendarPlus} label="Agendar" />
                <ToolbarBtn onClick={saveCoverAsHook} icon={BookmarkPlus} label="→ Ganchos" />
                <ToolbarBtn onClick={handleGenerate} icon={RefreshCw} label="Regerar" />
              </div>
            </div>

            <div className="max-w-md mx-auto">
              <div ref={slideRef}>
                <SlideCard slide={carousel.slides[currentSlide]} theme={themeObj} total={carousel.slides.length} format={carousel.format} brand={brand} />
              </div>

              <div className="flex items-center justify-between mt-4 gap-2">
                <button onClick={() => setCurrentSlide(i => Math.max(0, i - 1))} disabled={currentSlide === 0} className="p-2 rounded-md border border-border hover:bg-accent disabled:opacity-30"><ChevronLeft className="h-5 w-5" /></button>
                <div className="flex items-center gap-1.5 flex-1 justify-center flex-wrap">
                  {carousel.slides.map((_, i) => (
                    <button key={i} onClick={() => setCurrentSlide(i)} className={`h-2 rounded-full transition-all ${i === currentSlide ? "w-6 bg-primary" : "w-2 bg-muted"}`} />
                  ))}
                </div>
                <button onClick={() => setCurrentSlide(i => Math.min(carousel.slides.length - 1, i + 1))} disabled={currentSlide === carousel.slides.length - 1} className="p-2 rounded-md border border-border hover:bg-accent disabled:opacity-30"><ChevronRight className="h-5 w-5" /></button>
              </div>

              <div className="flex items-center justify-center gap-2 mt-3">
                <button onClick={() => setEditingSlide(carousel.slides[currentSlide])} className="inline-flex items-center gap-1.5 text-xs rounded-md border border-border px-3 py-1.5 hover:bg-accent"><Pencil className="h-3.5 w-3.5" /> Editar slide</button>
                <button onClick={() => handleRemoveSlide(currentSlide)} className="inline-flex items-center gap-1.5 text-xs rounded-md border border-border px-3 py-1.5 hover:bg-accent text-rose-400"><Trash2 className="h-3.5 w-3.5" /> Remover</button>
                <button onClick={handleAddSlide} className="inline-flex items-center gap-1.5 text-xs rounded-md border border-border px-3 py-1.5 hover:bg-accent"><Plus className="h-3.5 w-3.5" /> Adicionar</button>
              </div>
            </div>

            {/* Thumbs sortable */}
            <div className="mt-5">
              <p className="text-xs text-muted-foreground mb-2">Arraste para reordenar</p>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={carousel.slides.map(s => `s-${s.index}`)} strategy={horizontalListSortingStrategy}>
                  <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                    {carousel.slides.map((s, i) => (
                      <SortableThumb key={`s-${s.index}`} id={`s-${s.index}`} index={i} slide={s} theme={themeObj}
                        active={i === currentSlide} onClick={() => setCurrentSlide(i)} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <SidePanel title="Gancho" value={carousel.hook} onCopy={() => copy(carousel.hook, "Gancho")} />
            <SidePanel title="Legenda" value={carousel.caption} onCopy={() => copy(carousel.caption, "Legenda")} multiline />
            <SidePanel title="CTA" value={carousel.cta} onCopy={() => copy(carousel.cta, "CTA")} />
            <div className="rounded-xl border border-border bg-card/50 p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold">Hashtags</h4>
                <button onClick={() => copy(carousel.hashtags.map(h => `#${h}`).join(" "), "Hashtags")} className="text-xs text-muted-foreground hover:text-foreground"><Copy className="h-3.5 w-3.5" /></button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {carousel.hashtags.map(h => (
                  <span key={h} className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30">#{h}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Histórico */}
      <div className="rounded-xl border border-border bg-card/50 p-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="font-bold text-lg flex items-center gap-2"><LayoutGrid className="h-5 w-5 text-primary" /> Salvos ({filtered.length})</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="pl-7 pr-2 py-1.5 text-xs rounded-md bg-background border border-border w-40" />
            </div>
            <select value={filterFmt} onChange={(e) => setFilterFmt(e.target.value)} className="text-xs rounded-md bg-background border border-border px-2 py-1.5">
              <option value="all">Todos formatos</option>
              {Object.entries(FORMAT_RATIO).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
            </select>
            <button onClick={() => setFilterFav(!filterFav)} className={`text-xs rounded-md px-2 py-1.5 border ${filterFav ? "border-amber-400 text-amber-400" : "border-border"}`}>
              <Star className={`h-3.5 w-3.5 inline ${filterFav ? "fill-amber-400" : ""}`} />
            </button>
          </div>
        </div>

        {listLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum carrossel.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(r => (
              <div key={r.id} className="rounded-lg border border-border bg-background/50 p-3 hover:border-primary/40">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <button onClick={() => handleLoad(r.id)} className="text-sm font-semibold line-clamp-2 text-left hover:text-primary flex-1">{r.topic}</button>
                  <button onClick={() => handleFav(r.id, r.is_favorite)}><Star className={`h-4 w-4 ${r.is_favorite ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} /></button>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                  <span className="px-1.5 py-0.5 rounded bg-muted">{r.niche}</span>
                  <span className="px-1.5 py-0.5 rounded bg-muted">{r.format}</span>
                  <span className="px-1.5 py-0.5 rounded bg-muted">{r.slide_count}s</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{new Date(r.created_at).toLocaleDateString("pt-BR")}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={async () => { const x = await dup({ data: { id: r.id } }); if (x.ok) { toast.success("Duplicado"); loadList(); } }} title="Duplicar"><CopyPlus className="h-3.5 w-3.5 hover:text-primary" /></button>
                    <button onClick={() => setDeleteId(r.id)} className="text-rose-400 hover:text-rose-300"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit slide dialog */}
      <Dialog open={!!editingSlide} onOpenChange={(o) => !o && setEditingSlide(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Editar slide {editingSlide?.index}</DialogTitle></DialogHeader>
          {editingSlide && (
            <div className="space-y-3">
              <div><label className="text-xs text-muted-foreground">Título</label>
                <input value={editingSlide.title} onChange={(e) => setEditingSlide({ ...editingSlide, title: e.target.value })} className="w-full rounded-md bg-background border border-border p-2 text-sm" /></div>
              <div><label className="text-xs text-muted-foreground">Body</label>
                <textarea value={editingSlide.body} onChange={(e) => setEditingSlide({ ...editingSlide, body: e.target.value })} rows={4} className="w-full rounded-md bg-background border border-border p-2 text-sm" /></div>
              <div><label className="text-xs text-muted-foreground">Visual hint</label>
                <input value={editingSlide.visualHint} onChange={(e) => setEditingSlide({ ...editingSlide, visualHint: e.target.value })} className="w-full rounded-md bg-background border border-border p-2 text-sm" /></div>
              <div className="border-t border-border pt-3">
                <label className="text-xs text-muted-foreground">Instrução pra IA regerar (opcional)</label>
                <input value={regenInstruction} onChange={(e) => setRegenInstruction(e.target.value)} placeholder="ex: deixar mais provocador" className="w-full rounded-md bg-background border border-border p-2 text-sm" />
                <button onClick={handleRegen} disabled={regenLoading} className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent disabled:opacity-50">
                  {regenLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Regerar com IA
                </button>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setEditingSlide(null)} className="text-sm px-3 py-2 rounded-md hover:bg-accent">Cancelar</button>
                <button onClick={handleSaveEdit} className="text-sm px-3 py-2 rounded-md bg-primary text-primary-foreground">Salvar</button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Variações */}
      <Dialog open={variationsOpen} onOpenChange={setVariationsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Variações de capa</DialogTitle></DialogHeader>
          {variationsLoading ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {variationsList.map((v, i) => (
                <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                  <span className="text-[10px] uppercase tracking-wider text-primary">{v.angle}</span>
                  <h4 className="font-bold">{v.title}</h4>
                  <p className="text-xs text-muted-foreground">{v.body}</p>
                  <button onClick={() => applyVariation(v)} className="w-full text-xs rounded-md bg-primary text-primary-foreground px-2 py-1.5">Usar essa</button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Score */}
      <Dialog open={scoreOpen} onOpenChange={setScoreOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Score da capa</DialogTitle></DialogHeader>
          {scoreLoading ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : scoreData && (
            <div className="space-y-3">
              <div className="text-center">
                <div className="text-5xl font-black text-primary">{scoreData.score}/10</div>
              </div>
              <div>
                <h5 className="text-xs uppercase text-emerald-400 mb-1">Pontos fortes</h5>
                <ul className="text-sm space-y-1">{scoreData.strengths?.map((s: string, i: number) => <li key={i}>✓ {s}</li>)}</ul>
              </div>
              <div>
                <h5 className="text-xs uppercase text-amber-400 mb-1">Melhorias</h5>
                <ul className="text-sm space-y-1">{scoreData.improvements?.map((s: string, i: number) => <li key={i}>→ {s}</li>)}</ul>
              </div>
              <div className="rounded-md bg-primary/10 border border-primary/30 p-3">
                <p className="text-xs text-muted-foreground mb-1">Versão melhorada:</p>
                <p className="font-bold">{scoreData.improvedTitle}</p>
                <button onClick={() => {
                  if (!carousel) return;
                  const slides = carousel.slides.map(s => s.index === 1 ? { ...s, title: scoreData.improvedTitle } : s);
                  setCarousel({ ...carousel, slides }); persistSlides(slides);
                  setScoreOpen(false); toast.success("Aplicado");
                }} className="mt-2 text-xs rounded-md bg-primary text-primary-foreground px-3 py-1.5">Aplicar capa melhorada</button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir carrossel?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-rose-500 hover:bg-rose-600">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ToolbarBtn({ onClick, icon: Icon, label }: { onClick: () => void; icon: any; label: string }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 text-xs rounded-md border border-border px-2.5 py-1.5 hover:bg-accent">
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

function SidePanel({ title, value, onCopy, multiline }: { title: string; value: string; onCopy: () => void; multiline?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card/50 p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-bold">{title}</h4>
        <button onClick={onCopy} className="text-xs text-muted-foreground hover:text-foreground"><Copy className="h-3.5 w-3.5" /></button>
      </div>
      {multiline
        ? <p className="text-xs whitespace-pre-wrap text-muted-foreground leading-relaxed max-h-48 overflow-auto">{value}</p>
        : <p className="text-sm">{value}</p>}
    </div>
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
