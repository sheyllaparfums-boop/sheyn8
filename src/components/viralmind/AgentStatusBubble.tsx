// Bolha do "Agente SHEY VIRAL" — sempre animada (exceto durante a coleta real,
// que dura ~800ms). Mostra mensagem rotativa do estado interno.
import { useViralAgentState } from "@/lib/viral-agent-state";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export function AgentStatusBubble({ compact = false }: { compact?: boolean }) {
  const s = useViralAgentState();
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/5 px-3 py-1.5 text-xs text-foreground",
        compact && "px-2.5 py-1 text-[11px]",
      )}
      title={`${s.modo_log} ${s.status_exibido} · ${s.execucoes} execuções`}
    >
      <span className="relative flex h-2 w-2">
        <span
          className={cn(
            "absolute inline-flex h-full w-full rounded-full bg-primary opacity-75",
            s.isCollecting ? "" : "animate-ping",
          )}
        />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
      </span>
      <Activity className="h-3.5 w-3.5 text-primary" />
      <span className="font-medium truncate max-w-[60vw] md:max-w-sm">{s.mensagem_bolha}</span>
    </div>
  );
}
