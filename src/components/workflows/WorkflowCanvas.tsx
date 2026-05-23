

import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { 
  ReactFlow, 
  Background, 
  MiniMap,
  Controls,
  useNodesState, 
  useEdgesState,
  MarkerType,
  ConnectionMode,
  Node,
  Edge
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { motion } from "framer-motion";
import { Play, Sliders, Loader2, LogOut, RefreshCw, Zap, User, Lock, Search, Plus, Minus, Download, FolderOpen, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { nodeTypes } from "./CustomNodes";
import { WorkflowDashboard } from "./WorkflowDashboard";
import { ProfileCard } from "./ProfileCard";
import { OnboardingData } from "@/lib/auth-store";
import { useAuthStore } from "@/lib/auth-store";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { fetchInstagramProfile, type InstagramProfile } from "@/lib/instagram.functions";
import { recordRun } from "@/lib/workflows.functions";
import { WorkflowsManager } from "./WorkflowsManager";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface WorkflowCanvasProps {
  data: OnboardingData;
}

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({ data }) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [profile, setProfile] = useState<InstagramProfile | null>(null);
  const [nextUpdateSeconds, setNextUpdateSeconds] = useState(60);
  const [isDisconnected, setIsDisconnected] = useState(false);
  const [rfInstance, setRfInstance] = useState<any>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [managerOpen, setManagerOpen] = useState(false);
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null);
  const [activeWorkflowName, setActiveWorkflowName] = useState<string>("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const recordRunFn = useServerFn(recordRun);
  const { 
    logout, getLayout, setLayout, user, validatedProfiles, 
    setHandleValidated, setOnboardingData, clearOnboarding, isGlobalLocked, setIsGlobalLocked 
  } = useAuthStore();
  const isLocked = isGlobalLocked; // Alias para compatibilidade com o código abaixo
  const sidebar = useSidebar();
  const router = useRouter();
  const fetchProfile = useServerFn(fetchInstagramProfile);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) {
      toast.error("O app já está instalado ou seu navegador não suporta PWA.", { icon: "ℹ️" });
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      toast.success("Obrigado por instalar o Viral Engine!");
    }
  };


  const handleLogout = () => {
    logout();
    router.navigate({ to: "/login" });
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleHardRefresh = () => {
    toast.success("Limpando cache e reiniciando...");
    setTimeout(() => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          for (let registration of registrations) {
            registration.unregister();
          }
        });
      }
      window.location.href = window.location.origin + window.location.pathname + '?refresh=' + Date.now();
    }, 1000);
  };

  const initialNodes: Node[] = [
    {
      id: "insta",
      type: "instagram",
      position: { x: 50, y: 150 },
      data: { 
        handle: data.handle, 
        niche: data.niche, 
        status: "pending", 
        active: false,
        onValidate: () => executeWorkflow(),
        isCEO: user?.role === 'CEO'
      },
    },
    {
      id: "agent",
      type: "agent",
      position: { x: 400, y: 150 },
      data: { active: false },
    },
    {
      id: "radar",
      type: "radar",
      position: { x: 750, y: 50 },
      data: { active: false },
    },
    {
      id: "hooks",
      type: "hooks",
      position: { x: 750, y: 200 },
      data: { active: false },
    },
    {
      id: "ideas",
      type: "ideas",
      position: { x: 1100, y: 50 },
      data: { active: false },
    },
    {
      id: "trends",
      type: "trends",
      position: { x: 1100, y: 200 },
      data: { active: false },
    },
    {
      id: "score",
      type: "score",
      position: { x: 1400, y: 125 },
      data: { active: false },
    },
    // Tools - centralizadas abaixo do Agent
    {
      id: "tool1",
      type: "tool",
      position: { x: 250, y: 450 },
      data: { type: "scanner", label: "Radar Viral Scanner", active: false },
    },
    {
      id: "tool2",
      type: "tool",
      position: { x: 450, y: 450 },
      data: { type: "hooks", label: "Hooks Detector", active: false },
    },
    {
      id: "tool3",
      type: "tool",
      position: { x: 650, y: 450 },
      data: { type: "audience", label: "Audience Analyzer", active: false },
    },
    {
      id: "tool4",
      type: "tool",
      position: { x: 850, y: 450 },
      data: { type: "trend", label: "Growth AI Engine", active: false },
    },
  ];

  const initialEdges: Edge[] = [
    { 
      id: "e-insta-agent", 
      source: "insta", 
      target: "agent", 
      sourceHandle: "right",
      targetHandle: "left",
      animated: false, 
      type: 'smoothstep',
      style: { stroke: isDisconnected ? "#ef4444" : "#2A2A2A", strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: isDisconnected ? "#ef4444" : "#2A2A2A" }
    },
    { 
      id: "e-agent-radar", 
      source: "agent", 
      target: "radar", 
      sourceHandle: "main",
      targetHandle: "left",
      type: 'smoothstep',
      animated: false, 
      style: { stroke: isDisconnected ? "#ef4444" : "#2A2A2A", strokeWidth: 2 } 
    },
    { 
      id: "e-agent-hooks", 
      source: "agent", 
      target: "hooks", 
      sourceHandle: "main",
      targetHandle: "left",
      type: 'smoothstep',
      animated: false, 
      style: { stroke: isDisconnected ? "#ef4444" : "#2A2A2A", strokeWidth: 2 } 
    },
    { 
      id: "e-radar-ideas", 
      source: "radar", 
      target: "ideas", 
      sourceHandle: "right",
      targetHandle: "left",
      type: 'smoothstep',
      animated: false, 
      style: { stroke: isDisconnected ? "#ef4444" : "#2A2A2A", strokeWidth: 2 } 
    },
    { 
      id: "e-hooks-trends", 
      source: "hooks", 
      target: "trends", 
      sourceHandle: "right",
      targetHandle: "left",
      type: 'smoothstep',
      animated: false, 
      style: { stroke: isDisconnected ? "#ef4444" : "#2A2A2A", strokeWidth: 2 } 
    },
    { 
      id: "e-ideas-score", 
      source: "ideas", 
      target: "score", 
      sourceHandle: "right",
      targetHandle: "left",
      type: 'smoothstep',
      animated: false, 
      style: { stroke: isDisconnected ? "#ef4444" : "#2A2A2A", strokeWidth: 2 } 
    },
    { 
      id: "e-trends-score", 
      source: "trends", 
      target: "score", 
      sourceHandle: "right",
      targetHandle: "left",
      type: 'smoothstep',
      animated: false, 
      style: { stroke: isDisconnected ? "#ef4444" : "#2A2A2A", strokeWidth: 2 } 
    },
    // Tools
    {
      id: "e-agent-tool1",
      source: "agent",
      target: "tool1",
      sourceHandle: "tools",
      targetHandle: "top",
      type: 'smoothstep',
      animated: false,
      style: { stroke: isDisconnected ? "#ef4444" : "#2A2A2A", strokeWidth: 2, strokeDasharray: "5,5" }
    },
    {
      id: "e-agent-tool2",
      source: "agent",
      target: "tool2",
      sourceHandle: "tools",
      targetHandle: "top",
      type: 'smoothstep',
      animated: false,
      style: { stroke: isDisconnected ? "#ef4444" : "#2A2A2A", strokeWidth: 2, strokeDasharray: "5,5" }
    },
    {
      id: "e-agent-tool3",
      source: "agent",
      target: "tool3",
      sourceHandle: "tools",
      targetHandle: "top",
      type: 'smoothstep',
      animated: false,
      style: { stroke: isDisconnected ? "#ef4444" : "#2A2A2A", strokeWidth: 2, strokeDasharray: "5,5" }
    },
    {
      id: "e-agent-tool4",
      source: "agent",
      target: "tool4",
      sourceHandle: "tools",
      targetHandle: "top",
      type: 'smoothstep',
      animated: false,
      style: { stroke: isDisconnected ? "#ef4444" : "#2A2A2A", strokeWidth: 2, strokeDasharray: "5,5" }
    }
  ];

  // Aplica layout salvo do usuário (posições) sobre os nós iniciais
  const nodesWithSavedLayout = useMemo(() => {
    const saved = getLayout();
    if (!saved) return initialNodes;
    const map = new Map(saved.nodes.map((n) => [n.id, n.position]));
    return initialNodes.map((n) => (map.has(n.id) ? { ...n, position: map.get(n.id)! } : n));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState(nodesWithSavedLayout);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Salva layout sempre que destravado e nós mudam (Apenas CEO pode salvar globalmente)
  useEffect(() => {
    if (isLocked || user?.role !== 'CEO') return;
    const t = window.setTimeout(() => {
      setLayout({ nodes: nodes.map((n) => ({ id: n.id, position: n.position })) });
    }, 500);
    return () => window.clearTimeout(t);
  }, [nodes, isLocked, setLayout, user?.role]);

  // Carrega estado inicial se já validado
  useEffect(() => {
    const handleKey = data.handle.toLowerCase();
    const globalProfile = validatedProfiles[handleKey];
    
    if (globalProfile) {
      setProfile(globalProfile);
      setShowReport(true);
      setNodes((nds) => nds.map((n) => (n.id === "insta" ? { ...n, data: { ...n.data, status: "connected", profile: globalProfile } } : n)));
    }
  }, [data.handle, validatedProfiles, setNodes]);

  const executeWorkflow = async () => {
    if (isExecuting) return;
    setIsExecuting(true);
    setProgress(0);
    setProfile(null);
    setShowReport(false);
    const _runStart = Date.now();
    const _nodeLogs: { id: string; label: string; status: string; duration_ms?: number }[] = [];

    // Retry agressivo: tenta até 4 vezes em paralelo com a animação
    const fetchWithRetry = async (): Promise<InstagramProfile | null> => {
      for (let attempt = 1; attempt <= 4; attempt++) {
        try {
          const result = await fetchProfile({ data: { handle: data.handle } });
          if (result && result.source !== "fallback" && result.followers !== null) {
            return result;
          }
          if (attempt < 4) {
            toast.loading(`Instagram bloqueou — tentativa ${attempt + 1}/4...`, { id: "retry", duration: 2000 });
            await new Promise((r) => setTimeout(r, 1500 * attempt));
          } else {
            return result; // último resultado mesmo se fallback
          }
        } catch (e) {
          console.error(`[fetchProfile] tentativa ${attempt} falhou:`, e);
          if (attempt < 4) await new Promise((r) => setTimeout(r, 1500 * attempt));
        }
      }
      return null;
    };

    const profilePromise = fetchWithRetry();

    const steps = [
      { nodeId: "agent", edgeId: "e-insta-agent" },
      { nodeId: "tool1", edgeId: "e-agent-tool1" },
      { nodeId: "tool2", edgeId: "e-agent-tool2" },
      { nodeId: "tool3", edgeId: "e-agent-tool3" },
      { nodeId: "tool4", edgeId: "e-agent-tool4" },
      { nodeId: "radar", edgeId: "e-agent-radar" },
      { nodeId: "hooks", edgeId: "e-agent-hooks" },
      { nodeId: "ideas", edgeId: "e-radar-ideas" },
      { nodeId: "trends", edgeId: "e-hooks-trends" },
      { nodeId: "score", edgeId: "e-ideas-score" },
    ];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const _stepStart = Date.now();
      setEdges((eds) => eds.map((e) => (e.id === step.edgeId ? { ...e, animated: true, style: { ...e.style, stroke: "var(--primary)", strokeWidth: 4, opacity: 1 } } : e)));
      await new Promise((r) => setTimeout(r, 600));
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === step.nodeId) {
            const newData = { ...n.data, active: true } as any;
            if (step.nodeId === "strategy") newData.count = 5;
            if (step.nodeId === "verification") {
              newData.active = false;
              newData.verified = true;
            }
            return { ...n, data: newData };
          }
          return n;
        }),
      );
      setProgress(((i + 1) / steps.length) * 100);
      await new Promise((r) => setTimeout(r, 400));
      _nodeLogs.push({ id: step.nodeId, label: step.nodeId, status: "success", duration_ms: Date.now() - _stepStart });
      // Não resetamos mais o animated, mantendo o fluxo constante solicitado
    }

    const realProfile = await profilePromise;
    toast.dismiss("retry");

    setNodes((nds) => nds.map((n) => (n.id === "insta" ? { ...n, data: { ...n.data, status: "connected", profile: realProfile } } : n)));
    setIsExecuting(false);
    setProgress(100);

    // NUNCA mostra dados falsos: só exibe relatório se conseguiu dados reais
    if (realProfile && realProfile.source !== "fallback" && realProfile.followers !== null) {
      setProfile(realProfile);
      setShowReport(true);
      
      // Persiste validação se for CEO ou se a coleta foi bem sucedida
      if (user?.role === 'CEO') {
        setHandleValidated(data.handle, realProfile);
        setOnboardingData({ ...data, validated: true, lastProfile: realProfile });
      }
      
      toast.success(`Dados reais coletados via ${realProfile.source}`, { icon: "✅", duration: 4000 });
    } else {
      setProfile(realProfile); // guarda só para mostrar mensagem de bloqueio
      setShowReport(true);
      if (!realProfile || realProfile.source === "fallback") {
        toast.error("Instagram bloqueou a coleta. Tente novamente em alguns instantes.", { duration: 7000 });
      }
    }

    // Registra histórico + notifica
    const _duration = Date.now() - _runStart;
    const _success = !!(realProfile && realProfile.source !== "fallback" && realProfile.followers !== null);
    if (activeWorkflowId) {
      try {
        await recordRunFn({
          data: {
            workflow_id: activeWorkflowId,
            status: _success ? "success" : "error",
            duration_ms: _duration,
            node_logs: _nodeLogs,
            estimated_tokens: _nodeLogs.length * 800,
            estimated_cost_usd: _nodeLogs.length * 0.002,
            trigger_source: "manual",
            error: _success ? null : "Instagram bloqueou a coleta",
          },
        });
      } catch (e) { console.warn("recordRun failed", e); }
    }
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      new Notification(_success ? "Fluxo concluído ✅" : "Fluxo terminou com erro", {
        body: activeWorkflowName ? `${activeWorkflowName} • ${(_duration / 1000).toFixed(1)}s` : `Duração ${(_duration / 1000).toFixed(1)}s`,
      });
    }
  };

  // Calcula notas reais (0-100) baseado nos dados coletados
  const scores = useMemo(() => {
    if (!profile || profile.source === "fallback" || profile.followers === null) return null;
    const f = profile.followers ?? 0;
    const fg = profile.following ?? 0;
    const p = profile.posts ?? 0;

    // Perfil: bio + verificação + não-privado + nome
    let perfil = 30;
    if (profile.bio && profile.bio.length > 20) perfil += 25;
    if (profile.fullName) perfil += 15;
    if (profile.isVerified) perfil += 20;
    if (!profile.isPrivate) perfil += 10;
    perfil = Math.min(100, perfil);

    // Desenvolvimento: seguidores e razão saudável
    const ratio = fg > 0 ? f / fg : f;
    let desenvolvimento = Math.min(100, Math.round(Math.log10(Math.max(f, 1)) * 22));
    if (ratio < 0.5) desenvolvimento = Math.max(10, desenvolvimento - 25);
    else if (ratio > 5) desenvolvimento = Math.min(100, desenvolvimento + 10);

    // Posts: volume de publicações
    const posts = p === 0 ? 5 : Math.min(100, Math.round(Math.log10(p + 1) * 38));

    // Últimas postagens: estimativa por densidade (posts vs seguidores)
    const density = f > 0 ? (p / f) * 1000 : 0;
    const recent = Math.min(100, Math.max(20, Math.round(40 + density * 8)));

    return { profile: perfil, development: desenvolvimento, posts, recent };
  }, [profile]);

  const overallScore = useMemo(() => {
    if (!scores) return null;
    return Math.round((scores.profile + scores.development + scores.posts + scores.recent) / 4);
  }, [scores]);

  const lastUpdate = useMemo(
    () => (scores ? new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : null),
    [scores],
  );

  // Refresh automático a cada 60s quando há perfil válido
  useEffect(() => {
    if (!profile || profile.source === "fallback") {
      setNextUpdateSeconds(60);
      setIsDisconnected(false);
      return;
    }

    const timerInterval = window.setInterval(() => {
      setNextUpdateSeconds(prev => {
        if (prev <= 1) return 60;
        return prev - 1;
      });
    }, 1000);

    const refreshInterval = window.setInterval(async () => {
      try {
        const fresh = await fetchProfile({ data: { handle: data.handle } });
        if (fresh && fresh.source !== "fallback" && fresh.followers !== null) {
          setProfile(fresh);
          setNodes((nds) => nds.map((n) => (n.id === "insta" ? { ...n, data: { ...n.data, profile: fresh } } : n)));
          setIsDisconnected(false);
          toast.success("Dados atualizados via INSTA N8N", { 
            icon: "🔄", 
            duration: 2000,
            style: { background: '#1A1A1A', color: '#fff', border: '1px solid var(--primary)' }
          });
          setNextUpdateSeconds(60);
        } else {
          // Se falhar a leitura real, muda para estado de desconexão
          setIsDisconnected(true);
        }
      } catch (e) {
        console.error("[auto-refresh] falhou:", e);
        setIsDisconnected(true);
      }
    }, 60_000);

    return () => {
      window.clearInterval(timerInterval);
      window.clearInterval(refreshInterval);
    };
  }, [profile?.handle, profile?.source, fetchProfile, data.handle]);

  // Sincronizar estado de desconexão com os nodes
  useEffect(() => {
    setNodes((nds) => 
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          disconnected: isDisconnected
        }
      }))
    );
  }, [isDisconnected, setNodes]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.id === "insta") {
      setIsProfileOpen(true);
    }
  }, []);

  // Pede permissão de notificação 1x
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Atalhos: Cmd/Ctrl+Enter executa, Cmd/Ctrl+K abre manager, F fullscreen
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key === "Enter") { e.preventDefault(); executeWorkflow(); }
      else if (meta && e.key.toLowerCase() === "k") { e.preventDefault(); setManagerOpen((v) => !v); }
      else if (!meta && e.key.toLowerCase() === "f" && (e.target as HTMLElement)?.tagName !== "INPUT" && (e.target as HTMLElement)?.tagName !== "TEXTAREA") {
        setIsFullscreen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkflowId, isExecuting]);

  const handleLoadWorkflow = useCallback((snapshot: { nodes: unknown[]; edges: unknown[] }, id: string, name: string) => {
    setActiveWorkflowId(id);
    setActiveWorkflowName(name);
    if (snapshot.nodes && snapshot.nodes.length > 0) {
      setNodes(snapshot.nodes as Node[]);
    }
    if (snapshot.edges && snapshot.edges.length > 0) {
      setEdges(snapshot.edges as Edge[]);
    }
    setManagerOpen(false);
    toast.success(`Fluxo "${name}" carregado`);
  }, [setNodes, setEdges]);

  const currentSnapshot = useMemo(() => ({ nodes, edges }), [nodes, edges]);

  return (
    <div className="flex flex-col min-h-screen bg-[#080808]">
      <header className="relative h-16 md:h-20 border-b border-[#2A2A2A] bg-[#080808] flex items-center justify-between px-4 md:px-8 shrink-0 sticky top-0 z-50 shadow-2xl">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <SidebarTrigger className="bg-[#1A1A1A] border border-[#2A2A2A] text-[#A0A0A0] hover:text-[var(--primary)] transition-colors shrink-0" />
          <div className="flex flex-col ml-1 min-w-0">
            <h1 className="font-display text-sm md:text-base font-bold text-white truncate drop-shadow-md">
              Olá, {user?.name || 'SHEY N8N'} 👋
            </h1>
            <p className="text-[10px] text-primary/80 font-medium tracking-tight whitespace-nowrap">
              Inteligência Viral Operando
            </p>
          </div>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-4 pointer-events-none">
          <div className="flex flex-col items-center">
            <h1 className="font-rajdhani text-2xl font-bold text-white tracking-widest uppercase flex items-center">
              Workfl<span className="text-[var(--primary)]">ows</span>
              {profile && profile.source !== "fallback" && (
                <div className="flex items-center gap-2 ml-4 px-3 py-1 bg-[#1A1A1A] border border-[var(--primary)]/20 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_#22c55e]" />
                  <span className="text-[10px] text-white/70 font-mono">
                    SYNC: {nextUpdateSeconds}s
                  </span>
                </div>
              )}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setManagerOpen(true)}
            className="hidden md:inline-flex h-10 px-3 rounded-xl border-white/15 bg-black/40 text-white hover:bg-white/10 font-rajdhani uppercase tracking-wider text-xs"
            title="Gerenciador de fluxos (Cmd+K)"
          >
            <FolderOpen className="w-4 h-4" />
            <span className="hidden lg:inline">{activeWorkflowName || "Fluxos"}</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFullscreen((v) => !v)}
            className="hidden md:inline-flex h-10 w-10 rounded-xl border border-white/15 bg-black/40 text-white hover:bg-white/10"
            title="Fullscreen (F)"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
          <Button
            onClick={executeWorkflow}
            disabled={isExecuting}
            className={cn(
              "h-10 px-4 md:px-6 rounded-xl font-rajdhani font-bold uppercase tracking-wider text-xs md:text-sm transition-all duration-300",
              isExecuting 
                ? "bg-[#1A1A1A] text-[#A0A0A0] border border-[#2A2A2A]" 
                : "bg-[var(--primary)] text-black hover:scale-[1.02] hover:glow-primary shadow-[0_0_20px_rgb(var(--primary-rgb)/0.3)]"
            )}
          >
            {isExecuting ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processando</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 fill-current" />
                <span>Executar</span>
              </div>
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full border border-primary/30 bg-black/60 hover:bg-primary/20 transition-all shadow-lg overflow-hidden group">
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-primary-glow text-sm font-bold text-black transition-transform group-hover:scale-110">
                  {user?.name?.[0] || 'S'}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-black/95 border-primary/30 text-white">
              <DropdownMenuLabel className="font-rajdhani text-primary uppercase tracking-widest text-xs">Ações Rápidas</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-primary/20" />
              <DropdownMenuItem onClick={handleRefresh} className="hover:bg-primary/10 cursor-pointer gap-2 focus:bg-primary/20 focus:text-white">
                <RefreshCw className="h-4 w-4 text-primary" /> Recarregar Sistema
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleHardRefresh} className="hover:bg-primary/10 cursor-pointer gap-2 focus:bg-primary/20 focus:text-white">
                <Zap className="h-4 w-4 text-yellow-500" /> Hard Reset (Limpar Cache)
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-primary/20" />
              <DropdownMenuItem onClick={handleLogout} className="hover:bg-red-500/10 text-red-400 cursor-pointer gap-2 focus:bg-red-500/20 focus:text-red-300">
                <LogOut className="h-4 w-4" /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      
      <div className="flex-1 relative flex flex-col items-center justify-start gap-6 p-2 md:p-4 overflow-y-auto overflow-x-hidden bg-[#080808]">
        <div className="w-full flex flex-col items-center z-[1] mb-6 pointer-events-none">
          <h2 className="text-5xl md:text-6xl font-rajdhani font-black text-white tracking-[0.2em] uppercase flex items-center gap-4 drop-shadow-[0_0_30px_rgb(var(--primary-rgb) / 0.5)]">
            SHEY <span className="text-[var(--primary)]">N8N</span>
          </h2>
          <div className="flex items-center gap-2 md:gap-6 mt-3 w-full justify-center">
            <div className="h-px w-6 md:w-12 bg-gradient-to-r from-transparent to-[var(--primary)]" />
            <p className="text-[10px] md:text-[16px] text-white/80 font-bold tracking-[0.25em] md:tracking-[0.6em] uppercase whitespace-nowrap">
              VIRAL INTELLIGENCE <span className="text-[var(--primary)]">V3.0</span>
            </p>
            <div className="h-px w-6 md:w-12 bg-gradient-to-l from-transparent to-[var(--primary)]" />
          </div>
        </div>
        <div className="w-full max-w-7xl mx-auto relative z-10 p-2 md:p-8 h-[520px] md:h-[750px]">
          {/* N8N Workflow Professional Glass Container */}
          <div className="absolute inset-0 rounded-[40px] md:rounded-[60px] border border-white/10 bg-[#0A0A0A]/40-[20px] shadow-[0_40px_100px_rgba(0,0,0,0.8),0_0_80px_rgb(var(--primary-rgb) / 0.05)] overflow-hidden flex flex-col group transition-all duration-700 hover:shadow-[0_40px_120px_rgba(0,0,0,0.9),0_0_100px_rgb(var(--primary-rgb) / 0.1)]">
            
            {/* Header da Bolha Estilo N8N - Ultra Professional */}
            <div className="h-14 md:h-20 border-b border-white/5 bg-black/60 flex items-center justify-between px-3 md:px-8 gap-2 z-20">
              <div className="flex items-center gap-2 md:gap-6 min-w-0 flex-1">
                <div className="hidden sm:flex gap-2.5">
                  <div className="w-3.5 h-3.5 rounded-full bg-[#FF5F56] shadow-[0_0_15px_rgba(255,95,86,0.6)] animate-pulse" />
                  <div className="w-3.5 h-3.5 rounded-full bg-[#FFBD2E] shadow-[0_0_15px_rgba(255,189,46,0.4)]" />
                  <div className="w-3.5 h-3.5 rounded-full bg-[#27C93F] shadow-[0_0_15px_rgba(39,201,63,0.4)]" />
                </div>
                <div className="hidden sm:block h-8 w-px bg-white/10" />
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 md:gap-3 min-w-0">
                    <div className="p-1 md:p-1.5 bg-[var(--primary)]/10 rounded-md border border-[var(--primary)]/20 shrink-0">
                      <Zap className="w-3 h-3 md:w-4 md:h-4 text-[var(--primary)]" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
                        <span className="text-[10px] md:text-[12px] font-rajdhani text-white font-black uppercase tracking-[0.15em] md:tracking-[0.3em] truncate">Viral Engine</span>
                        <span className="px-1 md:px-1.5 py-0.5 rounded text-[7px] md:text-[8px] bg-[var(--primary)] text-black font-black uppercase shadow-[0_0_10px_rgb(var(--primary-rgb) / 0.3)] shrink-0">v3.0</span>
                      </div>
                      <div className="hidden md:flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] text-white/40 font-mono tracking-tighter">NODE: AWS-SA-EAST-1 // ID: 0x7F2A9</span>
                        <div className="w-1 h-1 rounded-full bg-white/20" />
                        <span className="text-[9px] text-emerald-400/70 font-mono uppercase font-bold tracking-tighter flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                          System Healthy
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 md:gap-10 shrink-0">
                <div className="hidden xl:flex items-center gap-8">
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] text-white/20 uppercase font-mono tracking-[0.2em] mb-1">Compute Latency</span>
                    <div className="flex items-end gap-1">
                      <span className="text-[11px] text-[var(--primary)] font-mono font-bold">0.02ms</span>
                      <div className="flex gap-0.5 h-3 items-end mb-0.5">
                        <div className="w-1 h-2 bg-[var(--primary)]/40 rounded-t-sm" />
                        <div className="w-1 h-3 bg-[var(--primary)] rounded-t-sm" />
                        <div className="w-1 h-1 bg-[var(--primary)]/20 rounded-t-sm" />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] text-white/20 uppercase font-mono tracking-[0.2em] mb-1">Throughput</span>
                    <span className="text-[11px] text-white/80 font-mono font-bold">128 req/s</span>
                  </div>
                </div>
                
                <div className="hidden md:block h-10 w-px bg-white/10" />
                
                <div className="flex items-center gap-2 md:gap-4">
                  <div className="hidden sm:flex flex-col items-end md:mr-2">
                    <div className="px-2 md:px-3 py-1 bg-emerald-500/5 border border-emerald-500/20 rounded-full flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)] animate-pulse" />
                      <span className="text-[9px] md:text-[10px] text-emerald-400 font-black tracking-widest uppercase">Live</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5 md:gap-2 p-1 md:p-1.5 bg-white/5 rounded-xl md:rounded-2xl border border-white/10">
                    
                    <button 
                      onClick={() => executeWorkflow()}
                      className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[var(--primary)] hover:text-black transition-all duration-300 group/btn shadow-lg"
                      title="Executar Workflow"
                    >
                      <Zap className="w-3.5 h-3.5 md:w-4 md:h-4 transition-transform group-hover/btn:scale-110" />
                    </button>
                    
                    <button className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all duration-300 shadow-lg">
                      <RefreshCw className="w-3.5 h-3.5 md:w-4 md:h-4 text-white/40" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 relative">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                onNodeClick={onNodeClick}
                onInit={setRfInstance}
                connectionMode={ConnectionMode.Loose}
                nodesDraggable={true}
                nodesConnectable={true}
                elementsSelectable={true}
                panOnDrag={true}
                zoomOnScroll={true}
                zoomOnPinch={true}
                fitView
                fitViewOptions={{ padding: 0.2, duration: 1000 }}
                style={{ background: "transparent" }}
              >
                <Background 
                  color="#ffffff" 
                  gap={40} 
                  size={1} 
                  className="opacity-[0.03]" 
                />
                <MiniMap
                  pannable
                  zoomable
                  className="!bg-black/60 !border !border-white/10 !rounded-lg hidden md:block"
                  nodeColor={() => "var(--primary)"}
                  maskColor="rgba(0,0,0,0.7)"
                />
                <Controls className="!bg-black/60 !border !border-white/10 !rounded-lg [&>button]:!bg-transparent [&>button]:!border-white/10 [&>button]:!text-white" />
              </ReactFlow>
            </div>
            
            {/* Professional Footer Bar */}
            <div className="h-8 md:h-10 border-t border-white/5 bg-black/40 flex items-center justify-between px-3 md:px-8 gap-2 z-20">
              <div className="flex items-center gap-2 md:gap-4 text-[8px] md:text-[9px] font-mono text-white/30 uppercase tracking-widest min-w-0">
                <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50 shrink-0" /> API</span>
                <span className="flex items-center gap-1.5 truncate"><div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]/50 shrink-0" /> <span className="hidden sm:inline">ENCRYPTION: </span>AES-256</span>
              </div>
              <div className="text-[8px] md:text-[9px] font-mono text-white/20 uppercase tracking-tighter truncate shrink-0">
                <span className="hidden md:inline">SHEY_PROTOCOL_V2.0.4 // </span>BUILT_WITH_LOVABLE
              </div>
            </div>
          </div>
        </div>

        <div className="w-full max-w-7xl mx-auto pb-12">
          <WorkflowDashboard 
            handle={data.handle} 
            niche={data.niche} 
            goal={data.goal} 
            profile={profile} 
            onRefresh={executeWorkflow}
            onDisconnect={clearOnboarding}
          />
        </div>
      </div>

      <WorkflowsManager
        open={managerOpen}
        onOpenChange={setManagerOpen}
        currentSnapshot={currentSnapshot}
        onLoad={handleLoadWorkflow}
        activeWorkflowId={activeWorkflowId}
      />
    </div>
  );
};
