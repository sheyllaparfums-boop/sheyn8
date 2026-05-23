import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { requireAuth } from "@/lib/route-guards";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useRef, useEffect } from "react";
import {
  transcribeReel,
  listReelTranscriptions,
  deleteReelTranscription,
  updateTranscriptText,
  retryReelTranscription,
  regenerateRepurpose,
  translateTranscript,
} from "@/lib/reel-transcription.functions";
import { upsertViralHook } from "@/lib/hooks.functions";
import { upsertCalendarEntry } from "@/lib/calendar.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Copy,
  Download,
  Loader2,
  Mic,
  Play,
  Trash2,
  Sparkles,
  Music2,
  Clock,
  Search,
  RefreshCw,
  Pencil,
  Save,
  X,
  Languages,
  FileDown,
  Wand2,
  CalendarPlus,
  BookmarkPlus,
  LayoutGrid,
} from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { DashboardHeader } from "@/components/dashboard/Header";

export const Route = createFileRoute("/transcricao")({
  beforeLoad: ({ location }) => requireAuth(location),
  component: TranscricaoPage,
  head: () => ({
    meta: [
      { title: "Transcrição de Reel — Shey N8N" },
      { name: "description", content: "Transcreva Reels do Instagram com timestamps, edite, traduza e reutilize em carrosséis, ganchos e calendário." },
    ],
  }),
});

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function fmtSrt(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.floor((s - Math.floor(s)) * 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}
function fmtVtt(s: number) {
  return fmtSrt(s).replace(",", ".");
}

function buildSrt(words: any[]): string {
  if (!words?.length) return "";
  // group words into ~5s subtitles
  const chunks: { start: number; end: number; text: string }[] = [];
  let cur = { start: words[0].start, end: words[0].end, text: "" };
  for (const w of words) {
    if (w.start - cur.start > 5 && cur.text) {
      chunks.push(cur);
      cur = { start: w.start, end: w.end, text: "" };
    }
    cur.text += (cur.text ? " " : "") + w.text;
    cur.end = w.end;
  }
  if (cur.text) chunks.push(cur);
  return chunks.map((c, i) => `${i + 1}\n${fmtSrt(c.start)} --> ${fmtSrt(c.end)}\n${c.text}\n`).join("\n");
}
function buildVtt(words: any[]): string {
  const srt = buildSrt(words);
  if (!srt) return "WEBVTT\n";
  return "WEBVTT\n\n" + srt.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");
}

function download(name: string, content: string, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function highlightText(text: string, query: string) {
  if (!query.trim()) return text;
  const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(re);
  return parts.map((p, i) =>
    re.test(p) ? (
      <mark key={i} className="rounded bg-primary/40 px-0.5 text-foreground">{p}</mark>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

function TranscricaoPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const transcribe = useServerFn(transcribeReel);
  const list = useServerFn(listReelTranscriptions);
  const del = useServerFn(deleteReelTranscription);
  const updateText = useServerFn(updateTranscriptText);
  const retry = useServerFn(retryReelTranscription);
  const regen = useServerFn(regenerateRepurpose);
  const translate = useServerFn(translateTranscript);
  const saveHook = useServerFn(upsertViralHook);
  const saveCalendar = useServerFn(upsertCalendarEntry);

  const [url, setUrl] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [historySearch, setHistorySearch] = useState("");
  const [transcriptSearch, setTranscriptSearch] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [tone, setTone] = useState("viral, direto");
  const [niche, setNiche] = useState("");
  const [translation, setTranslation] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const itemsQ = useQuery({
    queryKey: ["reel-transcriptions"],
    queryFn: () => list(),
    refetchOnWindowFocus: false,
    refetchInterval: (q) => {
      const items = (q.state.data as any)?.items ?? [];
      const hasProcessing = items.some((i: any) => i.status === "processing");
      return hasProcessing ? 3000 : false;
    },
  });

  const items = (itemsQ.data?.ok ? itemsQ.data.items : []) as any[];

  const filteredItems = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) =>
      [i.author_handle, i.transcript, i.caption, i.shortcode]
        .filter(Boolean)
        .some((v: string) => v.toLowerCase().includes(q)),
    );
  }, [items, historySearch]);

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? filteredItems[0] ?? items[0] ?? null,
    [items, filteredItems, selectedId],
  );

  // reset edit/translation when switching reel
  useEffect(() => {
    setEditMode(false);
    setEditValue(selected?.transcript ?? "");
    setTranslation(null);
  }, [selected?.id]);

  const m = useMutation({
    mutationFn: async (reelUrl: string) =>
      transcribe({
        data: {
          reel_url: reelUrl,
          user_name: user?.name ?? null,
          user_email: user?.email ?? null,
        },
      }),
    onSuccess: (res: any) => {
      if (res?.ok) {
        toast.success("Reel transcrito!");
        setUrl("");
        setSelectedId(res.record?.id ?? null);
      } else {
        toast.error(res?.error ?? "Falha ao transcrever");
      }
      qc.invalidateQueries({ queryKey: ["reel-transcriptions"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro inesperado"),
  });

  const delM = useMutation({
    mutationFn: async (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Removido");
      setSelectedId(null);
      qc.invalidateQueries({ queryKey: ["reel-transcriptions"] });
    },
  });

  const retryM = useMutation({
    mutationFn: async (id: string) => retry({ data: { id } }),
    onSuccess: (r: any) => {
      if (r?.ok) toast.success("Re-processado");
      else toast.error(r?.error ?? "Falha ao re-tentar");
      qc.invalidateQueries({ queryKey: ["reel-transcriptions"] });
    },
  });

  const saveTextM = useMutation({
    mutationFn: async () => updateText({ data: { id: selected.id, transcript: editValue } }),
    onSuccess: (r: any) => {
      if (r?.ok) {
        toast.success("Transcrição atualizada");
        setEditMode(false);
        qc.invalidateQueries({ queryKey: ["reel-transcriptions"] });
      } else toast.error(r?.error ?? "Erro ao salvar");
    },
  });

  const regenM = useMutation({
    mutationFn: async () => regen({ data: { id: selected.id, tone, niche: niche || undefined } }),
    onSuccess: (r: any) => {
      if (r?.ok) {
        toast.success("Reutilização IA atualizada");
        qc.invalidateQueries({ queryKey: ["reel-transcriptions"] });
      } else toast.error(r?.error ?? "Erro IA");
    },
  });

  const translateM = useMutation({
    mutationFn: async (target: "pt" | "en" | "es") =>
      translate({ data: { id: selected.id, target } }),
    onSuccess: (r: any) => {
      if (r?.ok) {
        setTranslation(r.translated);
        toast.success("Traduzido");
      } else toast.error(r?.error ?? "Erro ao traduzir");
    },
  });

  const copy = (text: string, label = "Copiado") => {
    navigator.clipboard.writeText(text);
    toast.success(label);
  };

  const submit = () => {
    if (!url.trim()) return toast.error("Cole a URL do Reel");
    if (!/instagram\.com\/(reel|p|tv)\//i.test(url)) return toast.error("URL inválida");
    m.mutate(url.trim());
  };

  const seekTo = (s: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = s;
      videoRef.current.play().catch(() => {});
    }
  };

  const sendHookToBank = async (hook: string) => {
    const r: any = await saveHook({
      data: {
        hook,
        niche: niche || "geral",
        format: "reel",
        tags: [],
        performance: "medio",
        language: "pt-br",
      },
    });
    if (r?.ok) toast.success("Gancho salvo no banco");
    else toast.error(r?.error ?? "Erro ao salvar");
  };

  const scheduleInCalendar = async () => {
    if (!selected?.transcript) return;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const r: any = await saveCalendar({
      data: {
        title: `Reel @${selected.author_handle ?? "—"}`,
        content_type: "reel",
        platform: "instagram",
        scheduled_at: tomorrow.toISOString(),
        status: "rascunho",
        notes: selected.transcript.slice(0, 500),
        color: "#8b5cf6",
      },
    });
    if (r?.ok) {
      toast.success("Adicionado ao calendário");
      navigate({ to: "/calendario" });
    } else toast.error(r?.error ?? "Erro ao agendar");
  };

  return (
    <div>
      <DashboardHeader />
      <div className="p-4 md:p-8 space-y-6">
        {/* Input */}
        <Card className="border-primary/30 bg-card/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-primary" />
              Transcrever um Reel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-2 md:flex-row">
              <Input
                placeholder="https://www.instagram.com/reel/ABC123/"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={m.isPending}
                className="flex-1"
              />
              <Button onClick={submit} disabled={m.isPending} className="md:w-44">
                {m.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Transcrevendo…</>
                ) : (
                  <><Sparkles className="mr-2 h-4 w-4" /> Transcrever</>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Apify extrai o áudio + ElevenLabs Scribe transcreve com timestamps. Reels processando atualizam automaticamente.
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* Histórico */}
          <Card className="bg-card/60">
            <CardHeader className="space-y-2">
              <CardTitle className="text-base">Histórico</CardTitle>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar @handle, palavra…"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="h-8 pl-7 text-xs"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                <div className="space-y-1 p-2">
                  {itemsQ.isLoading &&
                    Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  {!itemsQ.isLoading && filteredItems.length === 0 && (
                    <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                      {items.length === 0 ? "Nenhuma transcrição ainda." : "Nada encontrado."}
                    </p>
                  )}
                  {filteredItems.map((it) => (
                    <button
                      key={it.id}
                      onClick={() => setSelectedId(it.id)}
                      className={`w-full rounded-md border p-2 text-left text-xs transition-all hover:bg-primary/5 ${
                        (selected?.id ?? filteredItems[0]?.id) === it.id
                          ? "border-primary/60 bg-primary/10"
                          : "border-border/50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {it.thumbnail_url ? (
                          <img
                            src={`/api/public/ig-thumb?url=${encodeURIComponent(it.thumbnail_url)}`}
                            alt=""
                            className="h-12 w-12 rounded object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded bg-muted">
                            <Play className="h-4 w-4" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-foreground">
                            @{it.author_handle ?? "—"}
                          </p>
                          <p className="truncate text-muted-foreground">
                            {it.transcript?.slice(0, 60) ?? it.status}
                          </p>
                          <div className="mt-1 flex items-center gap-1">
                            <Badge
                              variant="outline"
                              className={`text-[9px] ${
                                it.status === "done"
                                  ? "border-emerald-500/40 text-emerald-400"
                                  : it.status === "error"
                                    ? "border-red-500/40 text-red-400"
                                    : "border-amber-500/40 text-amber-400"
                              }`}
                            >
                              {it.status === "processing" && (
                                <Loader2 className="mr-1 inline h-2.5 w-2.5 animate-spin" />
                              )}
                              {it.status}
                            </Badge>
                            {it.duration_seconds && (
                              <span className="text-[10px] text-muted-foreground">
                                {fmt(Number(it.duration_seconds))}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Detalhe */}
          <div className="space-y-4">
            {!selected && (
              <Card className="bg-card/40">
                <CardContent className="p-12 text-center text-muted-foreground">
                  Cole a URL de um Reel acima para começar.
                </CardContent>
              </Card>
            )}

            {selected && (
              <>
                {/* Header card com player */}
                <Card className="bg-card/60">
                  <CardContent className="flex flex-col gap-4 p-4 md:flex-row">
                    {selected.video_url ? (
                      <video
                        ref={videoRef}
                        src={`/api/public/ig-video?inline=1&url=${encodeURIComponent(selected.video_url)}`}
                        poster={selected.thumbnail_url ? `/api/public/ig-thumb?url=${encodeURIComponent(selected.thumbnail_url)}` : undefined}
                        controls
                        playsInline
                        className="h-64 w-full rounded-lg bg-black object-contain md:h-44 md:w-44"
                      />
                    ) : selected.thumbnail_url ? (
                      <img
                        src={`/api/public/ig-thumb?url=${encodeURIComponent(selected.thumbnail_url)}`}
                        alt=""
                        className="h-44 w-full rounded-lg object-cover md:w-44"
                      />
                    ) : null}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-display text-lg font-bold">
                            @{selected.author_handle ?? "desconhecido"}
                          </h3>
                          <a
                            href={selected.reel_url}
                            target="_blank"
                            rel="noreferrer"
                            className="block truncate text-xs text-primary hover:underline"
                          >
                            {selected.reel_url}
                          </a>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          {selected.status === "error" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => retryM.mutate(selected.id)}
                              disabled={retryM.isPending}
                              aria-label="Re-tentar"
                            >
                              {retryM.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4 text-amber-400" />
                              )}
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label="Remover">
                                <Trash2 className="h-4 w-4 text-red-400" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover transcrição?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Essa ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => delM.mutate(selected.id)}>
                                  Remover
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {selected.duration_seconds && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {fmt(Number(selected.duration_seconds))}
                          </span>
                        )}
                        {selected.language && (
                          <Badge variant="outline" className="text-[10px]">{selected.language}</Badge>
                        )}
                        {Array.isArray(selected.audio_events) && selected.audio_events.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Music2 className="h-3 w-3" /> {selected.audio_events.length} eventos
                          </span>
                        )}
                      </div>
                      {selected.caption && (
                        <p className="line-clamp-3 text-sm text-muted-foreground">{selected.caption}</p>
                      )}

                      {selected.status === "done" && (
                        <div className="flex flex-wrap gap-2 pt-2">
                          <Button size="sm" variant="outline" onClick={scheduleInCalendar}>
                            <CalendarPlus className="mr-1 h-3 w-3" /> Agendar
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {selected.status === "processing" && (
                  <Card className="border-amber-500/40 bg-amber-500/5">
                    <CardContent className="flex items-center gap-3 p-4 text-sm text-amber-300">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processando… (atualiza sozinho)
                    </CardContent>
                  </Card>
                )}

                {selected.status === "error" && (
                  <Card className="border-red-500/40 bg-red-500/5">
                    <CardContent className="flex items-center justify-between gap-3 p-4 text-sm text-red-400">
                      <span>{selected.error ?? "Falha ao processar."}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => retryM.mutate(selected.id)}
                        disabled={retryM.isPending}
                      >
                        {retryM.isPending ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-1 h-3 w-3" />
                        )}
                        Re-tentar
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {selected.status === "done" && (
                  <Tabs defaultValue="transcript">
                    <TabsList className="flex-wrap">
                      <TabsTrigger value="transcript">Transcrição</TabsTrigger>
                      <TabsTrigger value="timestamps">Timestamps</TabsTrigger>
                      <TabsTrigger value="translate">Tradução</TabsTrigger>
                      <TabsTrigger value="repurpose">Reutilizar IA</TabsTrigger>
                    </TabsList>

                    {/* TRANSCRIPT */}
                    <TabsContent value="transcript" className="mt-3">
                      <Card className="bg-card/60">
                        <CardContent className="space-y-3 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="relative max-w-xs flex-1">
                              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                placeholder="Buscar no texto…"
                                value={transcriptSearch}
                                onChange={(e) => setTranscriptSearch(e.target.value)}
                                className="h-8 pl-7 text-xs"
                              />
                            </div>
                            <div className="flex gap-2">
                              {!editMode ? (
                                <Button size="sm" variant="outline" onClick={() => { setEditValue(selected.transcript ?? ""); setEditMode(true); }}>
                                  <Pencil className="mr-1 h-3 w-3" /> Editar
                                </Button>
                              ) : (
                                <>
                                  <Button size="sm" variant="outline" onClick={() => setEditMode(false)}>
                                    <X className="mr-1 h-3 w-3" /> Cancelar
                                  </Button>
                                  <Button size="sm" onClick={() => saveTextM.mutate()} disabled={saveTextM.isPending}>
                                    {saveTextM.isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Save className="mr-1 h-3 w-3" />} Salvar
                                  </Button>
                                </>
                              )}
                              <Button size="sm" variant="outline" onClick={() => copy(selected.transcript ?? "")}>
                                <Copy className="mr-1 h-3 w-3" /> Copiar
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="sm" variant="outline">
                                    <FileDown className="mr-1 h-3 w-3" /> Exportar
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Formato</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => download(`reel-${selected.shortcode || selected.id}.txt`, selected.transcript ?? "")}>
                                    <Download className="mr-2 h-3 w-3" /> Texto (.txt)
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => download(`reel-${selected.shortcode || selected.id}.srt`, buildSrt(selected.words ?? []), "application/x-subrip")}>
                                    <Download className="mr-2 h-3 w-3" /> Legenda (.srt)
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => download(`reel-${selected.shortcode || selected.id}.vtt`, buildVtt(selected.words ?? []), "text/vtt")}>
                                    <Download className="mr-2 h-3 w-3" /> WebVTT (.vtt)
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => download(`reel-${selected.shortcode || selected.id}.json`, JSON.stringify({ transcript: selected.transcript, words: selected.words, audio_events: selected.audio_events }, null, 2), "application/json")}>
                                    <Download className="mr-2 h-3 w-3" /> JSON (.json)
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                          {editMode ? (
                            <Textarea
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              rows={14}
                              className="font-mono text-sm"
                            />
                          ) : (
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                              {highlightText(selected.transcript ?? "", transcriptSearch)}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* TIMESTAMPS */}
                    <TabsContent value="timestamps" className="mt-3">
                      <Card className="bg-card/60">
                        <CardContent className="p-4">
                          <p className="mb-2 text-xs text-muted-foreground">
                            Clique numa palavra pra pular o vídeo pro trecho.
                          </p>
                          <ScrollArea className="h-[420px] pr-3">
                            <div className="space-y-1 font-mono text-xs leading-relaxed">
                              {(selected.words ?? []).map((w: any, i: number) => (
                                <button
                                  key={i}
                                  onClick={() => seekTo(w.start)}
                                  className="inline-block rounded px-0.5 transition-colors hover:bg-primary/20"
                                  title={`${fmt(w.start)} - ${fmt(w.end)}`}
                                >
                                  <span className="text-primary/70">[{fmt(w.start)}]</span>{" "}
                                  <span className="text-foreground">{w.text}</span>{" "}
                                </button>
                              ))}
                            </div>
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* TRANSLATE */}
                    <TabsContent value="translate" className="mt-3">
                      <Card className="bg-card/60">
                        <CardContent className="space-y-3 p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <Languages className="h-4 w-4 text-primary" />
                            <span className="text-sm">Traduzir para:</span>
                            {(["pt", "en", "es"] as const).map((lang) => (
                              <Button
                                key={lang}
                                size="sm"
                                variant="outline"
                                onClick={() => translateM.mutate(lang)}
                                disabled={translateM.isPending}
                              >
                                {translateM.isPending && translateM.variables === lang && (
                                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                )}
                                {lang.toUpperCase()}
                              </Button>
                            ))}
                            {translation && (
                              <Button size="sm" variant="ghost" onClick={() => copy(translation, "Tradução copiada")}>
                                <Copy className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          {translation ? (
                            <p className="whitespace-pre-wrap rounded-md border border-border/50 bg-muted/30 p-3 text-sm">
                              {translation}
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              Escolha um idioma acima.
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* REPURPOSE */}
                    <TabsContent value="repurpose" className="mt-3 space-y-3">
                      <Card className="bg-card/60">
                        <CardContent className="space-y-3 p-4">
                          <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                            <div>
                              <label className="text-xs text-muted-foreground">Tom</label>
                              <Select value={tone} onValueChange={setTone}>
                                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="viral, direto">Viral / direto</SelectItem>
                                  <SelectItem value="educativo">Educativo</SelectItem>
                                  <SelectItem value="bem-humorado">Bem-humorado</SelectItem>
                                  <SelectItem value="emocional">Emocional</SelectItem>
                                  <SelectItem value="polêmico">Polêmico</SelectItem>
                                  <SelectItem value="storytelling">Storytelling</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">Nicho</label>
                              <Input value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="ex: perfumaria, fitness…" className="h-9" />
                            </div>
                            <div className="flex items-end">
                              <Button onClick={() => regenM.mutate()} disabled={regenM.isPending} className="w-full md:w-auto">
                                {regenM.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Wand2 className="mr-1 h-4 w-4" />}
                                Gerar de novo
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {selected.ai_repurpose ? (
                        <div className="grid gap-3 md:grid-cols-2">
                          <RepurposeBlock title="Resumo" content={selected.ai_repurpose.summary} onCopy={copy} />
                          <RepurposeBlock title="Legenda nova" content={selected.ai_repurpose.caption} onCopy={copy} />
                          <RepurposeBlock
                            title="5 Ganchos virais"
                            content={selected.ai_repurpose.hooks}
                            onCopy={copy}
                            onItemAction={{ label: "Salvar", icon: <BookmarkPlus className="h-3 w-3" />, fn: sendHookToBank }}
                          />
                          <RepurposeBlock title="Roteiro Shorts" content={selected.ai_repurpose.shorts_script} onCopy={copy} />
                          <RepurposeBlock
                            title="Slides de carrossel"
                            content={selected.ai_repurpose.carousel_slides}
                            onCopy={copy}
                            extraAction={{
                              label: "Abrir no Carrossel",
                              icon: <LayoutGrid className="h-3 w-3" />,
                              fn: () => {
                                const slides = selected.ai_repurpose.carousel_slides;
                                if (Array.isArray(slides)) {
                                  try {
                                    sessionStorage.setItem("carousel-seed", JSON.stringify({
                                      topic: selected.transcript?.slice(0, 80) ?? "",
                                      slides,
                                    }));
                                  } catch {}
                                }
                                navigate({ to: "/carrossel" });
                              },
                            }}
                          />
                          <RepurposeBlock title="Hashtags" content={selected.ai_repurpose.hashtags} onCopy={copy} />
                        </div>
                      ) : (
                        <Card className="bg-card/40">
                          <CardContent className="p-6 text-sm text-muted-foreground">
                            Sugestões da IA indisponíveis. Clique em "Gerar de novo" acima.
                          </CardContent>
                        </Card>
                      )}
                    </TabsContent>
                  </Tabs>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RepurposeBlock({
  title,
  content,
  onCopy,
  onItemAction,
  extraAction,
}: {
  title: string;
  content: any;
  onCopy: (t: string, label?: string) => void;
  onItemAction?: { label: string; icon: React.ReactNode; fn: (item: string) => void | Promise<void> };
  extraAction?: { label: string; icon: React.ReactNode; fn: () => void };
}) {
  if (!content) return null;
  const text = Array.isArray(content) ? content.map((c, i) => `${i + 1}. ${c}`).join("\n") : String(content);
  return (
    <Card className="bg-card/60">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
        <div className="flex items-center gap-1">
          {extraAction && (
            <Button size="sm" variant="ghost" onClick={extraAction.fn} title={extraAction.label}>
              {extraAction.icon}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => onCopy(text, `${title} copiado`)}>
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {Array.isArray(content) ? (
          <ul className="space-y-1 text-sm">
            {content.map((c, i) => (
              <li key={i} className="flex items-start gap-2 rounded bg-muted/30 px-2 py-1 text-foreground">
                <span className="flex-1">{c}</span>
                <div className="flex shrink-0 gap-1">
                  {onItemAction && (
                    <button
                      onClick={() => onItemAction.fn(String(c))}
                      className="text-muted-foreground transition-colors hover:text-primary"
                      title={onItemAction.label}
                    >
                      {onItemAction.icon}
                    </button>
                  )}
                  <button
                    onClick={() => onCopy(String(c), "Copiado")}
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="whitespace-pre-wrap text-sm text-foreground">{text}</p>
        )}
      </CardContent>
    </Card>
  );
}
