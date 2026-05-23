import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Radar, Sparkles, Zap, TrendingUp, Trophy, Bot, MessageSquare, Layers, Mic, Calendar, Users } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RadarViralPanel, HooksPanel, ReelsPanel, TrendsPanel, ScorePanel, SheyAIPanel } from "./WorkflowPanels";
import { ProfileCard } from "./ProfileCard";
import { supabase } from "@/integrations/supabase/client";

type TabId = "radar" | "hooks" | "reels" | "trends" | "score" | "profile";

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "radar", label: "Radar Viral", icon: Radar },
  { id: "hooks", label: "Hooks", icon: Sparkles },
  { id: "reels", label: "Reels", icon: Zap },
  { id: "trends", label: "Tendências", icon: TrendingUp },
  { id: "score", label: "Score Viral", icon: Trophy },
  { id: "profile", label: "Perfil Real", icon: Zap },
];

interface Props {
  handle: string;
  niche: string;
  goal: string;
  profile?: any;
  onRefresh?: () => void;
  onDisconnect?: () => void;
}

export const WorkflowDashboard: React.FC<Props> = ({ handle, niche, goal, profile, onRefresh, onDisconnect }) => {
  const [tab, setTab] = useState<TabId>("radar");
  const [stats, setStats] = useState<{ carousels: number; hooks: number; transcriptions: number; calendar: number; competitors: number } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [c, h, t, cal, comp] = await Promise.all([
          supabase.from("carousels").select("id", { count: "exact", head: true }),
          supabase.from("viral_hooks").select("id", { count: "exact", head: true }),
          supabase.from("reel_transcriptions").select("id", { count: "exact", head: true }),
          supabase.from("content_calendar").select("id", { count: "exact", head: true }),
          supabase.from("competitor_analyses").select("id", { count: "exact", head: true }),
        ]);
        if (!alive) return;
        setStats({
          carousels: c.count ?? 0,
          hooks: h.count ?? 0,
          transcriptions: t.count ?? 0,
          calendar: cal.count ?? 0,
          competitors: comp.count ?? 0,
        });
      } catch { /* ignore */ }
    })();
    return () => { alive = false; };
  }, []);

  const statItems = [
    { label: "Carrosséis", value: stats?.carousels, icon: Layers },
    { label: "Hooks", value: stats?.hooks, icon: Sparkles },
    { label: "Transcrições", value: stats?.transcriptions, icon: Mic },
    { label: "Calendário", value: stats?.calendar, icon: Calendar },
    { label: "Concorrentes", value: stats?.competitors, icon: Users },
  ];

  return (
    <section className="w-full max-w-7xl mx-auto px-3 md:px-6 pb-12">
      <div className="mb-5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 w-full">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          <h3 className="font-rajdhani text-sm md:text-base font-bold text-primary uppercase tracking-[0.4em] whitespace-nowrap">
            Central de Inteligência Viral
          </h3>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-primary/40 to-transparent" />
        </div>
        
        <Button asChild variant="outline" size="sm" className="border-primary/40 hover:bg-primary/10 text-primary gap-2 rounded-full font-bold uppercase tracking-wider text-[10px]">
          <Link to="/automacoes-ia">
            <MessageSquare className="w-3.5 h-3.5" />
            Falar com SHEY AI
          </Link>
        </Button>
      </div>

      {/* Painel de status real (contagens do Supabase) */}
      <div className="mb-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {statItems.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-xl border border-[#2A2A2A] bg-[#0a0a0a]/80 p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-[#888]">{s.label}</div>
                <div className="text-lg font-bold text-white font-rajdhani">
                  {s.value === undefined ? "…" : s.value}
                </div>
              </div>
            </div>
          );
        })}
      </div>


      {/* Tabs */}
      <div className="relative mb-5">
        <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl border border-[#2A2A2A] bg-[#0a0a0a]/80">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "relative flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-bold uppercase tracking-wider transition-colors min-h-[40px]",
                  active ? "text-black" : "text-[#A0A0A0] hover:text-white"
                )}
              >
                {active && (
                  <motion.div
                    layoutId="tab-active"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary to-primary-glow shadow-[0_0_20px_rgb(var(--primary-rgb) / 0.5)]"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span>{t.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
        >
          {tab === "radar" && <RadarViralPanel niche={niche} />}
          {tab === "hooks" && <HooksPanel niche={niche} />}
          {tab === "reels" && <ReelsPanel niche={niche} />}
          {tab === "trends" && <TrendsPanel niche={niche} />}
          {tab === "score" && <ScorePanel handle={handle} niche={niche} />}
          {tab === "profile" && (
            <div className="w-full flex justify-center">
              <ProfileCard 
                handle={handle} 
                niche={niche} 
                isOpen={true} 
                profile={profile}
                onRefresh={onRefresh}
                onDisconnect={onDisconnect}
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  );
};
