import React, { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Radar, Eye, Heart, MessageCircle, TrendingUp, Flame, Sparkles, Copy, RefreshCw, Hash, Music2, Layout, Trophy, Loader2, Send, Bot, Zap, List, X, Check, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, RadialBarChart, RadialBar, PolarAngleAxis,
} from "recharts";
import {
  getViralVideos, getViralHooks, getReelIdeas, getTrends, getTrendSeries, getViralScoreReport,
} from "@/lib/viral-mock-data";
import { useServerFn } from "@tanstack/react-start";
import { sheyAiChat } from "@/lib/sheyai.functions";
import { fetchRealViralVideos } from "@/lib/apify-viral.functions";
import { generateReelIdeas, generateTrends, generateScoreReport } from "@/lib/viral-generators.functions";
import { AgentStatusBubble } from "@/components/viralmind/AgentStatusBubble";

const NICHOS = [
  "Perfumes Árabes", "Perfumaria", "Moda Feminina", "Moda Masculina", "Beleza", "Maquiagem", "Skincare",
  "Fitness", "Emagrecimento", "Receitas", "Gastronomia", "Marketing Digital", "Empreendedorismo",
  "Finanças", "Investimentos", "Tecnologia", "IA", "Automação", "Viagens", "Pets", "Decoração",
  "Casamento", "Maternidade", "Educação", "Idiomas", "Música", "Humor", "Lifestyle",
];

const NICHE_STORAGE_KEY = "shey:radar:niche";

const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : String(n);

const downloadViaProxy = async (href: string, filename: string) => {
  const res = await fetch(href, { credentials: "same-origin" });
  if (!res.ok) throw new Error("Falha ao baixar");
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
};

const Panel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn("rounded-2xl border border-[#2A2A2A] bg-[#0F0F0F]/80 p-5 md:p-6 shadow-[0_0_30px_rgb(var(--primary-rgb) / 0.06)]", className)}>
    {children}
  </div>
);

const SectionTitle: React.FC<{ icon: React.ReactNode; title: string; subtitle?: string }> = ({ icon, title, subtitle }) => (
  <div className="flex items-start gap-3 mb-5">
    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-black shadow-[0_0_20px_rgb(var(--primary-rgb) / 0.4)]">
      {icon}
    </div>
    <div>
      <h3 className="font-rajdhani text-xl md:text-2xl font-bold text-white uppercase tracking-wider">{title}</h3>
      {subtitle && <p className="text-[#888] text-xs md:text-sm mt-0.5">{subtitle}</p>}
    </div>
  </div>
);

