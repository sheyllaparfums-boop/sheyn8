
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
import { motion, AnimatePresence } from "framer-motion";
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
  const isLocked = isGlobalLocked;
  const sidebar = useSidebar();
  const router = useRouter();
  const fetchProfile = useServerFn(fetchInstagramProfile);

  // Otimização de renderização: Memoize nodeTypes e edge options
  const memoNodeTypes = useMemo(() => nodeTypes, []);
  const defaultEdgeOptions = useMemo(() => ({
    type: 'smoothstep',
    animated: false,
    style: { strokeWidth: 2 },
  }), []);

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

  const nodesWithSavedLayout = useMemo(() => {
    const saved = getLayout();
    if (!saved) return initialNodes;
    const map = new Map(saved.nodes.map((n) => [n.id, n.position]));
    return initialNodes.map((n) => (map.has(n.id) ? { ...n, position: map.get(n.id)! } : n));
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState(nodesWithSavedLayout);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    if (isLocked || user?.role !== 'CEO') return;
    const t = window.setTimeout(() => {
      setLayout({ nodes: nodes.map((n) => ({ id: n.id, position: n.position })) });
    }, 500);
    return () => window.clearTimeout(t);
  }, [nodes, isLocked, setLayout, user?.role]);

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
            return result;
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
    }

    const realProfile = await profilePromise;
    toast.dismiss("retry");

    setNodes((nds) => nds.map((n) => (n.id === "insta" ? { ...n, data: { ...n.data, status: "connected", profile: realProfile } } : n)));
    setIsExecuting(false);
    setProgress(100);

    if (realProfile && realProfile.source !== "fallback" && realProfile.followers !== null) {
      setProfile(realProfile);
      setShowReport(true);
      
      if (user?.role === 'CEO') {
        setHandleValidated(data.handle, realProfile);
        setOnboardingData({ ...data, validated: true, lastProfile: realProfile });
      }
      
      toast.success(`Dados reais coletados via ${realProfile.source}`, { icon: "✅", duration: 4000 });
    } else {
      setProfile(realProfile);
      setShowReport(true);
      toast.error("Limite de requisições do Instagram atingido. Exibindo dados de cache.", { duration: 5000 });
    }

    if (user?.id) {
      try {
        await recordRunFn({
          data: {
            workflowId: activeWorkflowId || 'default-onboarding',
            durationMs: Date.now() - _runStart,
            status: 'success',
            triggerSource: 'manual',
            nodeLogs: _nodeLogs
          }
        });
      } catch (err) {
        console.error("Erro ao registrar execução:", err);
      }
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      canvasContainerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div 
      ref={canvasContainerRef}
      className={cn(
        "relative h-full w-full bg-[#040404] overflow-hidden gpu-accelerated",
        isFullscreen && "fixed inset-0 z-[100] h-screen w-screen"
      )}
    >
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <div className="absolute top-6 left-6 right-6 z-10 flex justify-between items-start pointer-events-none">
        <div className="flex items-center gap-4 pointer-events-auto">
          <SidebarTrigger className="h-10 w-10 bg-black/40 border border-white/10 backdrop-blur-md hover:bg-black/60 transition-all" />
          <div className="flex flex-col">
            <h2 className="text-xl font-display font-bold text-white tracking-tight flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary animate-pulse" />
              Viral Engine <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded border border-primary/30 ml-2">v2.7</span>
            </h2>
            <p className="text-[11px] text-white/40 font-medium uppercase tracking-[0.2em]">
              {activeWorkflowName || "Modo Automação Ativo"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-black/40 border border-white/10 rounded-full backdrop-blur-md">
            <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider">Sistema Online</span>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={toggleFullscreen}
            className="h-10 w-10 bg-black/40 border border-white/10 backdrop-blur-md hover:bg-black/60 text-white/70"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-10 w-10 bg-black/40 border border-white/10 backdrop-blur-md hover:bg-black/60 text-white/70">
                <User className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-black/90 border-white/10 backdrop-blur-xl text-white">
              <DropdownMenuLabel className="font-display">Minha Conta</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/5" />
              <DropdownMenuItem onClick={() => router.navigate({ to: "/user" })} className="hover:bg-primary/20 cursor-pointer">
                <Sliders className="mr-2 h-4 w-4" /> Perfil & Onboarding
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleInstallPWA} className="hover:bg-primary/20 cursor-pointer">
                <Download className="mr-2 h-4 w-4" /> Instalar App (PWA)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleHardRefresh} className="hover:bg-primary/20 cursor-pointer">
                <RefreshCw className="mr-2 h-4 w-4" /> Forçar Atualização
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/5" />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive hover:bg-destructive/20 cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" /> Sair do Sistema
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-4 w-full max-w-md px-6 pointer-events-none">
        <AnimatePresence>
          {isExecuting && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full space-y-3 pointer-events-auto"
            >
              <div className="flex justify-between items-end px-1">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Executando Fluxo</span>
                  <span className="text-sm font-display font-medium text-white">Analisando ecossistema viral...</span>
                </div>
                <span className="text-lg font-display font-bold text-primary">{Math.round(progress)}%</span>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 backdrop-blur-sm">
                <motion.div 
                  className="h-full bg-gradient-to-r from-primary to-primary-glow shadow-[0_0_15px_rgba(255,107,0,0.5)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-3 pointer-events-auto">
          <Button
            size="lg"
            onClick={executeWorkflow}
            disabled={isExecuting}
            className={cn(
              "h-14 px-8 rounded-full font-display font-bold text-base tracking-tight transition-all duration-500",
              isExecuting 
                ? "bg-white/5 text-white/40 border-white/10 cursor-not-allowed" 
                : "bg-primary hover:bg-primary-glow text-black shadow-[0_0_30px_rgba(255,107,0,0.3)] hover:scale-105 active:scale-95"
            )}
          >
            {isExecuting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Play className="mr-2 h-5 w-5 fill-current" />
                Iniciar Automação
              </>
            )}
          </Button>

          <Button
            size="lg"
            variant="outline"
            onClick={() => setManagerOpen(true)}
            className="h-14 w-14 rounded-full bg-black/40 border-white/10 backdrop-blur-md hover:bg-black/60 text-white"
          >
            <FolderOpen className="h-6 w-6" />
          </Button>

          <Button
            size="lg"
            variant="outline"
            onClick={() => setIsGlobalLocked(!isGlobalLocked)}
            className={cn(
              "h-14 w-14 rounded-full border-white/10 backdrop-blur-md transition-all",
              isLocked ? "bg-black/40 text-white/40" : "bg-primary/20 text-primary border-primary/30"
            )}
            title={isLocked ? "Layout Travado" : "Layout Editável"}
          >
            {isLocked ? <Lock className="h-6 w-6" /> : <RefreshCw className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      <div className="absolute inset-0 z-0">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={memoNodeTypes}
          onInit={setRfInstance}
          connectionMode={ConnectionMode.Loose}
          fitView
          nodesDraggable={!isLocked}
          nodesConnectable={!isLocked}
          elementsSelectable={!isLocked}
          panOnDrag={true}
          zoomOnScroll={true}
          selectionKeyCode={null}
          multiSelectionKeyCode={null}
          deleteKeyCode={null}
        >
          <Background color="#222" gap={40} size={1} />
          <Controls 
            className="bg-black/60 border-white/10 backdrop-blur-md !left-6 !bottom-6 !top-auto !flex !flex-row !gap-1 !p-1 !rounded-xl overflow-hidden" 
            showInteractive={false}
          />
        </ReactFlow>
      </div>

      <AnimatePresence>
        {showReport && profile && (
          <WorkflowDashboard 
            profile={profile} 
            onClose={() => setShowReport(false)} 
          />
        )}
      </AnimatePresence>

      <WorkflowsManager 
        open={managerOpen} 
        onOpenChange={setManagerOpen}
        onLoadWorkflow={(id, name, snapshot) => {
          setActiveWorkflowId(id);
          setActiveWorkflowName(name);
          if (snapshot && snapshot.nodes && snapshot.edges) {
            setNodes(snapshot.nodes);
            setEdges(snapshot.edges);
            toast.success(`Workflow "${name}" carregado!`);
          }
          setManagerOpen(false);
        }}
      />
    </div>
  );
};
