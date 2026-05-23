import { Bell, Moon, Infinity as InfinityIcon, Download, Search, Plus, Minus, AlertTriangle, LogOut, Settings, RotateCw, Eye, EyeOff } from "lucide-react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuthStore } from "@/lib/auth-store";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { getDashboardStats } from "@/lib/dashboard.functions";
import { NotificationsBell } from "@/components/dashboard/NotificationsBell";
import { GlobalSearch } from "@/components/dashboard/GlobalSearch";
import { supabase } from "@/integrations/supabase/client";
import packageJson from "../../../package.json";

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Dashboard", subtitle: "REAL-TIME OPERATIONS V3.0" },
  "/workflows": { title: "Flows", subtitle: "VIRAL INTELLIGENCE V3.0" },
  "/integracoes": { title: "APIs", subtitle: "API GATEWAY V3.0" },
  "/automacoes-ia": { title: "SHEY AI", subtitle: "AI STRATEGIST V3.0" },
  "/calendario": { title: "Calendar", subtitle: "CONTENT PLANNER V3.0" },
  "/ganchos": { title: "Ganchos", subtitle: "VIRAL HOOKS LIBRARY V3.0" },
  "/concorrente": { title: "Comp", subtitle: "COMPETITOR INTEL V3.0" },
  "/carrossel": { title: "Carrossel", subtitle: "CAROUSEL FACTORY V3.0" },
  "/transcricao": { title: "Scribe", subtitle: "REEL TRANSCRIBER V3.0" },
  "/user": { title: "User", subtitle: "PROFILE CONFIG V3.0" },
  "/execucoes": { title: "Execuções", subtitle: "ACTIVITY HISTORY V3.0" },
  "/configuracoes": { title: "Settings", subtitle: "SYSTEM CONFIG V3.0" },
  "/projetos": { title: "Projects", subtitle: "PROJECT HUB V3.0" },
  "/mentorias": { title: "Mentor", subtitle: "STRATEGY MENTORSHIP V3.0" },
  "/admin": { title: "Admin", subtitle: "ADMIN PANEL V3.0" },
};

function IgAvatar({ handle, profilePic, fallbackLetter }: { handle: string; profilePic?: string | null; fallbackLetter: string }) {
  const sources = useMemo(() => {
    const list: string[] = [];
    if (profilePic) {
      if (/(cdninstagram\.com|fbcdn\.net)/i.test(profilePic)) {
        list.push(`/api/public/ig-thumb?url=${encodeURIComponent(profilePic)}`);
      } else {
        list.push(profilePic);
      }
    }
    if (handle) {
      list.push(`https://unavatar.io/instagram/${handle}?fallback=false`);
      list.push(`https://unavatar.io/${handle}?fallback=false`);
    }
    return list;
  }, [handle, profilePic]);
  const [idx, setIdx] = useState(0);
  const src = sources[idx];
  if (!src) return <>{fallbackLetter}</>;
  return (
    <img
      src={src}
      alt={handle || 'avatar'}
      className="h-full w-full object-cover"
      referrerPolicy="no-referrer"
      onError={() => setIdx((i) => i + 1)}
    />
  );
}

const MIN_ZOOM = 100;
const MAX_ZOOM = 150;

