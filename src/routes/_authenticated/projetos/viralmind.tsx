import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { getViralMind, refreshAnalysis } from "@/services/viralmind.functions";
import { ConnectCard } from "@/components/viralmind/ConnectCard";
import { Loader2, Instagram, RefreshCw, BarChart3, PenTool, TrendingUp, Users } from "lucide-react";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/projetos/viralmind")({
  head: () => ({
    meta: [
      { title: "Insta.Dev — Instagram — INSTA N8N" },
      { name: "description", content: "Análise estratégica e templates virais para Instagram." },
    ],
  }),
  component: ViralMindPage,
});

function ViralMindPage() {
  const queryClient = useQueryClient();
  const { data: profile, isLoading, isFetching } = useQuery({
    queryKey: ["viralmind-profile"],
    queryFn: () => getViralMind(),
  });

  const refresh = useMutation({
    mutationFn: () => refreshAnalysis(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["viralmind-profile"] });
    }
  });

  const handleRefresh = async () => {
    refresh.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-12">
        <ConnectCard />
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-8 px-4 py-8">
      {/* Perfil Header Card */}
      <div className="glass flex flex-col items-center justify-between gap-6 p-6 md:flex-row border-white/5">
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="h-24 w-24 rounded-full bg-gradient-to-tr from-[#feda75] via-[#fa7e1e] to-[#d62976] p-1 shadow-xl overflow-hidden">
              <div className="flex h-full w-full items-center justify-center rounded-full bg-[#121212] p-1 overflow-hidden">
                <div className="h-full w-full rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
                  {profile.avatarUrl ? (
                    <img 
                      src={profile.avatarUrl} 
                      alt={profile.handle} 
                      className="h-full w-full object-cover" 
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        // Fallback se o Instagram bloquear a imagem direta
                        const target = e.target as HTMLImageElement;
                        if (!target.src.includes('unavatar.io')) {
                          target.src = `https://unavatar.io/instagram/${profile.handle}?fallback=https://github.com/identicons/${profile.handle}.png`;
                        }
                      }}
                    />
                  ) : (
                    <Instagram className="h-8 w-8 text-white/40" />
                  )}
                </div>
              </div>
            </div>
            <Button 
              size="icon" 
              className={`absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary glow-primary-sm transition-all ${isFetching ? "animate-spin cursor-not-allowed opacity-80" : "hover:scale-110"}`}
              onClick={handleRefresh}
              disabled={isFetching}
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "" : ""}`} />
            </Button>
          </div>
          <div className="space-y-2 text-center md:text-left">
            <div className="flex flex-wrap items-center gap-2 justify-center md:justify-start">
              <h2 className="font-rajdhani text-2xl font-black italic uppercase tracking-wider text-white">
                {profile.handle}
              </h2>
              <Badge className="bg-cyan-500/20 text-cyan-500 border-cyan-500/20 text-[10px] uppercase font-bold">
                @{profile.handle}
              </Badge>
              {profile.status === "real" && (
                <Badge className="bg-green-500/20 text-green-500 border-green-500/20 text-[10px] uppercase font-bold">
                  Dados Reais
                </Badge>
              )}
              {profile.status === "manual" && (
                <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/20 text-[10px] uppercase font-bold">
                  Modo Fallback
                </Badge>
              )}
            </div>
            <p className="text-sm text-white/60 italic max-w-md">
              {profile.bio || "Nenhuma biografia encontrada."}
            </p>
            <div className="flex gap-4 text-xs font-medium text-white/40 uppercase tracking-tighter justify-center md:justify-start">
              <span>{profile.posts ?? 0} <span className="text-white/20">Publicações</span></span>
              <span>{profile.followers ?? 0} <span className="text-white/20">Seguidores</span></span>
              <span>{profile.following ?? 0} <span className="text-white/20">Seguindo</span></span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center gap-4">
           <div className="flex gap-2">
             <Button 
                variant="outline" 
                size="sm" 
                className="border-white/10 bg-white/5 text-[10px] uppercase font-bold hover:bg-white/10"
                onClick={() => {
                  const queryClient = (window as any).queryClient;
                  import("@/services/viralmind.functions").then(m => m.deleteInstagramProfile()).then(() => {
                     window.location.reload();
                  });
                }}
              >
                Desconectar
             </Button>
           </div>
           <div className="relative flex items-center justify-center">
              <svg className="h-20 w-20">
                <circle cx="40" cy="40" r="36" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                <circle 
                  cx="40" cy="40" r="36" fill="transparent" stroke="currentColor" strokeWidth="6" 
                  strokeDasharray={`${(profile.overallScore / 100) * 226} 226`} 
                  className="text-primary glow-primary-sm" 
                />
              </svg>
              <div className="absolute font-rajdhani text-xl font-bold italic text-white">{profile.overallScore}</div>
           </div>
           <span className="text-[10px] uppercase font-black italic tracking-widest text-primary">Score Geral</span>
        </div>
      </div>

      {/* Tabs de Navegação Interna */}
      <Tabs defaultValue="visao" className="w-full">
        <TabsList className="glass h-14 w-full justify-start gap-2 bg-white/5 p-2 border-white/5 overflow-x-auto overflow-y-hidden no-scrollbar">
          <TabsTrigger value="visao" className="gap-2 data-[state=active]:bg-primary font-bold italic uppercase tracking-wider text-[11px]">
            <BarChart3 className="h-4 w-4" /> Visão Geral
          </TabsTrigger>
          <TabsTrigger value="criar" className="gap-2 data-[state=active]:bg-primary font-bold italic uppercase tracking-wider text-[11px]">
            <PenTool className="h-4 w-4" /> Criar Conteúdo
          </TabsTrigger>
          <TabsTrigger value="estrategia" className="gap-2 data-[state=active]:bg-primary font-bold italic uppercase tracking-wider text-[11px]">
            <TrendingUp className="h-4 w-4" /> Estratégia
          </TabsTrigger>
          <TabsTrigger value="crescimento" className="gap-2 data-[state=active]:bg-primary font-bold italic uppercase tracking-wider text-[11px]">
            <Users className="h-4 w-4" /> Crescimento
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visao" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="glass h-48 border-white/5 p-6 flex items-center justify-center text-white/20 italic">
               Gráfico de Seguidores (Área Chart)
            </div>
            <div className="glass h-48 border-white/5 p-6 flex items-center justify-center text-white/20 italic">
               Gráfico de Melhorias (Line Chart)
            </div>
          </div>
          <div className="glass p-6 border-white/5 space-y-4">
             <h3 className="font-rajdhani text-lg font-black italic uppercase tracking-wider text-white">Análise do Perfil</h3>
             <div className="space-y-4">
               {["Bio", "Engajamento", "Consistência"].map(pilar => (
                 <div key={pilar} className="space-y-1">
                    <div className="flex justify-between text-[10px] uppercase font-bold text-white/60">
                      <span>{pilar}</span>
                      <span>85%</span>
                    </div>
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-primary glow-primary-sm" style={{width: '85%'}} />
                    </div>
                 </div>
               ))}
             </div>
          </div>
        </TabsContent>

        <TabsContent value="criar" className="mt-6">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { title: "Plano 30 Dias", desc: "Missões diárias geradas por IA" },
                { title: "Gerador de Bio", desc: "Bios otimizadas para conversão" },
                { title: "Banco de Ganchos", desc: "50 ganchos virais para reels" }
              ].map(card => (
                <div key={card.title} className="glass border-white/5 p-6 space-y-2 hover:border-primary/20 transition-all cursor-pointer group">
                  <h4 className="font-rajdhani text-lg font-black italic uppercase text-white group-hover:text-primary transition-colors">{card.title}</h4>
                  <p className="text-xs text-white/50">{card.desc}</p>
                </div>
              ))}
           </div>
        </TabsContent>

        <TabsContent value="estrategia" className="mt-6">
           <div className="glass border-white/5 p-8 text-center space-y-4">
              <TrendingUp className="h-12 w-12 text-primary mx-auto opacity-20" />
              <p className="text-white/40 italic">Funcionalidades estratégicas sendo otimizadas para seu nicho...</p>
           </div>
        </TabsContent>

        <TabsContent value="crescimento" className="mt-6">
           <div className="glass border-white/5 p-8 text-center space-y-4">
              <Users className="h-12 w-12 text-primary mx-auto opacity-20" />
              <p className="text-white/40 italic">Métricas de crescimento detalhadas em breve...</p>
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
