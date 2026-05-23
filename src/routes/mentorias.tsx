import { createFileRoute } from "@tanstack/react-router";
import { DashboardHeader } from "@/components/dashboard/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Video, Play, ExternalLink, Lightbulb, TrendingUp, Users, Loader2, Search,
  Star, Check, Clock, Share2, Sparkles, CalendarPlus, BookmarkPlus, RefreshCw,
  ListPlus, Eye, Flame, X,
} from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { listMentorshipVideos, syncMentorshipVideos, type MentorshipVideoRow } from "@/lib/mentorship-videos.functions";
import {
  listMentorshipUserStates, updateMentorshipUserState,
  listMentorshipPlaylists, upsertMentorshipPlaylist, deleteMentorshipPlaylist,
  summarizeMentorshipVideo, recommendMentorshipVideos,
  type UserStateRow, type PlaylistRow,
} from "@/lib/mentorship-user.functions";
import { upsertViralHook } from "@/lib/hooks.functions";
import { upsertCalendarEntry } from "@/lib/calendar.functions";
import { useIsCeo } from "@/hooks/use-is-ceo";
import { useAuthStore } from "@/lib/auth-store";

export const Route = createFileRoute("/mentorias")({
  component: MentoriasPage,
  head: () => ({
    meta: [
      { title: "Mentorias Estratégicas — SHEY N8N" },
      { name: "description", content: "Biblioteca de vídeos com IA: resumos, trilhas, ganchos e agendamento integrado." },
    ],
  }),
});

const CATEGORIES = ["Todos", "Algoritmo", "Estratégia", "Configuração", "Nicho: Estética", "Nicho: Marketing", "Nicho: Vendas"];

type DisplayVideo = {
  id: string;
  videoIdYt: string;
  title: string;
  description: string;
  category: string;
  publishedAt: string | null;
  publishedYear: string;
  thumbnail: string;
  videoUrl: string;
  watchUrl: string;
  channel: string;
  duration: string | null;
};

function parseDuration(iso: string | null): string | null {
  if (!iso) return null;
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return null;
  const h = parseInt(m[1] ?? "0");
  const mi = parseInt(m[2] ?? "0");
  const s = parseInt(m[3] ?? "0");
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(mi)}:${pad(s)}` : `${mi}:${pad(s)}`;
}

function mapVideo(v: MentorshipVideoRow): DisplayVideo {
  return {
    id: v.id,
    videoIdYt: v.video_id,
    title: v.title,
    description: v.description ?? "",
    category: v.category,
    publishedAt: v.published_at,
    publishedYear: v.published_at ? new Date(v.published_at).getFullYear().toString() : "Recente",
    thumbnail: v.thumbnail_url ?? `https://i.ytimg.com/vi/${v.video_id}/hqdefault.jpg`,
    videoUrl: `https://www.youtube-nocookie.com/embed/${v.video_id}?rel=0&modestbranding=1&playsinline=1`,
    watchUrl: `https://www.youtube.com/watch?v=${v.video_id}`,
    channel: v.channel_title ?? "YouTube",
    duration: parseDuration(v.duration),
  };
}