export function DashboardHeader() {
  const { user, previewAsClient, setPreviewAsClient } = useAuthStore();
  const onboarding = useAuthStore((s) => (s.user ? s.onboardingByUser[s.user.id] ?? null : null));
  const validatedProfiles = useAuthStore((s) => s.validatedProfiles);
  const lastHandle = useAuthStore((s) => s.lastHandle);
  const handle = (onboarding?.handle || lastHandle || '').replace(/^@+/, '').toLowerCase();
  const profilePic = handle ? (validatedProfiles[handle]?.profilePic as string | undefined) : undefined;
  const fallbackLetter = user?.name?.[0] || 'S';
  const location = useLocation();
  const navigate = useNavigate();
  const isCEO = user?.role === 'CEO';
  const meta = PAGE_META[location.pathname] || { title: "SHEY N8N", subtitle: "VIRAL INTELLIGENCE V3.0" };
  const pageTitle = meta.title;
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [health, setHealth] = useState<"healthy" | "warning" | "critical" | "unknown">("unknown");

  useEffect(() => {
    const check = async () => {
      try {
        const stats = await getDashboardStats();
        setHealth(stats.health);
      } catch {}
    };
    check();
    const t = setInterval(check, 30000);
    return () => clearInterval(t);
  }, []);

  const healthMeta = {
    healthy: { dot: "bg-emerald-500", glow: "shadow-[0_0_8px_rgba(16,185,129,0.6)]", text: "text-emerald-500", label: "Sistema OK" },
    warning: { dot: "bg-amber-500", glow: "shadow-[0_0_8px_rgba(245,158,11,0.6)]", text: "text-amber-500", label: "Atenção" },
    critical: { dot: "bg-red-500", glow: "shadow-[0_0_8px_rgba(239,68,68,0.6)]", text: "text-red-500", label: "Estado Crítico" },
    unknown: { dot: "bg-zinc-500", glow: "", text: "text-zinc-500", label: "Status" },
  };

  const currentHealth = healthMeta[health];



  const ZOOM_KEY = "shey:zoom";
  const [zoom, setZoom] = useState<number>(() => {
    if (typeof window === "undefined") return 100;
    const saved = localStorage.getItem(ZOOM_KEY);
    if (saved) {
      const n = parseInt(saved, 10);
      if (!isNaN(n)) return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, n));
    }
    return 100;
  });

  useEffect(() => {
    const safeZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
    document.documentElement.style.fontSize = `${(safeZoom / 100) * 16}px`;
    if (safeZoom !== zoom) setZoom(safeZoom);
    try { localStorage.setItem(ZOOM_KEY, String(safeZoom)); } catch {}
  }, [zoom]);

  const zoomIn = () => setZoom((z) => Math.min(MAX_ZOOM, z + 10));
  const zoomOut = () => setZoom((z) => Math.max(MIN_ZOOM, z - 10));
  const zoomReset = () => setZoom(100);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    if (isStandalone) {
      setIsInstalled(true);
    }

    if ((window as any).__sheyPwaInstallPrompt) {
      setDeferredPrompt((window as any).__sheyPwaInstallPrompt);
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      (window as any).__sheyPwaInstallPrompt = e;
      setDeferredPrompt(e);
      setIsInstalled(false);
      console.log('PWA: Prompt ready in Header');
    };

    const handleStoredInstallPrompt = () => {
      setDeferredPrompt((window as any).__sheyPwaInstallPrompt);
      setIsInstalled(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('shey-pwa-install-ready', handleStoredInstallPrompt);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      (window as any).__sheyPwaInstallPrompt = null;
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('shey-pwa-install-ready', handleStoredInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isAndroid = /Android/.test(ua);
    const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
    const isFirefox = /Firefox/.test(ua);

    if (isInstalled) {
      toast.success("SHEY VIRAL já está instalado neste dispositivo!");
      return;
    }

    const installPrompt = deferredPrompt || (window as any).__sheyPwaInstallPrompt;

    if (installPrompt) {
      try {
        installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        if (outcome === 'accepted') {
          setDeferredPrompt(null);
          (window as any).__sheyPwaInstallPrompt = null;
          setIsInstalled(true);
          toast.success("Aplicativo instalado com sucesso! 🎉");
        } else {
          toast("Instalação cancelada. Se quiser, clique em BAIXAR APP novamente.", { duration: 6000 });
        }
      } catch (err) {
        toast.error("O navegador bloqueou o instalador agora. Recarregue a página e tente novamente no Chrome ou Edge.");
      }
      return;
    }

    if (isIOS) {
      toast(
        "📲 No iPhone/iPad: toque em Compartilhar (ícone de seta) → 'Adicionar à Tela de Início'.",
        { duration: 8000 }
      );
    } else if (isAndroid) {
      toast(
        "📱 No Android: toque no menu (⋮) do navegador → 'Instalar aplicativo' ou 'Adicionar à tela inicial'.",
        { duration: 8000 }
      );
    } else if (isSafari) {
      toast(
        "🍎 No Safari: vá em Arquivo → 'Adicionar ao Dock' para instalar.",
        { duration: 8000 }
      );
    } else if (isFirefox) {
      toast(
        "🦊 Firefox não suporta instalação PWA. Use Chrome, Edge ou Brave para instalar.",
        { duration: 8000 }
      );
    } else {
      toast(
        "💻 No notebook, use Chrome ou Edge, publique/abra o site fora do preview e aguarde alguns segundos. Quando o botão ficar laranja pulsando, clique em BAIXAR APP para abrir a instalação.",
        { duration: 10000 }
      );
    }
  };

  return (
    <>
    <header className="flex flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-8 md:py-6 transition-all duration-200">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <SidebarTrigger className="h-12 w-12 md:h-7 md:w-7 [&_svg]:size-7 md:[&_svg]:size-4 rounded-2xl border-2 border-primary/40 bg-primary/15 text-primary hover:bg-primary/25 shadow-[0_0_18px_rgba(255,107,53,0.35)] shrink-0" />
          <div className="flex flex-col min-w-0">
            <h1 className="font-display text-2xl md:text-2xl font-bold text-foreground flex items-center gap-2 truncate">
              Olá, {user?.name?.split(' ')[0] || 'SHEY'} <span className="animate-bounce inline-block">👋</span>
            </h1>
          </div>
        </div>
        
        {/* Mobile quick actions */}
        <div className="flex items-center gap-2 md:hidden shrink-0">
          <NotificationsBell />
          <Popover>
            <PopoverTrigger asChild>
              <button className="h-11 w-11 flex items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-base overflow-hidden ring-2 ring-primary/40">
                <IgAvatar handle={handle} profilePic={profilePic} fallbackLetter={fallbackLetter} />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-2">
               <div className="px-2 py-2 border-b border-border mb-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground truncate">{user?.name || 'Usuário'}</p>
                  <span className="text-[9px] font-black uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded">V {packageJson.version}</span>
                </div>
                {user?.email && <p className="text-xs text-muted-foreground truncate">{user.email}</p>}
              </div>

              {/* Zoom controls */}
              <div className="px-2 py-2 border-b border-border mb-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Zoom</p>
                <div className="flex items-center justify-between gap-2">
                  <Button variant="outline" size="icon" onClick={zoomOut} aria-label="Diminuir zoom" className="h-8 w-8">
                    <Minus className="h-4 w-4" />
                  </Button>
                  <button
                    onClick={zoomReset}
                    className="flex-1 rounded-md px-2 py-1 text-xs font-bold tabular-nums hover:bg-muted"
                  >
                    {zoom}%
                  </button>
                  <Button variant="outline" size="icon" onClick={zoomIn} aria-label="Aumentar zoom" className="h-8 w-8">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Link to="/configuracoes" className="flex items-center gap-2 w-full rounded-md px-2 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                <Settings className="h-4 w-4" /> Configurações
              </Link>

              {isCEO && (
                <button
                  onClick={() => {
                    setPreviewAsClient(!previewAsClient);
                    toast.success(previewAsClient ? "Visão de Administrador ativada" : "Simulando visão de Cliente");
                  }}
                  className={`flex items-center gap-2 w-full rounded-md px-2 py-2 text-sm transition-colors ${previewAsClient ? "bg-primary/20 text-primary" : "text-foreground hover:bg-muted"}`}
                >
                  {previewAsClient ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {previewAsClient ? "Voltar para Admin" : "Ver como Cliente"}
                </button>
              )}

              <button
                onClick={() => {
                  toast.success("Limpando cache e reiniciando...");
                  setTimeout(() => {
                    if ('serviceWorker' in navigator) {
                      navigator.serviceWorker.getRegistrations().then((regs) => {
                        for (const r of regs) r.unregister();
                      });
                    }
                    window.location.href = window.location.origin + window.location.pathname + '?refresh=' + Date.now();
                  }, 800);
                }}
                className="flex items-center gap-2 w-full rounded-md px-2 py-2 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <RotateCw className="h-4 w-4" /> Forçar atualização
              </button>

              <div className="my-1 border-t border-border" />
              <button
                onClick={() => {
                  supabase.auth.signOut().finally(() => useAuthStore.getState().logout());
                  toast.success("Sessão encerrada");
                  navigate({ to: "/login" });
                }}
                className="flex items-center gap-2 w-full rounded-md px-2 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="h-4 w-4" /> Sair
              </button>
            </PopoverContent>
          </Popover>
        </div>
      </div>



      <div className="hidden md:flex items-center justify-between gap-3 md:justify-end">
        {!isInstalled && (
          <button
            onClick={handleInstallClick}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold tracking-wide transition-all ${
              deferredPrompt
                ? "bg-primary text-primary-foreground animate-pulse shadow-[0_0_20px_hsl(var(--primary)/0.6)]"
                : "border border-primary/50 bg-primary/10 text-foreground hover:bg-primary/20"
            }`}
          >
            <Download className={`h-4 w-4 ${deferredPrompt ? "animate-bounce" : ""}`} />
            <span className="font-display">BAIXAR APP</span>
          </button>
        )}

        <button
          type="button"
          className="group hidden sm:inline-flex items-center gap-2 rounded-full border border-primary/50 bg-primary/5 px-4 py-2 text-xs font-bold tracking-wide text-foreground transition-all hover:bg-primary/10 hover:glow-primary"
        >
          <InfinityIcon className="h-4 w-4 text-primary" strokeWidth={2.5} />
          <span className="font-display">UNLIMITED MODE</span>
        </button>

        <div className="flex items-center gap-1">
          <GlobalSearch />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Zoom" className="relative">
                <span className="text-[10px] font-bold tabular-nums">{zoom}%</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-44 p-2">
              <div className="flex items-center justify-between gap-2">
                <Button variant="outline" size="icon" onClick={zoomOut} aria-label="Diminuir zoom" className="h-8 w-8">
                  <Minus className="h-4 w-4" />
                </Button>
                <button
                  onClick={zoomReset}
                  className="flex-1 rounded-md px-2 py-1 text-xs font-bold tabular-nums hover:bg-muted"
                  aria-label="Resetar zoom"
                >
                  {zoom}%
                </button>
                <Button variant="outline" size="icon" onClick={zoomIn} aria-label="Aumentar zoom" className="h-8 w-8">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          <NotificationsBell />

          <Button variant="ghost" size="icon" aria-label="Alternar tema">
            <Moon className="h-4 w-4" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="ml-1 flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-primary-glow text-sm font-bold text-primary-foreground transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/60"
                aria-label="Abrir menu do usuário"
              >
                <IgAvatar handle={handle} profilePic={profilePic} fallbackLetter={fallbackLetter} />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-2">
               <div className="px-2 py-2 border-b border-border mb-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground truncate">{user?.name || 'Usuário'}</p>
                  <span className="text-[9px] font-black uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded">V {packageJson.version}</span>
                </div>
                {user?.email && <p className="text-xs text-muted-foreground truncate">{user.email}</p>}
              </div>
              <Link
                to="/configuracoes"
                className="flex items-center gap-2 w-full rounded-md px-2 py-2 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <Settings className="h-4 w-4" />
                Configurações
              </Link>
              {isCEO && (
                <button
                  onClick={() => {
                    setPreviewAsClient(!previewAsClient);
                    toast.success(previewAsClient ? "Visão de Administrador ativada" : "Simulando visão de Cliente");
                  }}
                  className={`flex items-center gap-2 w-full rounded-md px-2 py-2 text-sm transition-colors ${previewAsClient ? "bg-primary/20 text-primary" : "text-foreground hover:bg-muted"}`}
                >
                  {previewAsClient ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {previewAsClient ? "Voltar para Admin" : "Ver como Cliente"}
                </button>
              )}
              <button
                onClick={() => {
                  toast.success("Limpando cache e reiniciando...");
                  setTimeout(() => {
                    if ('serviceWorker' in navigator) {
                      navigator.serviceWorker.getRegistrations().then((regs) => {
                        for (const r of regs) r.unregister();
                      });
                    }
                    window.location.href = window.location.origin + window.location.pathname + '?refresh=' + Date.now();
                  }, 800);
                }}
                className="flex items-center gap-2 w-full rounded-md px-2 py-2 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <RotateCw className="h-4 w-4" />
                Forçar atualização
              </button>
              <div className="my-1 border-t border-border" />
              <button
                onClick={() => {
                  supabase.auth.signOut().finally(() => useAuthStore.getState().logout());
                  toast.success("Sessão encerrada");
                  navigate({ to: "/login" });
                }}
                className="flex items-center gap-2 w-full rounded-md px-2 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </header>

    <div className="relative w-full flex flex-col items-center justify-center pt-8 pb-4 md:pt-10 md:pb-6 overflow-hidden">
      
      <h2 className="relative text-3xl md:text-4xl font-rajdhani font-black text-white tracking-[0.2em] uppercase flex items-center drop-shadow-[0_0_24px_rgb(var(--primary-rgb)/0.5)]">
        {pageTitle.length > 3 ? pageTitle.slice(0, -3) : ""}
        <span className="text-[var(--primary)]">{pageTitle.slice(-3)}</span>
      </h2>
      <div className="relative flex items-center gap-2 md:gap-5 mt-2 w-full justify-center px-4">
        <div className="h-0.5 w-12 md:w-24 bg-primary rounded-full shadow-[0_0_10px_rgb(var(--primary-rgb)/0.5)]" />
        <p className="text-[10px] md:text-[12px] text-white/70 font-bold tracking-[0.25em] md:tracking-[0.45em] uppercase whitespace-nowrap">
          {meta.subtitle.split(" ").slice(0, -1).join(" ")}{" "}
          <span className="text-[var(--primary)]">{meta.subtitle.split(" ").slice(-1)}</span>
        </p>
        <div className="h-0.5 w-12 md:w-24 bg-primary rounded-full shadow-[0_0_10px_rgb(var(--primary-rgb)/0.5)]" />
      </div>
    </div>
    </>
  );
}
