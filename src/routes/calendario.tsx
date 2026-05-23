import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/route-guards";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  CalendarDays, Plus, ChevronLeft, ChevronRight, Trash2, X, Search,
  Sparkles, Download, Wand2, Bell, Repeat, ListChecks, Link as LinkIcon,
  CheckCircle2, AlertTriangle, TrendingUp, Filter,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/Header";
import {
  listCalendarEntries, upsertCalendarEntry, deleteCalendarEntry,
  rescheduleCalendarEntry, suggestBestTime, planWeekAI,
} from "@/lib/calendar.functions";
import { logActivity } from "@/lib/activity-logger";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/calendario")({
  beforeLoad: ({ location }) => requireAuth(location),
  head: () => ({
    meta: [
      { title: "Calendário Editorial — SHEY N8N" },
      { name: "description", content: "Planeje, agende e acompanhe seu conteúdo em um calendário visual com IA." },
    ],
  }),
  component: CalendarPage,
});

type ChecklistItem = { text: string; done: boolean };
type Attachment = { label: string; url: string };
type Entry = {
  id: string;
  title: string;
  content_type: string;
  platform: string;
  scheduled_at: string;
  status: string;
  notes: string | null;
  color: string | null;
  recurrence: string;
  recurrence_until: string | null;
  checklist: ChecklistItem[];
  attachments: Attachment[];
  reminder_minutes: number | null;
  hook: string | null;
  source: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  rascunho: "bg-zinc-500/20 text-zinc-300 border-zinc-500/40",
  agendado: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  publicado: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  atrasado: "bg-red-500/20 text-red-300 border-red-500/40",
};
const TYPE_EMOJI: Record<string, string> = {
  reel: "🎬", post: "📷", carrossel: "🖼️", story: "⚡", short: "▶️",
};
const PLATFORMS = ["instagram", "tiktok", "youtube", "twitter", "linkedin"] as const;
const TYPES = ["reel", "post", "carrossel", "story", "short"] as const;
const STATUSES = ["rascunho", "agendado", "publicado", "atrasado"] as const;

type View = "month" | "week" | "day" | "list";

