import { Link, useRouterState, useRouter } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Workflow,
  KeyRound,
  Bot,
  
  SlidersHorizontal,
  Infinity as InfinityIcon,
  CreditCard,
  Download,
  CalendarDays,
  Sparkles,
  Search,
  Users,
  LayoutGrid,
  Mic,
  Video,
  UserCog,
  FolderKanban,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertTriangle,
  Lock,
  PlayCircle,
  Plug,
  Gauge,
  LifeBuoy,
} from "lucide-react";


import { hasFeature, FeatureKey } from "@/lib/plan-utils";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/auth-store";
import { getPlanName } from "@/lib/plan-utils";
import packageJson from "../../package.json";
import { useDashboardStatus } from "@/lib/use-dashboard-status";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sparkles as SparklesIcon, History, ListChecks, ChevronRight } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/Logo";

type NavItem = { 
  title: string; 
  url: string; 
  icon: React.ComponentType<{ className?: string }>; 
  adminOnly?: boolean;
  feature?: FeatureKey;
  badge?: number | string;
  statusDot?: "green" | "amber" | "red";
};
type NavGroup = { label: string; items: NavItem[]; adminOnly?: boolean };

const groups: NavGroup[] = [
  {
    label: "PLATAFORMA",
    items: [
      { title: "DASHBOARD", url: "/", icon: Gauge, statusDot: "green" },
      { title: "USER", url: "/user", icon: UserCog },
      { title: "EXECUÇÕES", url: "/execucoes", icon: PlayCircle, feature: 'RADAR_VIRAL' },
    ],
  },
  {
    label: "CRIAÇÃO VIRAL",
    items: [
      { title: "SCRIBE", url: "/transcricao", icon: Mic, feature: 'SCRIBE' },
      { title: "SHEY AI", url: "/automacoes-ia", icon: Bot, feature: 'SHEY_AI' },
      { title: "GANCHOS", url: "/ganchos", icon: Sparkles, feature: 'GANCHOS_VIRAIS' },
      { title: "CALENDAR", url: "/calendario", icon: CalendarDays, feature: 'CALENDAR_CONTEUDO' },
      { title: "CARROSSEL", url: "/carrossel", icon: LayoutGrid, feature: 'RADAR_VIRAL' }, // Libera para todos
    ],
  },
  {
    label: "INTELIGÊNCIA",
    items: [
      { title: "COMP", url: "/concorrente", icon: Users, feature: 'ANALISE_CONCORRENTE' },
      { title: "FLOWS", url: "/workflows", icon: Workflow, feature: 'SHEY_AI' }, // Libera no PRO+
      { title: "MENTOR", url: "/mentorias", icon: Video, feature: 'MENTORIAS' },
      { title: "PROFILES", url: "/analise", icon: Search, feature: 'CEO' as any }, // Assuming CEO only
    ],
  },
  {
    label: "AJUSTES",
    items: [
      { title: "PLANOS", url: "/planos", icon: CreditCard },
      { title: "SETTINGS", url: "/configuracoes", icon: SlidersHorizontal },
      { title: "PROJECTS", url: "/projetos", icon: FolderKanban, feature: 'PROJECT_MANAGEMENT' },
      { title: "SUPORTE", url: "/suporte", icon: LifeBuoy },
    ],
  },
  {
    label: "CEO",
    adminOnly: true,
    items: [
      { title: "INTEGRAÇÕES", url: "/integracoes", icon: KeyRound },
      { title: "ADMIN PANEL", icon: ShieldCheck, url: "/admin" },
    ],
  },
];


