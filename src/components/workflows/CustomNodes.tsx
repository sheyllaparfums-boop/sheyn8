import React from "react";
import { Handle, Position } from "@xyflow/react";
import { Bot, Zap, ShieldCheck, Star, FileText, Search, Anchor, Users, Flame, Clock, Wifi, WifiOff, Layout, LineChart, Target, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

const InstagramIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16Z" stroke="url(#node_insta_grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M17.5 6.5H17.51" stroke="url(#node_insta_grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 2H17C19.7614 2 22 4.23858 22 7V17C22 19.7614 19.7614 22 17 22H7C4.23858 22 2 19.7614 2 17V7C2 4.23858 4.23858 2 7 2Z" stroke="url(#node_insta_grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <defs>
      <linearGradient id="node_insta_grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#833AB4"/>
        <stop offset="0.5" stopColor="#FD1D1D"/>
        <stop offset="1" stopColor="#FCAF45"/>
      </linearGradient>
    </defs>
  </svg>
);

export const InstagramNode = ({ data }: any) => {
  const isPending = data.status === "pending";
  const isConnected = data.status === "connected";
  const isDisconnected = data.disconnected;
  const profile = data.profile;

  return (
    <div className={cn(
      "bg-[#0F0F0F] border-[2px] rounded-full p-1.5 pl-2 pr-5 min-w-[200px] flex items-center gap-3 shadow-[0_0_20px_rgb(var(--primary-rgb) / 0.1)] relative group transition-all duration-300 isolate hover:scale-105",
      isDisconnected ? "border-red-600/50 shadow-[0_0_20px_rgba(220,38,38,0.2)]" : "border-[var(--primary)]/40 hover:border-[var(--primary)]"
    )}>
      {/* N8N Style Bubble Icon Wrapper */}
      <div className={cn(
        "w-12 h-12 rounded-full flex items-center justify-center shrink-0 border-[2px] shadow-[0_0_15px_rgb(var(--primary-rgb) / 0.2)]",
        isDisconnected ? "bg-red-950/30 border-red-500" : "bg-[var(--primary)]/10 border-[var(--primary)]"
      )}>
        <InstagramIcon />
      </div>

      <div className="flex-1 min-w-0 py-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-rajdhani text-white font-bold text-sm tracking-wider uppercase truncate">
            @{profile?.handle || data.handle || "handle"}
          </h3>
          <div className={cn(
            "w-2 h-2 rounded-full animate-pulse shadow-[0_0_8px_currentColor]",
            isDisconnected ? "bg-red-500 text-red-500" : isConnected ? "bg-green-500 text-green-500" : "bg-yellow-500 text-yellow-500"
          )} />
        </div>
        <p className="text-[#888888] text-[9px] font-bold tracking-widest uppercase opacity-70">
          {profile?.fullName || data.niche || "Nicho"}
        </p>
      </div>

      <Handle type="target" position={Position.Left} className="!bg-[var(--primary)] !w-3 !h-3 !border-[2px] !border-[#080808] !-left-1.5" id="left" />
      <Handle type="source" position={Position.Right} className="!bg-[var(--primary)] !w-3 !h-3 !border-[2px] !border-[#080808] !-right-1.5" id="right" />
      <Handle type="source" position={Position.Top} className="!bg-[var(--primary)] !w-3 !h-3 !border-[2px] !border-[#080808] !-top-1.5" id="top" />
      <Handle type="source" position={Position.Bottom} className="!bg-[var(--primary)] !w-3 !h-3 !border-[2px] !border-[#080808] !-bottom-1.5" id="bottom" />
    </div>
  );
};

export const AIAgentNode = ({ data }: any) => (
  <div
    className={cn(
      "bg-[#0F0F0F] border-[2px] rounded-full p-1.5 pl-2 pr-5 min-w-[200px] flex items-center gap-3 shadow-[0_0_20px_rgb(var(--primary-rgb) / 0.1)] relative group transition-all duration-300 isolate hover:scale-105",
      data.disconnected ? "border-red-600/50 shadow-[0_0_20px_rgba(220,38,38,0.2)]" : "border-[var(--primary)]/40 hover:border-[var(--primary)]"
    )}
  >
    <div className={cn(
      "w-12 h-12 rounded-full flex items-center justify-center shrink-0 border-[2px] shadow-[0_0_15px_rgb(var(--primary-rgb) / 0.2)]",
      data.disconnected ? "bg-red-950/30 border-red-500" : "bg-[var(--primary)]/10 border-[var(--primary)]"
    )}>
      <Bot className={cn("w-7 h-7", data.disconnected ? "text-red-500" : "text-[var(--primary)]")} />
    </div>

    <div className="flex-1 min-w-0 py-1">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-rajdhani text-white font-bold text-sm tracking-wider uppercase truncate">
          IA Viral Intel
        </h3>
        <div className={cn(
          "w-2 h-2 rounded-full animate-pulse shadow-[0_0_8px_currentColor]",
          data.disconnected ? "bg-red-500 text-red-500" : "bg-green-500 text-green-500"
        )} />
      </div>
      <p className="text-[#888888] text-[9px] font-bold tracking-widest uppercase opacity-70">
        AI Radar System
      </p>
    </div>

    <Handle type="target" position={Position.Left} className="!bg-[var(--primary)] !w-3 !h-3 !border-[2px] !border-[#080808] !-left-1.5" id="left" />
    <Handle type="source" position={Position.Right} className="!bg-[var(--primary)] !w-3 !h-3 !border-[2px] !border-[#080808] !-right-1.5" id="main" />
    <Handle type="source" position={Position.Top} className="!bg-[var(--primary)] !w-3 !h-3 !border-[2px] !border-[#080808] !-top-1.5" id="top" />
    <Handle type="source" position={Position.Bottom} className="!bg-[var(--primary)] !w-3 !h-3 !border-[2px] !border-[#080808] !-bottom-1.5" id="tools" />
  </div>
);

export const GenericNode = ({ data, icon: Icon, title, subtitle, statusLabel }: any) => (
  <div className={cn(
    "bg-[#0F0F0F] border-[2px] rounded-full p-1.5 pl-2 pr-5 min-w-[210px] flex items-center gap-3 shadow-[0_0_20px_rgb(var(--primary-rgb) / 0.1)] relative group transition-all duration-300 isolate hover:scale-105",
    data.disconnected ? "border-red-600/50 shadow-[0_0_20px_rgba(220,38,38,0.2)]" : "border-[var(--primary)]/40 hover:border-[var(--primary)]"
  )}>
    <div className={cn(
      "w-11 h-11 rounded-full flex items-center justify-center shrink-0 border-[2px] shadow-[0_0_15px_rgb(var(--primary-rgb) / 0.2)]",
      data.disconnected ? "bg-red-950/30 border-red-500" : "bg-[var(--primary)]/10 border-[var(--primary)]"
    )}>
      <Icon className={cn("w-6 h-6", data.disconnected ? "text-red-500" : "text-[var(--primary)]")} />
    </div>

    <div className="flex-1 min-w-0 py-1">
      <div className="flex items-center justify-between gap-1">
        <h3 className="font-rajdhani text-white font-bold text-[11px] tracking-[0.2em] uppercase truncate">
          {title}
        </h3>
        {statusLabel && (
          <span className={cn(
            "text-[7px] font-black px-1.5 py-0.5 rounded-sm tracking-tighter uppercase",
            data.active ? "bg-emerald-500 text-black animate-pulse" : "bg-white/10 text-white/40"
          )}>
            {data.active ? "Active" : statusLabel}
          </span>
        )}
      </div>
      <p className="text-[#888888] text-[8px] font-bold tracking-widest uppercase opacity-70 truncate mt-0.5">
        {subtitle}
      </p>
    </div>

    <Handle type="target" position={Position.Left} className="!bg-[var(--primary)] !w-2.5 !h-2.5 !border-[2px] !border-[#080808] !-left-1.5" id="left" />
    <Handle type="source" position={Position.Right} className="!bg-[var(--primary)] !w-2.5 !h-2.5 !border-[2px] !border-[#080808] !-right-1.5" id="right" />
    <Handle type="source" position={Position.Top} className="!bg-[var(--primary)] !w-2.5 !h-2.5 !border-[2px] !border-[#080808] !-top-1.5" id="top" />
    <Handle type="source" position={Position.Bottom} className="!bg-[var(--primary)] !w-2.5 !h-2.5 !border-[2px] !border-[#080808] !-bottom-1.5" id="bottom" />
  </div>
);

export const ToolNode = ({ data }: any) => {
  const icons: any = { scanner: Search, hooks: Anchor, audience: Users, trend: Flame };
  const Icon = icons[data.type] || Search;
  return (
    <div className={cn(
      "bg-[#0F0F0F] border-[2px] rounded-full p-1 pl-1.5 pr-4 min-w-[140px] flex items-center gap-2.5 shadow-[0_0_15px_rgb(var(--primary-rgb) / 0.08)] relative group transition-all duration-300 isolate hover:scale-105",
      data.disconnected ? "border-red-600/50 shadow-[0_0_15px_rgba(220,38,38,0.2)]" : "border-[var(--primary)]/30 hover:border-[var(--primary)]"
    )}>
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border shadow-[0_0_10px_rgb(var(--primary-rgb) / 0.1)]",
        data.disconnected ? "bg-red-950/20 border-red-500/50" : "bg-[var(--primary)]/5 border-[var(--primary)]/40"
      )}>
        <Icon className={cn("w-4 h-4", data.disconnected ? "text-red-500" : "text-[var(--primary)]/80")} />
      </div>
      <span className="text-[10px] font-bold text-white/80 uppercase tracking-widest truncate">{data.label}</span>
      
      <Handle type="target" position={Position.Left} className="!bg-[var(--primary)] !w-2 !h-2 !border-[2px] !border-[#080808] !-left-1" id="left" />
      <Handle type="source" position={Position.Right} className="!bg-[var(--primary)] !w-2 !h-2 !border-[2px] !border-[#080808] !-right-1" id="right" />
      <Handle type="target" position={Position.Top} className="!bg-[var(--primary)] !w-2 !h-2 !border-[2px] !border-[#080808] !-top-1" id="top" />
      <Handle type="source" position={Position.Bottom} className="!bg-[var(--primary)] !w-2 !h-2 !border-[2px] !border-[#080808] !-bottom-1" id="bottom" />
    </div>
  );
};

export const nodeTypes = {
  instagram: InstagramNode,
  agent: AIAgentNode,
  radar: (props: any) => <GenericNode {...props} icon={Search} title="Radar Viral" subtitle="Monitorando tendências" statusLabel="SCANNING" />,
  hooks: (props: any) => <GenericNode {...props} icon={Anchor} title="Análise de Hooks" subtitle="Identificando gatilhos" statusLabel="ANALYZING" />,
  ideas: (props: any) => <GenericNode {...props} icon={Lightbulb} title="Ideias de Reels" subtitle="IA gerando roteiros" statusLabel="WRITING" />,
  trends: (props: any) => <GenericNode {...props} icon={Flame} title="Tendências Nicho" subtitle="Monitorando formatos" statusLabel="ACTIVE" />,
  score: (props: any) => <GenericNode {...props} icon={LineChart} title="Score Viral" subtitle="Análise de crescimento" statusLabel="READY" />,
  tool: ToolNode,
};