function CalendarPage() {
  const list = useServerFn(listCalendarEntries);
  const upsert = useServerFn(upsertCalendarEntry);
  const del = useServerFn(deleteCalendarEntry);
  const reschedule = useServerFn(rescheduleCalendarEntry);
  const suggest = useServerFn(suggestBestTime);
  const planWeek = useServerFn(planWeekAI);

  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [editing, setEditing] = useState<Partial<Entry> | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [fPlat, setFPlat] = useState<string>("");
  const [fType, setFType] = useState<string>("");
  const [fStatus, setFStatus] = useState<string>("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiSugg, setAiSugg] = useState<Array<{ weekday: string; time: string; reason: string }>>([]);
  const draggingId = useRef<string | null>(null);

  const reload = async () => {
    setLoading(true);
    const r = await list();
    if (r.ok) setEntries(r.entries as unknown as Entry[]);
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  // Hidratar título recebido de outras páginas via sessionStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const seedRaw = sessionStorage.getItem("calendar_seed");
    const t = sessionStorage.getItem("calendar_title");
    if (seedRaw) {
      try {
        const seed = JSON.parse(seedRaw);
        sessionStorage.removeItem("calendar_seed");
        openNew(undefined, seed);
      } catch { /* noop */ }
    } else if (t) {
      sessionStorage.removeItem("calendar_title");
      openNew(undefined, { title: t, source: "ganchos" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lembretes via Notification API
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") Notification.requestPermission().catch(() => {});
    const timer = setInterval(() => {
      if (Notification.permission !== "granted") return;
      const now = Date.now();
      entries.forEach((e) => {
        if (!e.reminder_minutes || e.status === "publicado") return;
        const when = new Date(e.scheduled_at).getTime() - e.reminder_minutes * 60_000;
        const key = `notif:${e.id}`;
        if (when <= now && now - when < 60_000 && !sessionStorage.getItem(key)) {
          new Notification("📅 Lembrete de post", { body: e.title, tag: e.id });
          sessionStorage.setItem(key, "1");
        }
      });
    }, 30_000);
    return () => clearInterval(timer);
  }, [entries]);

  // Filtro + busca
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (fPlat && e.platform !== fPlat) return false;
      if (fType && e.content_type !== fType) return false;
      if (fStatus && e.status !== fStatus) return false;
      if (q && !`${e.title} ${e.notes ?? ""} ${e.hook ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [entries, fPlat, fType, fStatus, search]);

  const stats = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay()); weekStart.setHours(0,0,0,0);
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 7);
    const thisWeek = entries.filter((e) => {
      const d = new Date(e.scheduled_at); return d >= weekStart && d < weekEnd;
    });
    const total = entries.length || 1;
    return {
      thisWeek: thisWeek.length,
      published: entries.filter((e) => e.status === "publicado").length,
      late: entries.filter((e) => e.status === "atrasado").length,
      publishedPct: Math.round((entries.filter((e) => e.status === "publicado").length / total) * 100),
    };
  }, [entries]);

  const openNew = (day?: Date, seed?: Partial<Entry>) => {
    const base = day ?? new Date(cursor);
    if (!day) base.setDate(new Date().getDate());
    base.setHours(10, 0, 0, 0);
    setEditing({
      title: "",
      content_type: "reel",
      platform: "instagram",
      status: "agendado",
      scheduled_at: base.toISOString(),
      notes: "",
      color: "#8b5cf6",
      recurrence: "none",
      checklist: [],
      attachments: [],
      ...seed,
    });
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.title || editing.title.trim().length < 1) {
      toast.error("Informe um título"); return;
    }
    const r = await upsert({ data: editing as any });
    if (r.ok) {
      toast.success(editing.id ? "Atualizado" : "Agendado");
      logActivity({ event_type: "action", description: `Calendário: ${editing.title}`, status: "success" });
      setEditing(null);
      reload();
    } else toast.error(r.error);
  };

  const remove = async () => {
    if (!confirmDel) return;
    const r = await del({ data: { id: confirmDel } });
    if (r.ok) { toast.success("Removido"); setConfirmDel(null); setEditing(null); reload(); }
    else toast.error(r.error);
  };

  const onDrop = async (date: Date) => {
    const id = draggingId.current;
    if (!id) return;
    const orig = entries.find((e) => e.id === id);
    if (!orig) return;
    const old = new Date(orig.scheduled_at);
    const next = new Date(date);
    next.setHours(old.getHours(), old.getMinutes(), 0, 0);
    setEntries((prev) => prev.map((e) => e.id === id ? { ...e, scheduled_at: next.toISOString() } : e));
    draggingId.current = null;
    const r = await reschedule({ data: { id, scheduled_at: next.toISOString() } });
    if (!r.ok) { toast.error(r.error); reload(); }
    else toast.success("Reagendado");
  };

  const askSuggest = async () => {
    if (!editing) return;
    setAiBusy(true);
    const r = await suggest({ data: { platform: editing.platform ?? "instagram", content_type: editing.content_type ?? "reel", niche: "geral" } });
    setAiBusy(false);
    if (r.ok) setAiSugg(r.suggestions);
    else toast.error(r.error);
  };

  const doPlanWeek = async () => {
    setAiBusy(true);
    const start = new Date(); start.setHours(10, 0, 0, 0);
    const day = start.getDay();
    const monday = new Date(start); monday.setDate(start.getDate() + (day === 0 ? 1 : 8 - day));
    const r = await planWeek({ data: { niche: "geral", platform: "instagram", start_date: monday.toISOString(), save: true } });
    setAiBusy(false);
    if (r.ok) { toast.success(`7 posts agendados pra semana`); reload(); }
    else toast.error(r.error);
  };

  const exportICS = () => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const fmt = (iso: string) => {
      const d = new Date(iso);
      return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
    };
    const lines = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//SHEY N8N//Calendar//PT",
      ...filtered.flatMap((e) => {
        const end = new Date(new Date(e.scheduled_at).getTime() + 30*60_000).toISOString();
        return [
          "BEGIN:VEVENT",
          `UID:${e.id}@sheyn8n`,
          `DTSTAMP:${fmt(new Date().toISOString())}`,
          `DTSTART:${fmt(e.scheduled_at)}`,
          `DTEND:${fmt(end)}`,
          `SUMMARY:${(TYPE_EMOJI[e.content_type] ?? "")} ${e.title.replace(/[\r\n,;]/g, " ")}`,
          `DESCRIPTION:${(e.notes ?? "").replace(/[\r\n,;]/g, " ").slice(0, 300)}`,
          "END:VEVENT",
        ];
      }),
      "END:VCALENDAR",
    ];
    const blob = new Blob([lines.join("\r\n")], { type: "text/calendar" });
    triggerDownload(blob, "calendario.ics");
  };

  const exportCSV = () => {
    const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = [["title","platform","type","scheduled_at","status","notes"], ...filtered.map((e) => [
      e.title, e.platform, e.content_type, e.scheduled_at, e.status, e.notes ?? "",
    ])];
    const blob = new Blob([rows.map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv" });
    triggerDownload(blob, "calendario.csv");
  };

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      <div className="flex-1 space-y-4 px-3 py-4 md:px-8 md:py-8 md:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CalendarDays className="w-5 h-5 text-primary" />
              <h1 className="font-display text-xl font-bold text-foreground">Calendário Editorial</h1>
            </div>
            <p className="text-xs text-muted-foreground">Planeje, agende e acompanhe todo seu conteúdo num lugar só.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={doPlanWeek} disabled={aiBusy}
              className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 hover:bg-primary/20 px-3 py-2 text-xs font-semibold text-primary disabled:opacity-50">
              <Wand2 className="w-3.5 h-3.5" /> {aiBusy ? "..." : "Plano IA da semana"}
            </button>
            <button onClick={exportICS}
              className="inline-flex items-center gap-1.5 rounded-md border border-border hover:bg-muted px-3 py-2 text-xs font-semibold text-foreground">
              <Download className="w-3.5 h-3.5" /> .ics
            </button>
            <button onClick={exportCSV}
              className="inline-flex items-center gap-1.5 rounded-md border border-border hover:bg-muted px-3 py-2 text-xs font-semibold text-foreground">
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button onClick={() => openNew()}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary hover:bg-primary/90 px-3 py-2 text-xs font-semibold text-primary-foreground">
              <Plus className="w-3.5 h-3.5" /> Novo
            </button>
          </div>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          <Stat icon={<CalendarDays className="w-3.5 h-3.5" />} label="Esta semana" value={stats.thisWeek} />
          <Stat icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />} label="Publicados" value={stats.published} />
          <Stat icon={<AlertTriangle className="w-3.5 h-3.5 text-red-400" />} label="Atrasados" value={stats.late} />
          <Stat icon={<TrendingUp className="w-3.5 h-3.5 text-primary" />} label="% Publicado" value={`${stats.publishedPct}%`} />
        </div>

        {/* Toolbar: busca + filtros + view */}
        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..."
              className="w-full rounded-md border border-border bg-background pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-primary" />
          </div>
          <div className="flex gap-2 flex-wrap">
            <SelectFilter icon={<Filter className="w-3 h-3" />} value={fPlat} onChange={setFPlat} placeholder="Plataforma" options={PLATFORMS} />
            <SelectFilter value={fType} onChange={setFType} placeholder="Tipo" options={TYPES} />
            <SelectFilter value={fStatus} onChange={setFStatus} placeholder="Status" options={STATUSES} />
            <div className="inline-flex rounded-md border border-border overflow-hidden">
              {(["month", "week", "day", "list"] as View[]).map((v) => (
                <button key={v} onClick={() => setView(v)}
                  className={`px-2.5 py-2 text-xs font-semibold capitalize ${view === v ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}>
                  {v === "month" ? "Mês" : v === "week" ? "Sem" : v === "day" ? "Dia" : "Lista"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* View */}
        {loading ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">Carregando...</div>
        ) : view === "month" ? (
          <MonthView cursor={cursor} setCursor={setCursor} entries={filtered}
            onCellClick={(d) => openNew(d)} onEntryClick={(e) => setEditing(e)}
            onDragStart={(id) => (draggingId.current = id)} onDrop={onDrop} />
        ) : view === "week" ? (
          <WeekView cursor={cursor} setCursor={setCursor} entries={filtered}
            onEntryClick={(e) => setEditing(e)} onCellClick={(d) => openNew(d)}
            onDragStart={(id) => (draggingId.current = id)} onDrop={onDrop} />
        ) : view === "day" ? (
          <DayView cursor={cursor} setCursor={setCursor} entries={filtered}
            onEntryClick={(e) => setEditing(e)} onAdd={(d) => openNew(d)} />
        ) : (
          <ListView entries={filtered} onEntryClick={(e) => setEditing(e)} />
        )}
      </div>

      {/* Modal editar/criar */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 p-0 md:p-4" onClick={() => { setEditing(null); setAiSugg([]); }}>
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-xl md:rounded-xl border border-border bg-card p-4 md:p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between sticky top-0 bg-card py-1">
              <h3 className="font-display text-base font-bold text-foreground">
                {editing.id ? "Editar agendamento" : "Novo agendamento"}
              </h3>
              <button onClick={() => { setEditing(null); setAiSugg([]); }} className="p-1 rounded-md hover:bg-muted text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <Field label="Título *">
              <input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                placeholder="Ex: Reel sobre 5 erros de marketing"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary" />
            </Field>

            {editing.hook && (
              <Field label="Gancho">
                <input value={editing.hook ?? ""} onChange={(e) => setEditing({ ...editing, hook: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
              </Field>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Tipo">
                <select value={editing.content_type ?? "reel"} onChange={(e) => setEditing({ ...editing, content_type: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                  {TYPES.map((t) => <option key={t} value={t}>{TYPE_EMOJI[t]} {t}</option>)}
                </select>
              </Field>
              <Field label="Plataforma">
                <select value={editing.platform ?? "instagram"} onChange={(e) => setEditing({ ...editing, platform: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                  {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Data e hora *">
                <input type="datetime-local"
                  value={editing.scheduled_at ? toLocalInput(editing.scheduled_at) : ""}
                  onChange={(e) => setEditing({ ...editing, scheduled_at: new Date(e.target.value).toISOString() })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
              </Field>
              <Field label="Status">
                <select value={editing.status ?? "agendado"} onChange={(e) => setEditing({ ...editing, status: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>

            {/* IA sugerir horário */}
            <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
              <button onClick={askSuggest} disabled={aiBusy}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline disabled:opacity-50">
                <Sparkles className="w-3.5 h-3.5" /> {aiBusy ? "Pensando..." : "Sugerir melhor horário (IA)"}
              </button>
              {aiSugg.length > 0 && (
                <div className="mt-2 space-y-1">
                  {aiSugg.map((s, i) => (
                    <div key={i} className="text-xs text-foreground">
                      <span className="font-bold capitalize">{s.weekday} {s.time}</span>
                      <span className="text-muted-foreground"> — {s.reason}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recorrência */}
            <div className="grid grid-cols-2 gap-3">
              <Field label={<span className="inline-flex items-center gap-1"><Repeat className="w-3 h-3" /> Repetir</span>}>
                <select value={editing.recurrence ?? "none"} onChange={(e) => setEditing({ ...editing, recurrence: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                  <option value="none">Não repetir</option>
                  <option value="daily">Diariamente</option>
                  <option value="weekly">Semanalmente</option>
                  <option value="monthly">Mensalmente</option>
                </select>
              </Field>
              {editing.recurrence && editing.recurrence !== "none" && !editing.id && (
                <Field label="Até">
                  <input type="date"
                    value={editing.recurrence_until ? editing.recurrence_until.slice(0, 10) : ""}
                    onChange={(e) => setEditing({ ...editing, recurrence_until: e.target.value ? new Date(e.target.value).toISOString() : null })}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
                </Field>
              )}
            </div>

            {/* Lembrete */}
            <Field label={<span className="inline-flex items-center gap-1"><Bell className="w-3 h-3" /> Lembrete (min antes)</span>}>
              <select value={editing.reminder_minutes ?? ""} onChange={(e) => setEditing({ ...editing, reminder_minutes: e.target.value ? Number(e.target.value) : null })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                <option value="">Sem lembrete</option>
                <option value="15">15 minutos</option>
                <option value="60">1 hora</option>
                <option value="180">3 horas</option>
                <option value="1440">1 dia</option>
              </select>
            </Field>

            {/* Checklist */}
            <div>
              <label className="block text-[11px] uppercase tracking-wide font-semibold text-muted-foreground mb-1.5 inline-flex items-center gap-1">
                <ListChecks className="w-3 h-3" /> Checklist
              </label>
              <div className="space-y-1.5">
                {(editing.checklist ?? []).map((it, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="checkbox" checked={it.done} onChange={(e) => {
                      const next = [...(editing.checklist ?? [])];
                      next[i] = { ...it, done: e.target.checked };
                      setEditing({ ...editing, checklist: next });
                    }} />
                    <input value={it.text} onChange={(e) => {
                      const next = [...(editing.checklist ?? [])];
                      next[i] = { ...it, text: e.target.value };
                      setEditing({ ...editing, checklist: next });
                    }} className={`flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs ${it.done ? "line-through text-muted-foreground" : ""}`} />
                    <button onClick={() => setEditing({ ...editing, checklist: (editing.checklist ?? []).filter((_, j) => j !== i) })}
                      className="text-muted-foreground hover:text-red-400"><X className="w-3 h-3" /></button>
                  </div>
                ))}
                <button onClick={() => setEditing({ ...editing, checklist: [...(editing.checklist ?? []), { text: "", done: false }] })}
                  className="text-xs text-primary hover:underline">+ Adicionar item</button>
              </div>
            </div>

            {/* Anexos */}
            <div>
              <label className="block text-[11px] uppercase tracking-wide font-semibold text-muted-foreground mb-1.5 inline-flex items-center gap-1">
                <LinkIcon className="w-3 h-3" /> Anexos / Links
              </label>
              <div className="space-y-1.5">
                {(editing.attachments ?? []).map((a, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input value={a.label} placeholder="Rótulo" onChange={(e) => {
                      const next = [...(editing.attachments ?? [])];
                      next[i] = { ...a, label: e.target.value };
                      setEditing({ ...editing, attachments: next });
                    }} className="w-1/3 rounded-md border border-border bg-background px-2 py-1 text-xs" />
                    <input value={a.url} placeholder="https://..." onChange={(e) => {
                      const next = [...(editing.attachments ?? [])];
                      next[i] = { ...a, url: e.target.value };
                      setEditing({ ...editing, attachments: next });
                    }} className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs" />
                    <button onClick={() => setEditing({ ...editing, attachments: (editing.attachments ?? []).filter((_, j) => j !== i) })}
                      className="text-muted-foreground hover:text-red-400"><X className="w-3 h-3" /></button>
                  </div>
                ))}
                <button onClick={() => setEditing({ ...editing, attachments: [...(editing.attachments ?? []), { label: "", url: "" }] })}
                  className="text-xs text-primary hover:underline">+ Adicionar link</button>
              </div>
            </div>

            <Field label="Notas (legenda, hashtags, ideias...)">
              <textarea value={editing.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                rows={3} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-y" />
            </Field>

            <div className="flex items-center justify-between pt-2 sticky bottom-0 bg-card">
              {editing.id ? (
                <button onClick={() => setConfirmDel(editing.id!)}
                  className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300">
                  <Trash2 className="w-3.5 h-3.5" /> Remover
                </button>
              ) : <div />}
              <div className="flex gap-2">
                <button onClick={() => { setEditing(null); setAiSugg([]); }}
                  className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-muted">Cancelar</button>
                <button onClick={save}
                  className="rounded-md bg-primary hover:bg-primary/90 px-4 py-2 text-sm font-semibold text-primary-foreground">Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover este agendamento?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-red-500 hover:bg-red-600">Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============ Sub-views ============

function MonthView({ cursor, setCursor, entries, onCellClick, onEntryClick, onDragStart, onDrop }: {
  cursor: Date; setCursor: (d: Date) => void; entries: Entry[];
  onCellClick: (d: Date) => void; onEntryClick: (e: Entry) => void;
  onDragStart: (id: string) => void; onDrop: (d: Date) => void;
}) {
  const monthLabel = cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const firstWeekday = new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay();
  const entriesByDay = useMemo(() => {
    const map: Record<number, Entry[]> = {};
    for (const e of entries) {
      const d = new Date(e.scheduled_at);
      if (d.getFullYear() === cursor.getFullYear() && d.getMonth() === cursor.getMonth()) {
        (map[d.getDate()] ||= []).push(e);
      }
    }
    return map;
  }, [entries, cursor]);
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="rounded-xl border border-border bg-card p-3 md:p-4">
      <ViewHeader label={monthLabel} onPrev={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} onNext={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} onToday={() => { const d = new Date(); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)); }} />
      <div className="grid grid-cols-7 gap-1 text-center text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase mb-1">
        {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => <div key={i} className="py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          const dayEntries = day ? (entriesByDay[day] ?? []) : [];
          const isToday = day && new Date().toDateString() === new Date(cursor.getFullYear(), cursor.getMonth(), day).toDateString();
          const cellDate = day ? new Date(cursor.getFullYear(), cursor.getMonth(), day) : null;
          return (
            <div key={i}
              onClick={() => cellDate && onCellClick(cellDate)}
              onDragOver={(e) => { if (cellDate) e.preventDefault(); }}
              onDrop={() => cellDate && onDrop(cellDate)}
              className={`min-h-[60px] md:min-h-[80px] rounded-md border p-1 md:p-1.5 text-left transition-colors ${day ? "border-border bg-background hover:border-primary/40 cursor-pointer" : "border-transparent"} ${isToday ? "ring-1 ring-primary" : ""}`}>
              {day && (
                <>
                  <div className={`text-[10px] md:text-[11px] font-bold mb-0.5 ${isToday ? "text-primary" : "text-muted-foreground"}`}>{day}</div>
                  <div className="space-y-0.5">
                    {dayEntries.slice(0, 2).map((e) => (
                      <div key={e.id} draggable onDragStart={() => onDragStart(e.id)}
                        onClick={(ev) => { ev.stopPropagation(); onEntryClick(e); }}
                        className={`truncate text-[9px] md:text-[10px] rounded px-1 py-0.5 border cursor-grab active:cursor-grabbing ${STATUS_COLORS[e.status] ?? STATUS_COLORS.rascunho}`}
                        title={e.title}>
                        {TYPE_EMOJI[e.content_type] ?? "•"} {e.title}
                      </div>
                    ))}
                    {dayEntries.length > 2 && <div className="text-[9px] md:text-[10px] text-muted-foreground">+{dayEntries.length - 2}</div>}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({ cursor, setCursor, entries, onEntryClick, onCellClick, onDragStart, onDrop }: {
  cursor: Date; setCursor: (d: Date) => void; entries: Entry[];
  onEntryClick: (e: Entry) => void; onCellClick: (d: Date) => void;
  onDragStart: (id: string) => void; onDrop: (d: Date) => void;
}) {
  const start = new Date(cursor); start.setDate(cursor.getDate() - cursor.getDay()); start.setHours(0,0,0,0);
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  const label = `${start.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} — ${days[6].toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}`;

  return (
    <div className="rounded-xl border border-border bg-card p-3 md:p-4">
      <ViewHeader label={label} onPrev={() => { const d = new Date(cursor); d.setDate(cursor.getDate() - 7); setCursor(d); }} onNext={() => { const d = new Date(cursor); d.setDate(cursor.getDate() + 7); setCursor(d); }} onToday={() => setCursor(new Date())} />
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const dayEntries = entries.filter((e) => new Date(e.scheduled_at).toDateString() === d.toDateString())
            .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
          const isToday = d.toDateString() === new Date().toDateString();
          return (
            <div key={d.toISOString()}
              onClick={() => onCellClick(d)}
              onDragOver={(e) => e.preventDefault()} onDrop={() => onDrop(d)}
              className={`min-h-[180px] rounded-md border border-border bg-background hover:border-primary/40 p-1.5 cursor-pointer ${isToday ? "ring-1 ring-primary" : ""}`}>
              <div className="text-[10px] font-bold text-muted-foreground mb-1">
                {d.toLocaleDateString("pt-BR", { weekday: "short" }).slice(0, 3)} {d.getDate()}
              </div>
              <div className="space-y-1">
                {dayEntries.map((e) => (
                  <div key={e.id} draggable onDragStart={() => onDragStart(e.id)}
                    onClick={(ev) => { ev.stopPropagation(); onEntryClick(e); }}
                    className={`text-[10px] rounded px-1 py-0.5 border cursor-grab ${STATUS_COLORS[e.status] ?? STATUS_COLORS.rascunho}`}>
                    <div className="font-semibold">{new Date(e.scheduled_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
                    <div className="truncate">{TYPE_EMOJI[e.content_type]} {e.title}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayView({ cursor, setCursor, entries, onEntryClick, onAdd }: {
  cursor: Date; setCursor: (d: Date) => void; entries: Entry[];
  onEntryClick: (e: Entry) => void; onAdd: (d: Date) => void;
}) {
  const dayEntries = entries.filter((e) => new Date(e.scheduled_at).toDateString() === cursor.toDateString())
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  return (
    <div className="rounded-xl border border-border bg-card p-3 md:p-4">
      <ViewHeader
        label={cursor.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
        onPrev={() => { const d = new Date(cursor); d.setDate(cursor.getDate() - 1); setCursor(d); }}
        onNext={() => { const d = new Date(cursor); d.setDate(cursor.getDate() + 1); setCursor(d); }}
        onToday={() => setCursor(new Date())}
      />
      {dayEntries.length === 0 ? (
        <button onClick={() => onAdd(cursor)} className="w-full py-12 text-sm text-muted-foreground hover:text-primary border border-dashed border-border rounded-md">
          + Nada agendado. Adicionar
        </button>
      ) : (
        <div className="space-y-2">
          {dayEntries.map((e) => <EntryRow key={e.id} entry={e} onClick={() => onEntryClick(e)} />)}
        </div>
      )}
    </div>
  );
}

function ListView({ entries, onEntryClick }: { entries: Entry[]; onEntryClick: (e: Entry) => void }) {
  if (entries.length === 0) return <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">Nenhum item.</div>;
  return (
    <div className="rounded-xl border border-border bg-card p-3 md:p-4 space-y-2">
      {entries.map((e) => <EntryRow key={e.id} entry={e} onClick={() => onEntryClick(e)} />)}
    </div>
  );
}

function EntryRow({ entry, onClick }: { entry: Entry; onClick: () => void }) {
  const done = (entry.checklist ?? []).filter((c) => c.done).length;
  const total = (entry.checklist ?? []).length;
  return (
    <button onClick={onClick}
      className="w-full text-left flex items-center gap-3 rounded-md border border-border bg-background hover:border-primary/40 p-3 transition-colors">
      <span className="text-lg">{TYPE_EMOJI[entry.content_type] ?? "📝"}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{entry.title}</p>
        <p className="text-xs text-muted-foreground">
          {new Date(entry.scheduled_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
          {" · "}{entry.platform}
          {total > 0 && <span> · ✓ {done}/{total}</span>}
          {entry.reminder_minutes && <span> · 🔔</span>}
          {entry.recurrence !== "none" && <span> · 🔁</span>}
        </p>
      </div>
      <span className={`px-2 py-0.5 text-[10px] font-bold rounded border whitespace-nowrap ${STATUS_COLORS[entry.status] ?? STATUS_COLORS.rascunho}`}>
        {entry.status}
      </span>
    </button>
  );
}

function ViewHeader({ label, onPrev, onNext, onToday }: { label: string; onPrev: () => void; onNext: () => void; onToday: () => void }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <button onClick={onPrev} className="p-2 rounded-md hover:bg-muted text-foreground"><ChevronLeft className="w-4 h-4" /></button>
      <div className="flex items-center gap-2">
        <h2 className="font-display text-sm font-bold text-foreground capitalize">{label}</h2>
        <button onClick={onToday} className="text-[10px] px-2 py-0.5 rounded border border-border hover:bg-muted text-muted-foreground">Hoje</button>
      </div>
      <button onClick={onNext} className="p-2 rounded-md hover:bg-muted text-foreground"><ChevronRight className="w-4 h-4" /></button>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: any }) {
  return (
    <div className="rounded-lg border border-border bg-card p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{icon} {label}</div>
      <div className="text-lg font-bold text-foreground mt-0.5">{value}</div>
    </div>
  );
}

function SelectFilter({ icon, value, onChange, placeholder, options }: {
  icon?: React.ReactNode; value: string; onChange: (v: string) => void; placeholder: string; options: readonly string[];
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-border bg-background px-2.5 py-2 text-xs text-foreground">
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-wide font-semibold text-muted-foreground mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}
