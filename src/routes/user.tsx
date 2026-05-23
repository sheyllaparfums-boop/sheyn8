import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { requireAuth } from "@/lib/route-guards";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { OnboardingForm } from "@/components/workflows/OnboardingForm";
import { ProfileCard } from "@/components/workflows/ProfileCard";
import { OnboardingTour } from "@/components/user/OnboardingTour";
import { useAuthStore } from "@/lib/auth-store";
import { fetchInstagramProfile, type InstagramProfile } from "@/lib/instagram.functions";
import { Button } from "@/components/ui/button";
import { Pencil, AlertTriangle, BarChart3, Users, Sparkles, Workflow, History, X, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/Header";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const PROFILE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const EMPTY_HISTORY: string[] = [];

export const Route = createFileRoute("/user")({
  beforeLoad: ({ location }) => requireAuth(location),
  head: () => ({
    meta: [
      { title: "Sua Conta — SHEY N8N" },
      { name: "description", content: "Configure seu @ e dados de perfil usados em toda a plataforma." },
    ],
  }),
  component: UserPage,
});

interface ModuleStatus {
  carousels: number;
  hooks: number;
  competitors: number;
  transcriptions: number;
  loading: boolean;
}

function UserPage() {
  const user = useAuthStore((s) => s.user);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const onboardingData = useAuthStore((s) => (s.user ? s.onboardingByUser[s.user.id] ?? null : null));
  const tourSeen = useAuthStore((s) => (s.user ? !!s.tourSeenByUser[s.user.id] : true));
  const handleHistory = useAuthStore((s) => (s.user ? s.handleHistoryByUser[s.user.id] ?? EMPTY_HISTORY : EMPTY_HISTORY));
  const profileCache = useAuthStore((s) => s.profileCache);
  const setOnboardingData = useAuthStore((s) => s.setOnboardingData);
  const clearOnboarding = useAuthStore((s) => s.clearOnboarding);
  const markTourSeen = useAuthStore((s) => s.markTourSeen);
  const cacheProfile = useAuthStore((s) => s.cacheProfile);
  const removeHandleFromHistory = useAuthStore((s) => s.removeHandleFromHistory);
  const navigate = useNavigate();

  const fetchProfile = useServerFn(fetchInstagramProfile);
  const [profile, setProfile] = useState<InstagramProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [lastFetched, setLastFetched] = useState<number | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [moduleStatus, setModuleStatus] = useState<ModuleStatus>({
    carousels: 0, hooks: 0, competitors: 0, transcriptions: 0, loading: true,
  });

  const handle = onboardingData?.handle ?? "";
  const showTour = hasHydrated && !!user && !tourSeen && !onboardingData;

  // SEO dinâmico
  useEffect(() => {
    if (handle) document.title = `@${handle} — Sua Conta — SHEY N8N`;
    else document.title = "Sua Conta — SHEY N8N";
  }, [handle]);

  const loadProfile = useCallback(async (h: string, opts?: { manual?: boolean; force?: boolean }) => {
    if (!h || loading) return;

    // Cache hit
    const cached = profileCache[h.toLowerCase()];
    if (!opts?.force && !opts?.manual && cached && Date.now() - cached.fetchedAt < PROFILE_TTL_MS) {
      setProfile(cached.profile);
      setLastFetched(cached.fetchedAt);
      setFetchError(null);
      return;
    }

    setLoading(true);
    setFetchError(null);
    const loadingToast = opts?.manual ? toast.loading(`Recarregando @${h}…`) : null;
    try {
      const res = await fetchProfile({ data: { handle: h } });
      setProfile(res);
      const now = Date.now();
      setLastFetched(now);
      cacheProfile(h, res);
      if (loadingToast) toast.dismiss(loadingToast);
      if (res?.source === "fallback" || res?.followers == null) {
        setFetchError(res?.error ?? "Instagram bloqueou o acesso público. Tente novamente em instantes.");
        if (opts?.manual) toast.error(res?.error ?? "Falha ao carregar dados.", { duration: 5000 });
      } else if (opts?.manual) {
        toast.success(`Dados de @${h} atualizados.`);
      }
    } catch (e: any) {
      if (loadingToast) toast.dismiss(loadingToast);
      const msg = e?.message ?? "Falha ao carregar perfil.";
      setFetchError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [fetchProfile, loading, profileCache, cacheProfile]);

  useEffect(() => {
    if (handle && !profile) loadProfile(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle]);

  // Module health (carga real do Supabase)
  useEffect(() => {
    if (!user?.id || !onboardingData) return;
    let cancelled = false;
    (async () => {
      try {
        const [c, h, comp, t] = await Promise.all([
          supabase.from("carousels").select("id", { count: "exact", head: true }).eq("user_id", user.id),
          supabase.from("viral_hooks").select("id", { count: "exact", head: true }).eq("user_id", user.id),
          supabase.from("competitor_analyses").select("id", { count: "exact", head: true }).eq("user_id", user.id),
          supabase.from("reel_transcriptions").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        ]);
        if (cancelled) return;
        setModuleStatus({
          carousels: c.count ?? 0,
          hooks: h.count ?? 0,
          competitors: comp.count ?? 0,
          transcriptions: t.count ?? 0,
          loading: false,
        });
      } catch {
        if (!cancelled) setModuleStatus((s) => ({ ...s, loading: false }));
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, onboardingData]);

  if (!hasHydrated) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Sem @ configurado OU em modo edição → mostra o formulário
  if (!onboardingData || editing) {
    return (
      <div className="min-h-screen bg-[#080808]">
        <DashboardHeader />
        {showTour && <OnboardingTour onFinish={markTourSeen} />}
        <div className="max-w-3xl mx-auto px-4 pt-6">
          <div
            role="alert"
            aria-live="polite"
            className="flex items-start gap-3 p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/5 mb-4"
          >
            <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-200/90 leading-relaxed">
              Sem o <span className="font-bold text-yellow-400">@</span> configurado aqui, nenhum dado é carregado no app.
              Workflows, Análise, Concorrente e SHEY AI só funcionam após você salvar seu perfil.
            </p>
          </div>

          {/* Histórico de @s usados */}
          {handleHistory.length > 0 && (
            <div className="mb-4 p-4 rounded-xl border border-[#2A2A2A] bg-[#111]">
              <div className="flex items-center gap-2 mb-3">
                <History className="w-4 h-4 text-[#888]" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">@s usados anteriormente</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {handleHistory.map((h) => (
                  <div key={h} className="flex items-center gap-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-full pl-3 pr-1 py-1">
                    <button
                      onClick={() => {
                        setOnboardingData({
                          handle: h,
                          niche: onboardingData?.niche ?? "Outro",
                          goal: onboardingData?.goal ?? "followers",
                        });
                        setEditing(false);
                        toast.success(`Reconectado a @${h}`);
                      }}
                      className="text-sm text-white hover:text-primary transition-colors"
                    >
                      @{h}
                    </button>
                    <button
                      onClick={() => removeHandleFromHistory(h)}
                      aria-label={`Remover @${h} do histórico`}
                      className="p-1 text-[#666] hover:text-red-400 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <OnboardingForm
          initialData={onboardingData}
          autoFocusHandle
          onComplete={(data) => {
            setOnboardingData(data);
            markTourSeen();
            setProfile(null);
            setLastFetched(null);
            const wasEditing = editing;
            setEditing(false);
            toast.success(`@${data.handle} salvo para ${user?.name ?? "esta conta"}.`);
            if (!wasEditing) navigate({ to: "/workflows" });
          }}
        />
      </div>
    );
  }

  const modules = [
    { label: "Carrosséis", count: moduleStatus.carousels, icon: Sparkles, to: "/carrossel" as const },
    { label: "Ganchos", count: moduleStatus.hooks, icon: Workflow, to: "/ganchos" as const },
    { label: "Concorrentes", count: moduleStatus.competitors, icon: Users, to: "/concorrente" as const },
    { label: "Transcrições", count: moduleStatus.transcriptions, icon: BarChart3, to: "/transcricao" as const },
  ];

  // Com @ → mostra o cartão do perfil
  return (
    <div className="min-h-screen bg-[#080808]">
      <DashboardHeader />
      <div className="py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <h1 className="font-rajdhani text-2xl font-bold text-white uppercase tracking-wider">
              Sua Conta
            </h1>
            <p className="text-[#888] text-sm mt-1">
              Este @ alimenta todo o aplicativo. Sem ele, nada é carregado.
            </p>
          </div>

          {/* Banner de erro com retry */}
          {fetchError && (
            <div
              role="alert"
              aria-live="assertive"
              className="flex items-start gap-3 p-4 rounded-xl border border-red-500/30 bg-red-500/5 mb-4"
            >
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-200/90 leading-relaxed">{fetchError}</p>
                <Button
                  onClick={() => loadProfile(handle, { manual: true, force: true })}
                  variant="outline"
                  size="sm"
                  className="mt-2 border-red-500/30 bg-red-500/5 text-red-300 hover:bg-red-500/10 gap-2 h-8 text-xs"
                  disabled={loading}
                >
                  <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
                  Tentar novamente
                </Button>
              </div>
            </div>
          )}

          <ProfileCard
            handle={handle}
            niche={onboardingData.niche}
            isOpen={true}
            profile={profile}
            loading={loading}
            lastFetched={lastFetched}
            onRefresh={() => loadProfile(handle, { manual: true, force: true })}
            onDisconnect={() => setDisconnectOpen(true)}
            onEdit={() => setEditing(true)}
          />

          {/* Ação principal: ir para workflows */}
          <div className="flex justify-center mt-4">
            <Button
              onClick={() => navigate({ to: "/workflows" })}
              className="bg-gradient-to-r from-primary to-primary-glow text-black font-bold w-full max-w-xs"
            >
              Ir para Workflows
            </Button>
          </div>

          <AlertDialog open={disconnectOpen} onOpenChange={setDisconnectOpen}>
            <AlertDialogContent className="bg-[#111] border-[#2A2A2A]">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white">Desconectar @{handle}?</AlertDialogTitle>
                <AlertDialogDescription className="text-[#888]">
                  Os módulos Workflows, Análise, Concorrente e SHEY AI deixarão de funcionar até você configurar um novo @.
                  Seus dados salvos (carrosséis, ganchos, etc.) NÃO serão apagados.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-transparent border-[#2A2A2A] text-white hover:bg-white/5">
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    clearOnboarding();
                    setProfile(null);
                    setLastFetched(null);
                    setFetchError(null);
                    toast.success("Perfil desconectado. Configure um novo @.");
                  }}
                  className="bg-red-500 text-white hover:bg-red-600"
                >
                  Desconectar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Status por módulo */}
          <div className="mt-8">
            <h3 className="text-xs font-bold text-[#888] uppercase tracking-wider mb-3 px-1">
              Módulos com dados deste @
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {modules.map((m) => {
                const Icon = m.icon;
                const active = m.count > 0;
                return (
                  <button
                    key={m.label}
                    onClick={() => navigate({ to: m.to })}
                    className="group p-3 rounded-xl border border-[#2A2A2A] bg-[#111] hover:border-primary/50 hover:bg-[#161616] transition-all text-left"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Icon className="w-4 h-4 text-[#888] group-hover:text-primary transition-colors" />
                      {moduleStatus.loading ? (
                        <div className="w-3 h-3 rounded-full bg-[#2A2A2A] animate-pulse" />
                      ) : active ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <div className="w-3 h-3 rounded-full border border-[#444]" />
                      )}
                    </div>
                    <p className="text-[10px] uppercase text-[#888] font-bold">{m.label}</p>
                    <p className="text-lg font-bold text-white mt-0.5">
                      {moduleStatus.loading ? "—" : m.count}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
