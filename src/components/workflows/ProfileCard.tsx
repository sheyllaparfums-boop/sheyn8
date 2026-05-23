import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, Trash2, RefreshCw, Edit, ExternalLink, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { InstagramProfile } from "@/lib/instagram.functions";

interface ProfileCardProps {
  handle: string;
  niche: string;
  isOpen: boolean;
  onClose?: () => void;
  profile?: InstagramProfile | null;
  onRefresh?: () => void;
  onDisconnect?: () => void;
  onEdit?: () => void;
  loading?: boolean;
  lastFetched?: number | null;
}

function formatCount(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(".0", "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(".0", "") + "K";
  return n.toLocaleString("pt-BR");
}

function formatRelative(ts: number | null | undefined): string {
  if (!ts) return "—";
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return "agora";
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
  return `há ${Math.floor(diff / 86400)}d`;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  handle, niche, isOpen, onClose, profile, onRefresh, onDisconnect, onEdit, loading, lastFetched,
}) => {
  const hasRealData = profile && profile.source !== "fallback" && profile.followers !== null;
  const showSkeleton = loading && !profile;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className={cn(
          "flex items-center justify-center p-4",
          typeof onClose === 'function' ? "fixed inset-0 z-[100] bg-black/60" : "relative w-full"
        )}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-[440px] bg-[#161616] border border-[#2A2A2A] rounded-[24px] overflow-hidden shadow-2xl"
          >
            <div className="p-6 relative">
              {typeof onClose === 'function' && (
                <button 
                  onClick={onClose}
                  className="absolute top-4 right-4 text-[#888888] hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}

              <div className="flex flex-col items-center mb-6">
                <a
                  href={`https://instagram.com/${handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Abrir @${handle} no Instagram`}
                  title="Abrir no Instagram"
                  className="relative mb-4 group focus:outline-none focus:ring-2 focus:ring-primary rounded-full"
                >
                  <div className="w-24 h-24 rounded-full border-[3px] border-transparent bg-gradient-to-tr from-primary to-[#FD1D1D] p-[2px] transition-transform group-hover:scale-105">
                    <div className="w-full h-full rounded-full bg-[#111] flex items-center justify-center overflow-hidden">
                      {showSkeleton ? (
                        <Skeleton className="w-full h-full rounded-full" />
                      ) : (() => {
                        const raw = profile?.profilePic || `https://unavatar.io/instagram/${handle}`;
                        const isIg = /(cdninstagram\.com|fbcdn\.net|instagram\.com)/i.test(raw);
                        const src = isIg ? `/api/public/ig-thumb?url=${encodeURIComponent(raw)}` : raw;
                        return (
                          <img
                            src={src}
                            alt={handle}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              const img = e.target as HTMLImageElement;
                              const step = img.dataset.fb || "0";
                              if (step === "0") {
                                img.dataset.fb = "1";
                                img.src = `https://unavatar.io/instagram/${handle}`;
                              } else if (step === "1") {
                                img.dataset.fb = "2";
                                img.src = `https://wsrv.nl/?url=${encodeURIComponent(raw)}&w=200&h=200&fit=cover&output=jpg`;
                              }
                            }}
                          />
                        );
                      })()}
                    </div>
                  </div>
                  <span className="absolute -bottom-1 -right-1 bg-black border border-[#2A2A2A] rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExternalLink className="w-3 h-3 text-white" />
                  </span>
                </a>
                
                <div className="flex items-center gap-1.5 mb-1">
                  <h2 className="font-rajdhani text-2xl font-bold text-white">@{handle}</h2>
                  {hasRealData && <CheckCircle2 className="w-5 h-5 text-green-500 fill-green-500/10" />}
                </div>

                <p className="text-[#888888] text-sm">
                  {showSkeleton ? <Skeleton className="h-4 w-32" /> : hasRealData && profile.fullName ? profile.fullName : niche}
                </p>

                {lastFetched && !showSkeleton && (
                  <p className="flex items-center gap-1 text-[10px] text-[#666] mt-2">
                    <Clock className="w-3 h-3" />
                    Atualizado {formatRelative(lastFetched)}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4 py-4 border-y border-[#2A2A2A] mb-6">
                <div className="text-center">
                  {showSkeleton ? <Skeleton className="h-6 w-12 mx-auto" /> : <p className="text-white font-bold text-lg">{hasRealData ? formatCount(profile.posts) : "—"}</p>}
                  <p className="text-[#888888] text-[10px] uppercase mt-1">publicações</p>
                </div>
                <div className="text-center border-x border-[#2A2A2A]">
                  {showSkeleton ? <Skeleton className="h-6 w-12 mx-auto" /> : <p className="text-white font-bold text-lg">{hasRealData ? formatCount(profile.followers) : "—"}</p>}
                  <p className="text-[#888888] text-[10px] uppercase mt-1">seguidores</p>
                </div>
                <div className="text-center">
                  {showSkeleton ? <Skeleton className="h-6 w-12 mx-auto" /> : <p className="text-white font-bold text-lg">{hasRealData ? formatCount(profile.following) : "—"}</p>}
                  <p className="text-[#888888] text-[10px] uppercase mt-1">seguindo</p>
                </div>
              </div>

              <div className="space-y-2 mb-8">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-bold border",
                    hasRealData ? "bg-green-500/15 text-green-500 border-green-500/20" : "bg-yellow-500/15 text-yellow-500 border-yellow-500/20"
                  )}>
                    {hasRealData ? (
                      "Dados reais"
                    ) : (
                      "Aguardando dados"
                    )}
                  </span>
                  {hasRealData && profile.isVerified && (
                    <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-500 text-[10px] font-bold border border-blue-500/20">Verificado ✓</span>
                  )}
                  {hasRealData && profile.isPrivate && (
                    <span className="px-2 py-0.5 rounded bg-red-500/15 text-red-500 text-[10px] font-bold border border-red-500/20">Conta Privada</span>
                  )}
                </div>

                {hasRealData && profile.bio ? (
                  <p className="text-white text-[13px] leading-relaxed">{profile.bio}</p>
                ) : !hasRealData && profile?.error ? (
                  <p className="text-red-500 text-[13px] leading-relaxed">{profile.error}</p>
                ) : (
                  <div className="space-y-4">
                    <p className="text-[#888888] text-[13px] leading-relaxed">Execute o agente para carregar os dados do perfil.</p>
                    {!hasRealData && onRefresh && (
                      <Button 
                        onClick={onRefresh}
                        variant="outline" 
                        className="w-full border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 gap-2 h-9 text-[11px] animate-pulse"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Tentar Coleta Manual
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {hasRealData && (
                <div className="mb-6">
                  <p className="text-[10px] text-[#555] uppercase font-bold">
                    Fonte: {profile.source === "official" ? "API Oficial Instagram" : profile.source === "rapidapi" ? "RapidAPI" : "Scraping Público"}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => (onEdit ? onEdit() : toast.error("Edição indisponível neste contexto."))}
                  variant="outline"
                  className="border-[#2A2A2A] bg-transparent text-white hover:bg-white/5 gap-2 h-10 text-[12px]"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Editar dados
                </Button>
                <Button onClick={onDisconnect} variant="outline" className="border-[#2A2A2A] bg-transparent text-[#EF4444] hover:bg-[#EF4444]/5 gap-2 h-10 text-[12px]">
                  <Trash2 className="w-3.5 h-3.5" />
                  Desconectar
                </Button>
                <Button onClick={onRefresh} className="col-span-2 bg-gradient-to-r from-primary to-primary-glow text-black font-bold gap-2 h-10 text-[12px] shadow-[0_0_15px_rgb(var(--primary-rgb) / 0.3)]">
                  <RefreshCw className="w-3.5 h-3.5" />
                  Recarregar Dados
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};