// ─────────── WORKFLOW 01 — RADAR VIRAL ───────────
export const RadarViralPanel: React.FC<{ niche: string }> = ({ niche: propNiche }) => {
  // Nicho fixo (persistido em localStorage) sobrepõe o nicho vindo do perfil
  const [nicheOverride, setNicheOverride] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(NICHE_STORAGE_KEY);
  });
  const niche = nicheOverride || propNiche;

  const [videos, setVideos] = useState(() => getViralVideos(niche));
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<"mock" | "tiktok">("mock");
  const [nichoOpen, setNichoOpen] = useState(false);
  const [playing, setPlaying] = useState<any | null>(null);
  const fetchReal = useServerFn(fetchRealViralVideos);

  const refresh = () => { setVideos(getViralVideos(niche + Math.random())); setSource("mock"); toast.success("Radar atualizado (mock)"); };

  const loadReal = React.useCallback(async (silent = false) => {
    setLoading(true);
    const t = silent ? null : toast.loading("Buscando vídeos virais reais do TikTok...");
    try {
      const res = await fetchReal({ data: { niche, limit: 60 } });
      if (res.source === "tiktok" && res.videos.length > 0) {
        setVideos(res.videos as any);
        setSource("tiktok");
        if (t) toast.success("Radar atualizado", { id: t });
      } else {
        if (t) toast.error(res.error || "Sem resultados", { id: t });
      }
    } catch (e: any) {
      if (t) toast.error(e?.message || "Falha ao buscar TikTok", { id: t });
    } finally {
      setLoading(false);
    }
  }, [fetchReal, niche]);

  // Auto-busca ao montar / trocar nicho + refresh silencioso a cada 2h
  React.useEffect(() => {
    loadReal(true);
    const id = setInterval(() => loadReal(true), 2 * 60 * 60 * 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [niche]);

  const chooseNicho = (n: string) => {
    setNicheOverride(n);
    try { localStorage.setItem(NICHE_STORAGE_KEY, n); } catch {}
    setNichoOpen(false);
    toast.success(`Nicho fixado: ${n}`);
  };

  // Extrai o shortcode do post do Instagram pra montar o embed
  const getEmbedUrl = (url?: string) => {
    if (!url) return null;
    const m = url.match(/instagram\.com\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
    return m ? `https://www.instagram.com/p/${m[1]}/embed` : null;
  };

  return (
    <Panel>
      
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <SectionTitle icon={<Radar className="w-5 h-5" />} title="Radar Viral" subtitle={`Nicho: ${niche} · ${source === "tiktok" ? "DADOS REAIS do TikTok" : "demonstração"}`} />
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => loadReal(false)} disabled={loading} size="sm" className="bg-gradient-to-r from-primary to-primary-glow text-black font-bold hover:opacity-90 gap-2 rounded-full">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            Dados Reais
          </Button>
          <Button onClick={() => setNichoOpen(true)} size="sm" className="bg-gradient-to-r from-primary to-primary-glow text-black font-bold hover:opacity-90 gap-2 rounded-full">
            <List className="w-3.5 h-3.5" /> Nichos
          </Button>
          <Button onClick={refresh} size="sm" variant="outline" className="border-primary bg-transparent text-primary hover:bg-primary/10 gap-2 rounded-full">
            <RefreshCw className="w-3.5 h-3.5" /> Mock
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {videos.map((v: any, i) => (
          <motion.div key={v.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="group rounded-xl overflow-hidden border border-[#2A2A2A] bg-[#0a0a0a] hover:border-primary transition-all">
            <div 
              className="relative aspect-[9/14] overflow-hidden bg-[#111] cursor-pointer"
              onClick={() => {
                if (v.url || v.thumbnail) {
                  setPlaying(v);
                } else {
                  toast.error("Vídeo indisponível");
                }
              }}
            >
              {v.thumbnail ? (() => {
                const isIg = /(cdninstagram\.com|fbcdn\.net|instagram\.com)/i.test(v.thumbnail);
                const initialSrc = v.thumbnail.startsWith('http')
                  ? (isIg ? `/api/public/ig-thumb?url=${encodeURIComponent(v.thumbnail)}` : v.thumbnail)
                  : v.thumbnail;
                return (
                <img 
                  src={initialSrc} 
                  alt={v.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    const step = img.dataset.fallback || "0";
                    if (step === "0") {
                      img.dataset.fallback = "1";
                      img.src = `https://wsrv.nl/?url=${encodeURIComponent(v.thumbnail)}&w=400&h=600&fit=cover&output=jpg`;
                    } else if (step === "1") {
                      img.dataset.fallback = "2";
                      img.src = v.thumbnail;
                    } else {
                      img.dataset.fallback = "3";
                      img.src = "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=600&fit=crop";
                    }
                  }}
                />
                );
              })() : (
                <div className="w-full h-full flex items-center justify-center text-[#333]">
                  <Eye className="w-8 h-8 opacity-20" />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-black shadow-[0_0_20px_rgb(var(--primary-rgb) / 0.6)]">
                  <Zap className="w-6 h-6 fill-current" />
                </div>
              </div>
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 text-[10px] text-white font-mono">{v.format} · {v.duration}</div>
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-primary text-black text-[10px] font-bold flex items-center gap-1">
                <Flame className="w-3 h-3" /> {v.viralScore}
              </div>
              <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black to-transparent">
                <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                  <TrendingUp className="w-3 h-3" /> +{v.growth}% 24h
                </div>
                <div className="h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-primary-glow" style={{ width: `${Math.min(100, v.growth / 4)}%` }} />
                </div>
              </div>
              {(() => {
                const isVideo = !!v.videoUrl;
                const baseName = `shey-${(v.author || '').replace(/^@/, '')}-${v.id}`;
                const fileName = baseName + (isVideo ? '.mp4' : '.jpg');
                const href = isVideo
                  ? `/api/public/ig-video?url=${encodeURIComponent(v.videoUrl!)}&name=${encodeURIComponent(fileName)}`
                  : v.thumbnail
                    ? `/api/public/ig-thumb?url=${encodeURIComponent(v.thumbnail)}&download=${encodeURIComponent(fileName)}`
                    : null;
                if (!href) return null;
                return (
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      const t = toast.loading("Baixando...");
                      try {
                        await downloadViaProxy(href, fileName);
                        toast.success("Download iniciado", { id: t });
                      } catch {
                        toast.error("Não consegui baixar esse vídeo agora", { id: t });
                      }
                    }}
                    className="absolute bottom-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded-md bg-primary text-black text-[10px] font-bold shadow-[0_0_15px_rgb(var(--primary-rgb)/0.5)] hover:opacity-90"
                    title={isVideo ? 'Baixar vídeo' : 'Baixar imagem'}
                  >
                    <Download className="w-3 h-3" /> Baixar
                  </button>
                );
              })()}
            </div>
            <div className="p-2.5">
              <p className="text-[11px] text-white font-semibold line-clamp-2 leading-tight cursor-pointer hover:text-primary" onClick={() => setPlaying(v)}>{v.title}</p>
              <p className="text-[10px] text-[#888] mt-1">{v.author}</p>
              <div className="flex items-center gap-3 mt-1.5 text-[10px] text-[#A0A0A0]">
                <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{fmt(v.views)}</span>
                <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" />{fmt(v.likes)}</span>
                <span className="flex items-center gap-0.5"><MessageCircle className="w-3 h-3" />{fmt(v.comments)}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Modal de seleção de NICHOS */}
      <Dialog open={nichoOpen} onOpenChange={setNichoOpen}>
        <DialogContent className="max-w-2xl bg-[#0a0a0a] border border-primary/40 text-white">
          <DialogHeader>
            <DialogTitle className="font-rajdhani uppercase tracking-widest text-primary flex items-center gap-2">
              <List className="w-5 h-5" /> Escolher Nicho
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-[#888]">O nicho selecionado fica fixo até você alterar. Os vídeos do Instagram são buscados em tempo real para esse nicho.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[55vh] overflow-y-auto pr-1">
            {NICHOS.map((n) => {
              const active = n === niche;
              return (
                <button
                  key={n}
                  onClick={() => chooseNicho(n)}
                  className={cn(
                    "flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all text-left",
                    active
                      ? "border-primary bg-primary/10 text-primary shadow-[0_0_15px_rgb(var(--primary-rgb) / 0.3)]"
                      : "border-[#2A2A2A] bg-[#0F0F0F] text-white hover:border-primary/60 hover:bg-primary/5"
                  )}
                >
                  <span>{n}</span>
                  {active && <Check className="w-3.5 h-3.5" />}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Player interno do vídeo (embed Instagram) */}
      <Dialog open={!!playing} onOpenChange={(o) => !o && setPlaying(null)}>
        <DialogContent className="max-w-md p-0 bg-black border border-primary/40 overflow-hidden">
          {playing && (() => {
            const embed = getEmbedUrl(playing.url);
            return (
              <div className="flex flex-col">
                <div className="flex items-center justify-between p-3 border-b border-primary/20">
                  <div className="min-w-0">
                    <p className="text-xs text-primary font-bold truncate">{playing.author}</p>
                    <p className="text-[10px] text-[#888] truncate">{playing.title}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-primary text-black text-[10px] font-bold flex items-center gap-1 shrink-0">
                    <Flame className="w-3 h-3" /> {playing.viralScore}
                  </span>
                </div>
                <div className="relative w-full bg-black" style={{ aspectRatio: "9/14" }}>
                  {embed ? (
                    <iframe
                      src={embed}
                      title={playing.title}
                      className="absolute inset-0 w-full h-full"
                      allow="encrypted-media; picture-in-picture; web-share; autoplay"
                      allowFullScreen
                      scrolling="no"
                      frameBorder="0"
                    />
                  ) : playing.videoUrl ? (
                    <video
                      src={playing.videoUrl}
                      poster={playing.thumbnail?.startsWith("http") ? `/api/public/ig-thumb?url=${encodeURIComponent(playing.thumbnail)}` : playing.thumbnail}
                      controls
                      autoPlay
                      playsInline
                      className="absolute inset-0 w-full h-full object-contain bg-black"
                    />
                  ) : (
                    <img
                      src={playing.thumbnail?.startsWith("http") ? `/api/public/ig-thumb?url=${encodeURIComponent(playing.thumbnail)}` : playing.thumbnail}
                      alt={playing.title}
                      className="absolute inset-0 w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  )}
                </div>
                <div className="flex items-center justify-between gap-3 p-3 text-[11px] text-[#A0A0A0] border-t border-primary/10">
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{fmt(playing.views)}</span>
                  <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{fmt(playing.likes)}</span>
                  <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{fmt(playing.comments)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 p-3 pt-0">
                  <button
                    onClick={() => {
                      const handle = String(playing.author || "").replace(/^@/, "");
                      if (!handle) { toast.error("Sem @ disponível"); return; }
                      navigator.clipboard.writeText(`@${handle}`);
                      toast.success(`@${handle} copiado — cole no Instagram`);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-primary to-primary-glow text-black text-[11px] font-bold hover:opacity-90 transition"
                  >
                    <Copy className="w-3 h-3" /> Copiar {playing.author}
                  </button>
                  {playing.url && (
                    <a href={playing.url} target="_blank" rel="noreferrer" className="ml-auto text-[11px] text-primary hover:underline">
                      Abrir post ↗
                    </a>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </Panel>
  );
};

// ─────────── WORKFLOW 02 — HOOKS (Supabase + fallback) ───────────
export const HooksPanel: React.FC<{ niche: string }> = ({ niche }) => {
  const fallback = useMemo(() => getViralHooks(niche), [niche]);
  const [hooks, setHooks] = useState<any[]>(fallback);
  const [source, setSource] = useState<"mock" | "supabase">("mock");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data, error } = await supabase
          .from("viral_hooks")
          .select("id, hook, performance, tags, niche")
          .or(`niche.eq.${niche},niche.eq.geral`)
          .order("uses", { ascending: false })
          .limit(20);
        if (!alive) return;
        if (!error && data && data.length > 0) {
          setHooks(
            data.map((h: any) => ({
              id: h.id,
              text: h.hook,
              retentionScore: h.performance === "alto" ? 92 : h.performance === "baixo" ? 55 : 75,
              emotion: h.performance ?? "neutro",
              triggers: Array.isArray(h.tags) ? h.tags.slice(0, 4) : [],
            })),
          );
          setSource("supabase");
        }
      } catch { /* mantém fallback */ }
    })();
    return () => { alive = false; };
  }, [niche, fallback]);

  const copy = (t: string) => { navigator.clipboard.writeText(t); toast.success("Hook copiado"); };
  return (
    <Panel>
      <SectionTitle icon={<Sparkles className="w-5 h-5" />} title="Analisador de Hooks" subtitle={`Frases que prendem nos primeiros 3 segundos · ${source === "supabase" ? "biblioteca real" : "demonstração"}`} />
      <div className="space-y-3">
        {hooks.map((h: any, i) => (
          <motion.div key={h.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-[#2A2A2A] bg-[#0a0a0a] p-4 hover:border-primary/60 transition-all">
            <div className="flex items-start justify-between gap-3">
              <p className="text-white font-medium text-sm md:text-base flex-1">"{h.text}"</p>
              <button onClick={() => copy(h.text)} className="text-primary hover:text-primary-glow shrink-0"><Copy className="w-4 h-4" /></button>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#888] uppercase">Retenção</span>
                <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-emerald-400" style={{ width: `${h.retentionScore}%` }} />
                </div>
                <span className="text-primary font-bold text-xs">{h.retentionScore}</span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-primary/10 border border-primary/30 text-[10px] text-primary font-bold uppercase">{h.emotion}</span>
              <div className="flex flex-wrap gap-1">
                {(h.triggers || []).map((t: string) => (
                  <span key={t} className="px-2 py-0.5 rounded-md bg-white/5 text-[10px] text-[#A0A0A0]">{t}</span>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </Panel>
  );
};

// ─────────── WORKFLOW 03 — REELS ───────────
export const ReelsPanel: React.FC<{ niche: string }> = ({ niche }) => {
  const [ideas, setIdeas] = useState(() => getReelIdeas(niche));
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<"mock" | "ai">("mock");
  const genAI = useServerFn(generateReelIdeas);

  const regenMock = () => { setIdeas(getReelIdeas(niche + Math.random())); setSource("mock"); toast.success("Novas ideias geradas (mock)"); };
  const regenAI = async () => {
    setLoading(true);
    const t = toast.loading("SHEY AI criando ideias reais...");
    try {
      const res: any = await genAI({ data: { niche } });
      if (res.ok && Array.isArray(res.data?.ideas) && res.data.ideas.length > 0) {
        setIdeas(res.data.ideas);
        setSource("ai");
        toast.success("Ideias geradas pela IA", { id: t });
      } else {
        toast.error(res.error || "Sem resultado", { id: t });
      }
    } catch (e: any) {
      toast.error(e?.message || "Falha na IA", { id: t });
    } finally { setLoading(false); }
  };

  const copy = (idea: typeof ideas[number]) => {
    const text = `🎬 ${idea.title}\n\nHOOK: ${idea.hook}\n\nROTEIRO:\n${idea.script}\n\nCTA: ${idea.cta}\n\nLEGENDA:\n${idea.caption}\n\n${idea.hashtags.join(" ")}`;
    navigator.clipboard.writeText(text); toast.success("Roteiro copiado");
  };
  return (
    <Panel>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <SectionTitle icon={<Zap className="w-5 h-5" />} title="Gerador de Reels" subtitle={`Ideias completas: roteiro, CTA, legenda, hashtags · ${source === "ai" ? "IA real" : "demonstração"}`} />
        <div className="flex flex-wrap gap-2">
          <Button onClick={regenAI} disabled={loading} size="sm" className="bg-gradient-to-r from-primary to-primary-glow text-black font-bold gap-2 rounded-full">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} Gerar com IA
          </Button>
          <Button onClick={regenMock} size="sm" variant="outline" className="border-primary bg-transparent text-primary hover:bg-primary/10 gap-2 rounded-full">
            <RefreshCw className="w-3.5 h-3.5" /> Mock
          </Button>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {ideas.map((idea: any, i) => (
          <motion.div key={idea.id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-[#2A2A2A] bg-[#0a0a0a] p-4 hover:border-primary/60 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="px-2 py-0.5 rounded-md bg-primary/10 border border-primary/30 text-[10px] text-primary font-bold uppercase">{idea.category}</span>
              <button onClick={() => copy(idea)} className="text-primary hover:text-primary-glow"><Copy className="w-4 h-4" /></button>
            </div>
            <h4 className="text-white font-bold text-sm">{idea.title}</h4>
            <p className="text-[11px] text-primary-glow mt-2 italic">"{idea.hook}"</p>
            <pre className="text-[11px] text-[#A0A0A0] mt-2 whitespace-pre-wrap font-sans leading-relaxed">{idea.script}</pre>
            <div className="mt-2 text-[11px]"><span className="text-primary font-bold">CTA:</span> <span className="text-white/80">{idea.cta}</span></div>
            <div className="flex flex-wrap gap-1 mt-2">
              {(idea.hashtags || []).slice(0, 4).map((h: string) => <span key={h} className="text-[10px] text-[#6BB6FF]">{h}</span>)}
            </div>
          </motion.div>
        ))}
      </div>
    </Panel>
  );
};

// ─────────── WORKFLOW 04 — TRENDS ───────────
export const TrendsPanel: React.FC<{ niche: string }> = ({ niche }) => {
  const mock = useMemo(() => getTrends(niche), [niche]);
  const [trends, setTrends] = useState<any[]>(mock);
  const [source, setSource] = useState<"mock" | "ai">("mock");
  const [loading, setLoading] = useState(false);
  const series = useMemo(() => getTrendSeries(), []);
  const genAI = useServerFn(generateTrends);
  const iconFor = (k: string) => k === "Hashtag" ? <Hash className="w-3.5 h-3.5" /> : k === "Áudio" ? <Music2 className="w-3.5 h-3.5" /> : <Layout className="w-3.5 h-3.5" />;

  const loadAI = async () => {
    setLoading(true);
    const t = toast.loading("Buscando tendências reais...");
    try {
      const res: any = await genAI({ data: { niche } });
      if (res.ok && Array.isArray(res.data?.trends) && res.data.trends.length > 0) {
        setTrends(res.data.trends); setSource("ai");
        toast.success("Tendências atualizadas", { id: t });
      } else toast.error(res.error || "Sem resultado", { id: t });
    } catch (e: any) { toast.error(e?.message || "Falha na IA", { id: t }); }
    finally { setLoading(false); }
  };

  return (
    <Panel>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <SectionTitle icon={<TrendingUp className="w-5 h-5" />} title="Tendências do Nicho" subtitle={`Hashtags, áudios e formatos em alta agora · ${source === "ai" ? "IA real" : "demonstração"}`} />
        <Button onClick={loadAI} disabled={loading} size="sm" className="bg-gradient-to-r from-primary to-primary-glow text-black font-bold gap-2 rounded-full">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />} Atualizar com IA
        </Button>
      </div>
      <div className="grid lg:grid-cols-[1fr,1.2fr] gap-4">
        <div className="rounded-xl border border-[#2A2A2A] bg-[#0a0a0a] p-4">
          <p className="text-[11px] text-[#888] uppercase tracking-wider mb-2">Tendência geral · 7 dias</p>
          <div className="h-48 min-h-48 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <defs>
                  <linearGradient id="trendG" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="var(--primary)" /><stop offset="100%" stopColor="var(--primary-glow)" />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1f1f1f" />
                <XAxis dataKey="day" stroke="#666" fontSize={11} />
                <YAxis stroke="#666" fontSize={11} />
                <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid var(--primary)", borderRadius: 8 }} labelStyle={{ color: "var(--primary)" }} />
                <Line type="monotone" dataKey="value" stroke="url(#trendG)" strokeWidth={3} dot={{ fill: "var(--primary)", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="space-y-2 max-h-72 overflow-auto custom-scrollbar-workflows pr-1">
          {trends.map((t: any, i) => (
            <div key={t.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#2A2A2A] bg-[#0a0a0a] p-3 hover:border-primary/60 transition-all">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">#{i + 1}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[10px] text-[#888] uppercase">{iconFor(t.kind)} {t.kind}</div>
                  <p className="text-white text-sm font-medium truncate">{t.name}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-emerald-400 font-bold text-sm">+{t.growth}%</div>
                <div className="text-[10px] text-[#888]">{t.reach} · pico {t.peakIn}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
};

// ─────────── WORKFLOW 05 — SCORE VIRAL ───────────
export const ScorePanel: React.FC<{ handle: string; niche: string }> = ({ handle, niche }) => {
  const fallback = useMemo(() => getViralScoreReport(handle, niche), [handle, niche]);
  const [report, setReport] = useState<any>(fallback);
  const [source, setSource] = useState<"mock" | "ai">("mock");
  const [loading, setLoading] = useState(false);
  const genAI = useServerFn(generateScoreReport);
  const radialData = [{ name: "score", value: report.score, fill: "var(--primary)" }];

  const loadAI = async () => {
    setLoading(true);
    const t = toast.loading("SHEY AI analisando o perfil...");
    try {
      const res: any = await genAI({ data: { handle, niche } });
      if (res.ok && res.data?.breakdown) { setReport(res.data); setSource("ai"); toast.success("Score atualizado pela IA", { id: t }); }
      else toast.error(res.error || "Sem resultado", { id: t });
    } catch (e: any) { toast.error(e?.message || "Falha na IA", { id: t }); }
    finally { setLoading(false); }
  };

  return (
    <Panel>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <SectionTitle icon={<Trophy className="w-5 h-5" />} title="Score Viral" subtitle={`Potencial de viralização de @${handle} · ${source === "ai" ? "análise real" : "demonstração"}`} />
        <Button onClick={loadAI} disabled={loading} size="sm" className="bg-gradient-to-r from-primary to-primary-glow text-black font-bold gap-2 rounded-full">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />} Analisar com IA
        </Button>
      </div>
      <div className="grid md:grid-cols-[260px,1fr] gap-5 items-center">
        <div className="relative h-56 min-h-56 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart innerRadius="70%" outerRadius="100%" data={radialData} startAngle={90} endAngle={-270}>
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar background={{ fill: "#1a1a1a" }} dataKey="value" cornerRadius={20} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-5xl font-rajdhani font-black text-primary text-glow">{report.score}</motion.div>
            <div className="text-[10px] text-white/60 uppercase tracking-widest mt-1">{report.level}</div>
          </div>
        </div>
        <div className="space-y-3">
          {(report.breakdown || []).map((b: any) => (
            <div key={b.label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-white/80">{b.label}</span>
                <span className="text-primary font-bold">{b.value}</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${b.value}%` }} transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-primary to-primary-glow" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-5 rounded-xl border border-primary/30 bg-primary/5 p-4">
        <p className="text-[11px] text-primary uppercase tracking-wider font-bold mb-2">Sugestões automáticas da IA</p>
        <ul className="space-y-1.5">
          {(report.suggestions || []).map((s: string, i: number) => (
            <li key={i} className="text-sm text-white/90 flex gap-2"><span className="text-primary">▸</span>{s}</li>
          ))}
        </ul>
      </div>
    </Panel>
  );
};

// ─────────── SHEY AI CHAT ───────────
type Msg = { role: "user" | "assistant"; content: string };

export const SheyAIPanel: React.FC<{ handle: string; niche: string; goal: string }> = ({ handle, niche, goal }) => {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: `Oi! Sou a SHEY AI 🤖✨\nEspecialista em crescimento viral. Me pergunte qualquer coisa sobre @${handle} no nicho ${niche}.\n\nQuer começar com uma ideia de Reel? Uma estratégia? Hooks?` },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const send = useServerFn(sheyAiChat);

  const onSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next); setInput(""); setLoading(true);
    try {
      const res = await send({ data: { handle, niche, goal, messages: next } });
      if (res.ok) setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
      else { toast.error(res.error); setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${res.error}` }]); }
    } catch {
      toast.error("Falha de conexão com SHEY AI");
    } finally { setLoading(false); }
  };

  return (
    <Panel className="flex flex-col h-[600px]">
      <SectionTitle icon={<Bot className="w-5 h-5" />} title="SHEY AI" subtitle="Sua estrategista viral pessoal · powered by Lovable AI" />
      <div className="flex-1 overflow-auto custom-scrollbar-workflows space-y-3 pr-1 mb-3">
        {messages.map((m, i) => (
          <div key={i} className={cn("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
            {m.role === "assistant" && (
              <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
                <Bot className="w-4 h-4 text-black" />
              </div>
            )}
            <div className={cn("max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed",
              m.role === "user" ? "bg-primary text-black font-medium" : "bg-[#0a0a0a] border border-[#2A2A2A] text-white"
            )}>{m.content}</div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center"><Bot className="w-4 h-4 text-black" /></div>
            <div className="rounded-2xl px-4 py-2.5 bg-[#0a0a0a] border border-[#2A2A2A] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:120ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:240ms]" />
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
          placeholder="Pergunte qualquer coisa sobre crescimento viral..."
          disabled={loading}
          className="flex-1 bg-[#0a0a0a] border border-[#2A2A2A] focus:border-primary outline-none rounded-xl px-4 py-3 text-white text-sm transition-colors"
        />
        <Button onClick={onSend} disabled={loading || !input.trim()} className="bg-primary hover:bg-primary-glow text-black font-bold h-auto px-5">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </Panel>
  );
};