export function AppSidebar() {
  const sidebar = useSidebar();
  const state = sidebar?.state || "expanded";
  const collapsed = state === "collapsed" && !sidebar?.isMobile;
  const setOpenMobile = sidebar?.setOpenMobile;
  const isMobile = sidebar?.isMobile;
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, logout, previewAsClient, setPreviewAsClient } = useAuthStore();
  const onboardingData = useAuthStore((s) => (s.user ? s.onboardingByUser[s.user.id] ?? null : null));
  const isCEO = user?.role === 'CEO';
  const effectiveIsCEO = isCEO && !previewAsClient;
  const dashStatus = useDashboardStatus();


  const handleNavClick = () => {

    if (isMobile && setOpenMobile) setOpenMobile(false);
  };
  
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    if (isStandalone) setIsInstalled(true);

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstalled(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      toast.success("Sistema instalado com sucesso!");
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPWA = async () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    if (isInstalled) {
      toast.success("O sistema já está instalado!");
      return;
    }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsInstalled(true);
      }
    } else if (isIOS) {
      toast("No iPhone: Compartilhar → 'Adicionar à Tela de Início'.", { duration: 6000, icon: "📲" });
    } else {
      toast("Use 'Instalar' no menu do navegador.", { duration: 6000 });
    }
  };

  const handleLogout = async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { logActivity, clearSessionId } = await import("@/lib/activity-logger");
    await logActivity({ event_type: "logout", description: "Saiu do painel", status: "info" });
    clearSessionId();
    await supabase.auth.signOut();
    logout();
    router.navigate({ to: "/login" });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-3 py-4">
        <Logo collapsed={collapsed} />
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        {groups.filter(g => !g.adminOnly || effectiveIsCEO).map((group) => (
          <SidebarGroup key={group.label}>
            {!collapsed && (
              <SidebarGroupLabel className="px-2 text-[12px] md:text-[11px] font-bold uppercase tracking-[0.18em] text-sidebar-foreground/60 mb-1.5">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {group.items
                  .filter(i => !i.adminOnly || effectiveIsCEO)
                  .filter(i => !i.feature || (user?.plan && hasFeature(user.plan, i.feature)) || effectiveIsCEO)
                  .map((item) => {
                  const active = pathname === item.url;
                  const isDashboard = item.url === "/";
                  // Real data for DASHBOARD; static for others
                  const dynamicBadge = isDashboard ? dashStatus.badge : item.badge;
                  const liveDot = isDashboard ? dashStatus.health : item.statusDot;
                  const dotColor =
                    liveDot === "green" ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" :
                    liveDot === "amber" ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]" :
                    liveDot === "red" ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9)]" : "";

                  const tooltipText = isDashboard
                    ? `DASHBOARD · ${dashStatus.pendingLabel}`
                    : item.title;

                  const Inner = (
                    <>
                      <span className="relative shrink-0">
                        <item.icon className="h-[22px] w-[22px] md:h-[18px] md:w-[18px]" />
                        {liveDot && (
                          <span className={`absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full ${dotColor} animate-pulse`} />
                        )}
                      </span>
                      <span className="flex-1 flex items-center gap-1.5">
                        {item.title}
                        {isDashboard && dynamicBadge ? (
                          <span className="text-[8px] font-mono font-bold tracking-tighter text-primary animate-pulse">NEW</span>
                        ) : null}
                      </span>
                      {dynamicBadge ? (
                        <span className={
                          "ml-auto min-w-[18px] h-[18px] px-1.5 inline-flex items-center justify-center rounded-full text-[10px] font-bold " +
                          (active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary text-primary-foreground")
                        }>
                          {dynamicBadge}
                        </span>
                      ) : null}
                    </>
                  );

                  const ButtonNode = (
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={tooltipText}
                      className={
                        "h-12 md:h-11 text-[14px] md:text-[12.5px] font-bold tracking-wider uppercase rounded-lg " +
                        (active
                          ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground glow-primary-sm"
                          : "text-sidebar-foreground/80 hover:text-sidebar-foreground")
                      }
                    >
                      {item.url.includes("?") ? (
                        <a href={item.url} onClick={handleNavClick} className="flex items-center gap-3">
                          {Inner}
                        </a>
                      ) : (
                        <Link to={item.url} onClick={handleNavClick} className="flex items-center gap-3">
                          {Inner}
                        </Link>
                      )}
                    </SidebarMenuButton>
                  );

                  return (
                    <SidebarMenuItem key={item.url}>
                      {isDashboard && !collapsed ? (
                        <div className="flex items-center gap-1 group/dash">
                          <div className="flex-1">{ButtonNode}</div>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                aria-label="Atalhos rápidos do Dashboard"
                                className="h-8 w-7 flex items-center justify-center rounded-md text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ChevronRight className="h-3.5 w-3.5" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent side="right" align="start" className="w-56 p-1.5">
                              <p className="px-2 py-1.5 text-[10px] font-bold tracking-wider uppercase text-muted-foreground">
                                Acesso rápido
                              </p>
                              <Link
                                to="/execucoes"
                                onClick={handleNavClick}
                                className="flex items-center gap-2 px-2 py-2 rounded-md text-xs hover:bg-accent transition"
                              >
                                <History className="h-3.5 w-3.5 text-primary" />
                                Última atividade
                              </Link>
                              <Link
                                to="/user"
                                onClick={handleNavClick}
                                className="flex items-center gap-2 px-2 py-2 rounded-md text-xs hover:bg-accent transition"
                              >
                                <ListChecks className="h-3.5 w-3.5 text-primary" />
                                Pendências
                              </Link>
                              <Link
                                to="/ganchos"
                                onClick={handleNavClick}
                                className="flex items-center gap-2 px-2 py-2 rounded-md text-xs hover:bg-accent transition"
                              >
                                <SparklesIcon className="h-3.5 w-3.5 text-primary" />
                                Resumo de hoje
                              </Link>
                              <div className="border-t my-1" />
                              <p className="px-2 py-1 text-[10px] text-muted-foreground">
                                Status: <span className="text-foreground font-semibold">{dashStatus.pendingLabel}</span>
                              </p>
                            </PopoverContent>
                          </Popover>
                        </div>
                      ) : (
                        ButtonNode
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border gap-3 p-3">
        {!collapsed && (
          <div className="flex flex-col gap-3">
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 glow-primary-sm overflow-hidden">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <InfinityIcon className="h-4 w-4 text-primary shrink-0" strokeWidth={2.5} />
                  <span className="font-display text-xs font-bold tracking-wide text-foreground flex items-center gap-2 whitespace-nowrap">
                    UNLIMITED MODE
                    <span className="text-[10px] font-mono font-bold tracking-tighter text-primary">V{packageJson.version}</span>
                  </span>
                </div>
              </div>

              <button
                onClick={handleInstallPWA}
                className={`mt-3 w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-md transition-all duration-300 font-bold text-[10px] uppercase tracking-wider ${
                  deferredPrompt
                  ? "bg-primary text-primary-foreground hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_15px_rgb(var(--primary-rgb)/0.4)] animate-pulse"
                  : (isInstalled
                    ? "bg-white/5 text-white/20 border border-white/5 cursor-default opacity-50"
                    : "bg-primary text-primary-foreground hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgb(var(--primary-rgb)/0.6)] animate-pulse")
                }`}
              >
                <Download className={`h-3.5 w-3.5 ${deferredPrompt ? "animate-bounce" : ""}`} />
                {deferredPrompt ? "INSTALAR APP" : (isInstalled ? "INSTALADO COM SUCESSO" : "INSTALAR APP")}
              </button>
            </div>

            <div className="flex items-center justify-center px-1">
              {/* Profile and Logout removed as requested */}
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