function MentoriasPage() {
  const isCeo = useIsCeo();
  const user = useAuthStore((s) => s.user);
  const onboarding = useAuthStore((s) => (user ? s.onboardingByUser[user.id] : null));
  const niche = onboarding?.niche ?? "";

  const qc = useQueryClient();
  const fetchVideos = useServerFn(listMentorshipVideos);
  const fetchStates = useServerFn(listMentorshipUserStates);
  const fetchPlaylists = useServerFn(listMentorshipPlaylists);
  const fetchRecommend = useServerFn(recommendMentorshipVideos);
  const syncFn = useServerFn(syncMentorshipVideos);

  const { data: vdata, isLoading } = useQuery({
    queryKey: ["mentorship-videos"],
    queryFn: () => fetchVideos(),
    staleTime: 1000 * 60 * 10,
  });
  const { data: sdata } = useQuery({
    queryKey: ["mentorship-states"],
    queryFn: () => fetchStates(),
    staleTime: 1000 * 60,
  });
  const { data: pdata } = useQuery({
    queryKey: ["mentorship-playlists"],
    queryFn: () => fetchPlaylists(),
    staleTime: 1000 * 60,
  });
  const { data: rdata } = useQuery({
    queryKey: ["mentorship-recommend", niche],
    queryFn: () => fetchRecommend({ data: { niche } }),
    staleTime: 1000 * 60 * 5,
  });

  const allVideos = useMemo(() => (vdata?.videos ?? []).map(mapVideo), [vdata]);
  const stateByVideo = useMemo(() => {
    const map = new Map<string, UserStateRow>();
    for (const s of (sdata?.states ?? []) as UserStateRow[]) map.set(s.video_id, s);
    return map;
  }, [sdata]);

  const [tab, setTab] = useState("biblioteca");
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [search, setSearch] = useState("");
  const [channel, setChannel] = useState("Todos");
  const [sort, setSort] = useState<"recent" | "oldest" | "az">("recent");
  const [selectedVideo, setSelectedVideo] = useState<DisplayVideo | null>(null);

  const channels = useMemo(() => {
    const set = new Set<string>();
    for (const v of allVideos) set.add(v.channel);
    return ["Todos", ...Array.from(set).sort()];
  }, [allVideos]);

  const filteredVideos = useMemo(() => {
    let list = allVideos;
    if (activeCategory !== "Todos") list = list.filter((v) => v.category === activeCategory);
    if (channel !== "Todos") list = list.filter((v) => v.channel === channel);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((v) => v.title.toLowerCase().includes(q) || v.description.toLowerCase().includes(q));
    }
    list = [...list].sort((a, b) => {
      if (sort === "az") return a.title.localeCompare(b.title);
      const ad = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const bd = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return sort === "recent" ? bd - ad : ad - bd;
    });
    return list;
  }, [allVideos, activeCategory, channel, search, sort]);

  // categoria stats (progresso)
  const categoryProgress = useMemo(() => {
    const map: Record<string, { total: number; watched: number }> = {};
    for (const v of allVideos) {
      const cat = v.category;
      map[cat] ??= { total: 0, watched: 0 };
      map[cat].total += 1;
      if (stateByVideo.get(v.videoIdYt)?.is_watched) map[cat].watched += 1;
    }
    return map;
  }, [allVideos, stateByVideo]);

  const continueWatching = useMemo(
    () =>
      allVideos
        .map((v) => ({ v, s: stateByVideo.get(v.videoIdYt) }))
        .filter((x) => x.s && (x.s.progress_seconds ?? 0) > 5 && !x.s.is_watched)
        .sort((a, b) => new Date(b.s!.last_watched_at ?? 0).getTime() - new Date(a.s!.last_watched_at ?? 0).getTime())
        .slice(0, 8)
        .map((x) => x.v),
    [allVideos, stateByVideo],
  );

  const mostWatched = useMemo(
    () =>
      allVideos
        .map((v) => ({ v, views: stateByVideo.get(v.videoIdYt)?.view_count ?? 0 }))
        .filter((x) => x.views > 0)
        .sort((a, b) => b.views - a.views)
        .slice(0, 6)
        .map((x) => x.v),
    [allVideos, stateByVideo],
  );

  const recommended = useMemo(() => {
    const ids = new Set(rdata?.video_ids ?? []);
    return allVideos.filter((v) => ids.has(v.videoIdYt));
  }, [allVideos, rdata]);

  const favorites = useMemo(
    () => allVideos.filter((v) => stateByVideo.get(v.videoIdYt)?.is_favorite),
    [allVideos, stateByVideo],
  );

  const syncMut = useMutation({
    mutationFn: () => syncFn(),
    onSuccess: (r: any) => {
      toast.success(`Sincronizado: ${r?.inserted ?? 0} novos`);
      qc.invalidateQueries({ queryKey: ["mentorship-videos"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao sincronizar"),
  });

  function openVideo(v: DisplayVideo) {
    setSelectedVideo(v);
  }

  return (
    <div className="min-h-screen bg-[#080808] pb-12">
      <DashboardHeader />

      <div className="px-4 md:px-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Video className="w-5 h-5 text-primary" />
              Central de Mentorias
            </h2>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Biblioteca com IA: resumo, trilhas, ganchos extraídos e agendamento direto no calendário.
            </p>
          </div>
          {isCeo && (
            <Button
              size="sm"
              variant="outline"
              className="border-white/10"
              onClick={() => syncMut.mutate()}
              disabled={syncMut.isPending}
            >
              {syncMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Sincronizar biblioteca
            </Button>
          )}
        </div>

        {/* Continuar assistindo */}
        {continueWatching.length > 0 && (
          <section>
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Continuar assistindo
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {continueWatching.map((v) => {
                const s = stateByVideo.get(v.videoIdYt);
                const pct = s ? Math.min(100, Math.round(((s.progress_seconds ?? 0) / 300) * 100)) : 0;
                return (
                  <div
                    key={v.id}
                    onClick={() => openVideo(v)}
                    className="min-w-[240px] cursor-pointer group"
                  >
                    <div className="relative aspect-video rounded-md overflow-hidden border border-white/10">
                      <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover" />
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
                        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <p className="text-xs text-white mt-2 line-clamp-2 group-hover:text-primary">{v.title}</p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="biblioteca">Biblioteca</TabsTrigger>
            <TabsTrigger value="favoritos">⭐ Favoritos ({favorites.length})</TabsTrigger>
            <TabsTrigger value="recomendados">Para você</TabsTrigger>
            <TabsTrigger value="trilhas">Trilhas</TabsTrigger>
          </TabsList>

          <TabsContent value="biblioteca" className="space-y-6 mt-4">
            {/* Filtros */}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar vídeo..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-white/5 border-white/10"
                />
              </div>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger className="w-full md:w-[200px] bg-white/5 border-white/10">
                  <SelectValue placeholder="Canal" />
                </SelectTrigger>
                <SelectContent>
                  {channels.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sort} onValueChange={(v) => setSort(v as any)}>
                <SelectTrigger className="w-full md:w-[180px] bg-white/5 border-white/10">
                  <SelectValue placeholder="Ordem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Mais recentes</SelectItem>
                  <SelectItem value="oldest">Mais antigos</SelectItem>
                  <SelectItem value="az">A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x">
              {CATEGORIES.map((cat) => {
                const prog = categoryProgress[cat];
                return (
                  <Button
                    key={cat}
                    variant={activeCategory === cat ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveCategory(cat)}
                    className={`rounded-full whitespace-nowrap px-5 snap-start transition-all ${
                      activeCategory === cat
                        ? "bg-primary text-primary-foreground glow-primary-sm"
                        : "border-white/10 hover:bg-white/5 text-muted-foreground"
                    }`}
                  >
                    {cat}
                    {prog && prog.total > 0 && cat !== "Todos" && (
                      <span className="ml-2 text-[10px] opacity-70">{prog.watched}/{prog.total}</span>
                    )}
                  </Button>
                );
              })}
            </div>

            {isLoading ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-video rounded-xl" />
                ))}
              </div>
            ) : filteredVideos.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground text-sm">
                Nenhum vídeo encontrado com os filtros atuais.
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredVideos.map((video) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    state={stateByVideo.get(video.videoIdYt) ?? null}
                    onWatch={() => openVideo(video)}
                  />
                ))}
              </div>
            )}

            {mostWatched.length > 0 && (
              <section className="pt-6">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-500" /> Mais assistidos por você
                </h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {mostWatched.map((v) => (
                    <VideoCard
                      key={v.id}
                      video={v}
                      state={stateByVideo.get(v.videoIdYt) ?? null}
                      onWatch={() => openVideo(v)}
                    />
                  ))}
                </div>
              </section>
            )}
          </TabsContent>

          <TabsContent value="favoritos" className="mt-4">
            {favorites.length === 0 ? (
              <EmptyHint text="Marque vídeos como favoritos para encontrar rápido depois." />
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {favorites.map((v) => (
                  <VideoCard
                    key={v.id}
                    video={v}
                    state={stateByVideo.get(v.videoIdYt) ?? null}
                    onWatch={() => openVideo(v)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="recomendados" className="mt-4">
            {!niche ? (
              <EmptyHint text="Complete o onboarding com seu nicho para receber recomendações personalizadas." />
            ) : recommended.length === 0 ? (
              <EmptyHint text={`Sem recomendações para o nicho "${niche}" ainda.`} />
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {recommended.map((v) => (
                  <VideoCard
                    key={v.id}
                    video={v}
                    state={stateByVideo.get(v.videoIdYt) ?? null}
                    onWatch={() => openVideo(v)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="trilhas" className="mt-4">
            <PlaylistsTab
              playlists={(pdata?.playlists ?? []) as PlaylistRow[]}
              videos={allVideos}
              onOpen={openVideo}
            />
          </TabsContent>
        </Tabs>

        <VideoDialog
          video={selectedVideo}
          state={selectedVideo ? stateByVideo.get(selectedVideo.videoIdYt) ?? null : null}
          niche={niche}
          playlists={(pdata?.playlists ?? []) as PlaylistRow[]}
          onClose={() => setSelectedVideo(null)}
        />

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <InsightBox
            icon={<Lightbulb className="w-5 h-5 text-yellow-500" />}
            title="SHEY Tip"
            description="Assista a vídeos de outros nichos para roubar ganchos criativos que ninguém usa no seu setor."
          />
          <InsightBox
            icon={<TrendingUp className="w-5 h-5 text-emerald-500" />}
            title="IA integrada"
            description="Gere resumo, salve ganchos e agende a aplicação direto no calendário em 1 clique."
          />
          <InsightBox
            icon={<Users className="w-5 h-5 text-blue-500" />}
            title="Trilhas personalizadas"
            description="Crie sequências de vídeos por objetivo (vendas, autoridade, captação) e acompanhe progresso."
          />
        </div>
      </div>
    </div>
  );
}

function VideoCard({
  video, state, onWatch,
}: { video: DisplayVideo; state: UserStateRow | null; onWatch: () => void }) {
  return (
    <Card
      onClick={onWatch}
      className="bg-card/40 border-white/5 overflow-hidden group hover:border-primary/30 transition-all hover:glow-primary-sm cursor-pointer"
    >
      <div className="relative aspect-video overflow-hidden">
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center glow-primary">
            <Play className="w-6 h-6 text-primary-foreground fill-primary-foreground" />
          </div>
        </div>
        <div className="absolute top-2 left-2">
          <Badge className="bg-primary/90 text-[9px] uppercase tracking-tighter">{video.category}</Badge>
        </div>
        <div className="absolute top-2 right-2 flex gap-1">
          {state?.is_favorite && (
            <Badge className="bg-yellow-500/90 text-[9px]"><Star className="w-3 h-3 fill-current" /></Badge>
          )}
          {state?.is_watched && (
            <Badge className="bg-emerald-600/90 text-[9px]"><Check className="w-3 h-3" /></Badge>
          )}
        </div>
        {video.duration && (
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded">
            {video.duration}
          </div>
        )}
      </div>
      <CardHeader className="p-4 pb-0">
        <CardTitle className="text-base line-clamp-2 group-hover:text-primary transition-colors">{video.title}</CardTitle>
        <CardDescription className="text-xs line-clamp-2 mt-1 min-h-[32px]">
          {video.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-3 flex items-center justify-between border-t border-white/5 mt-3">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1 truncate">
          <Users className="w-3 h-3" /> {video.publishedYear} • {video.channel}
        </div>
        {state && state.view_count > 0 && (
          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Eye className="w-3 h-3" /> {state.view_count}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function VideoDialog({
  video, state, niche, playlists, onClose,
}: {
  video: DisplayVideo | null;
  state: UserStateRow | null;
  niche: string;
  playlists: PlaylistRow[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const updateState = useServerFn(updateMentorshipUserState);
  const summarize = useServerFn(summarizeMentorshipVideo);
  const saveHook = useServerFn(upsertViralHook);
  const saveCalendar = useServerFn(upsertCalendarEntry);
  const updatePlaylist = useServerFn(upsertMentorshipPlaylist);

  const [notes, setNotes] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [summary, setSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (video) {
      setNotes(state?.notes ?? "");
      setSummary(null);
      // increment view
      updateState({ data: { video_id: video.videoIdYt, increment_views: true } })
        .then(() => qc.invalidateQueries({ queryKey: ["mentorship-states"] }))
        .catch(() => {});
    }
  }, [video?.id]);

  if (!video) return null;
  const tags = state?.tags ?? [];

  async function mutate(patch: {
    video_id: string;
    is_favorite?: boolean;
    is_watched?: boolean;
    progress_seconds?: number;
    notes?: string | null;
    tags?: string[];
    increment_views?: boolean;
  }) {
    await updateState({ data: patch });
    qc.invalidateQueries({ queryKey: ["mentorship-states"] });
  }


  async function handleSummarize() {
    setSummarizing(true);
    try {
      const r = await summarize({
        data: { video_id: video!.videoIdYt, title: video!.title, description: video!.description, niche },
      });
      if (r.ok) setSummary(r.summary);
      else toast.error(r.error ?? "Erro ao gerar resumo");
    } finally {
      setSummarizing(false);
    }
  }

  async function handleSaveHook() {
    const hookText = video!.title.length > 100 ? video!.title.slice(0, 100) : video!.title;
    const r = await saveHook({
      data: {
        hook: hookText,
        niche: niche || "geral",
        format: "reel",
        tags: ["mentoria"],
        performance: "medio",
        language: "pt-br",
        source: `mentoria:${video!.videoIdYt}`,
      },
    });
    if (r.ok) toast.success("Gancho salvo em Ganchos");
    else toast.error(r.error ?? "Erro ao salvar");
  }

  async function handleSchedule() {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(9, 0, 0, 0);
    const r = await saveCalendar({
      data: {
        title: `Aplicar: ${video!.title.slice(0, 60)}`,
        content_type: "reel",
        platform: "instagram",
        scheduled_at: date.toISOString(),
        status: "rascunho",
        notes: `Inspirado em: ${video!.watchUrl}`,
        color: "#8b5cf6",
        recurrence: "none",
        checklist: [],
        attachments: [{ url: video!.watchUrl, label: video!.title }],
        hook: video!.title.slice(0, 100),
        source: `mentoria:${video!.videoIdYt}`,
      } as any,
    });
    if ((r as any).ok) toast.success("Agendado no Calendário (amanhã 9h)");
    else toast.error((r as any).error ?? "Erro ao agendar");
  }

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(video!.watchUrl);
      toast.success("Link copiado");
    } catch {
      toast.error("Não foi possível copiar");
    }
  }

  function addTag() {
    const t = tagInput.trim();
    if (!t) return;
    mutate({ video_id: video!.videoIdYt, tags: Array.from(new Set([...tags, t])).slice(0, 20) });
    setTagInput("");
  }
  function removeTag(t: string) {
    mutate({ video_id: video!.videoIdYt, tags: tags.filter((x) => x !== t) });
  }

  async function addToPlaylist(p: PlaylistRow) {
    if (p.video_ids.includes(video!.videoIdYt)) {
      toast.info("Já está nesta trilha");
      return;
    }
    const r = await updatePlaylist({
      data: { id: p.id, name: p.name, description: p.description, color: p.color ?? "#8b5cf6", video_ids: [...p.video_ids, video!.videoIdYt] },
    });
    if (r.ok) {
      toast.success(`Adicionado a "${p.name}"`);
      qc.invalidateQueries({ queryKey: ["mentorship-playlists"] });
    }
  }

  return (
    <Dialog open={!!video} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl bg-card border-white/10 p-0 overflow-hidden max-h-[95vh] overflow-y-auto">
        <div className="aspect-video w-full bg-black relative">
          <iframe
            ref={iframeRef}
            src={video.videoUrl}
            className="absolute inset-0 w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={video.title}
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <Badge className="bg-primary/90 text-[10px] uppercase">{video.category}</Badge>
                {video.duration && <Badge variant="outline" className="text-[10px] border-white/10">{video.duration}</Badge>}
                <span className="text-xs text-muted-foreground">{video.publishedYear} • {video.channel}</span>
              </div>
              <DialogTitle className="text-lg font-bold text-white">{video.title}</DialogTitle>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={state?.is_favorite ? "default" : "outline"}
                className={state?.is_favorite ? "bg-yellow-500 hover:bg-yellow-500/90 text-black" : "border-white/10"}
                onClick={() => mutate({ video_id: video.videoIdYt, is_favorite: !state?.is_favorite })}
              >
                <Star className={`w-4 h-4 ${state?.is_favorite ? "fill-current" : ""}`} />
                Favorito
              </Button>
              <Button
                size="sm"
                variant={state?.is_watched ? "default" : "outline"}
                className={state?.is_watched ? "bg-emerald-600 hover:bg-emerald-600/90" : "border-white/10"}
                onClick={() => mutate({ video_id: video.videoIdYt, is_watched: !state?.is_watched })}
              >
                <Check className="w-4 h-4" /> {state?.is_watched ? "Assistido" : "Marcar visto"}
              </Button>
              <Button size="sm" variant="outline" className="border-white/10" onClick={handleShare}>
                <Share2 className="w-4 h-4" /> Compartilhar
              </Button>
            </div>
          </div>

          <DialogDescription className="text-sm text-muted-foreground line-clamp-4">
            {video.description}
          </DialogDescription>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={handleSummarize} disabled={summarizing} className="bg-primary">
              {summarizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Resumir com IA
            </Button>
            <Button size="sm" variant="outline" className="border-white/10" onClick={handleSaveHook}>
              <BookmarkPlus className="w-4 h-4" /> Salvar gancho
            </Button>
            <Button size="sm" variant="outline" className="border-white/10" onClick={handleSchedule}>
              <CalendarPlus className="w-4 h-4" /> Agendar aplicação
            </Button>
            {playlists.length > 0 && (
              <Select onValueChange={(id) => {
                const p = playlists.find((x) => x.id === id);
                if (p) addToPlaylist(p);
              }}>
                <SelectTrigger className="w-[200px] h-9 bg-white/5 border-white/10 text-xs">
                  <ListPlus className="w-4 h-4" />
                  <SelectValue placeholder="Add à trilha..." />
                </SelectTrigger>
                <SelectContent>
                  {playlists.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {summary && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <pre className="text-xs text-white whitespace-pre-wrap font-sans leading-relaxed">{summary}</pre>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            <label className="text-xs font-semibold text-white uppercase tracking-wide">Suas anotações</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => {
                if (notes !== (state?.notes ?? "")) {
                  mutate({ video_id: video.videoIdYt, notes });
                  toast.success("Anotações salvas");
                }
              }}
              rows={3}
              placeholder="O que você quer aplicar deste vídeo?"
              className="bg-white/5 border-white/10 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-white uppercase tracking-wide">Tags</label>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <Badge key={t} variant="outline" className="border-white/10 gap-1">
                  {t}
                  <button onClick={() => removeTag(t)}><X className="w-3 h-3" /></button>
                </Badge>
              ))}
              <div className="flex gap-1">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                  placeholder="Nova tag"
                  className="h-7 w-32 text-xs bg-white/5 border-white/10"
                />
                <Button size="sm" variant="outline" className="h-7 border-white/10" onClick={addTag}>+</Button>
              </div>
            </div>
          </div>

          <a
            href={video.watchUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline"
          >
            Abrir no YouTube <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PlaylistsTab({
  playlists, videos, onOpen,
}: { playlists: PlaylistRow[]; videos: DisplayVideo[]; onOpen: (v: DisplayVideo) => void }) {
  const qc = useQueryClient();
  const upsert = useServerFn(upsertMentorshipPlaylist);
  const del = useServerFn(deleteMentorshipPlaylist);
  const [name, setName] = useState("");

  async function createPl() {
    if (!name.trim()) return;
    const r = await upsert({ data: { name: name.trim(), video_ids: [] } });
    if (r.ok) {
      setName("");
      qc.invalidateQueries({ queryKey: ["mentorship-playlists"] });
      toast.success("Trilha criada");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 max-w-md">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome da trilha (ex: Trilha de vendas)"
          className="bg-white/5 border-white/10"
        />
        <Button onClick={createPl} className="bg-primary">Criar</Button>
      </div>

      {playlists.length === 0 ? (
        <EmptyHint text="Crie trilhas (ex: Iniciantes, Vendas, Captação) para organizar sua jornada." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {playlists.map((p) => {
            const items = videos.filter((v) => p.video_ids.includes(v.videoIdYt));
            return (
              <Card key={p.id} className="bg-card/40 border-white/10">
                <CardHeader className="p-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base text-white">{p.name}</CardTitle>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={async () => {
                        if (confirm(`Excluir trilha "${p.name}"?`)) {
                          await del({ data: { id: p.id } });
                          qc.invalidateQueries({ queryKey: ["mentorship-playlists"] });
                        }
                      }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                  <CardDescription className="text-xs">{items.length} vídeo(s)</CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-2">
                  {items.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Vazia. Adicione vídeos pela tela do vídeo.</p>
                  ) : (
                    items.slice(0, 5).map((v) => (
                      <button
                        key={v.id}
                        onClick={() => onOpen(v)}
                        className="w-full flex items-center gap-2 text-left p-2 rounded-md hover:bg-white/5 transition-colors"
                      >
                        <img src={v.thumbnail} className="w-16 aspect-video object-cover rounded" alt="" />
                        <span className="text-xs text-white line-clamp-2 flex-1">{v.title}</span>
                      </button>
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <div className="text-center py-16 text-muted-foreground text-sm">{text}</div>;
}

function InsightBox({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-5 rounded-xl border border-white/5 bg-white/5 space-y-2">
      <div className="flex items-center gap-2">
        {icon}
        <h4 className="text-sm font-bold text-white uppercase tracking-wider">{title}</h4>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
