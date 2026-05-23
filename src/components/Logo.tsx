import { Infinity as InfinityIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ collapsed = false, className }: { collapsed?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 glow-primary-sm">
        <InfinityIcon className="h-5 w-5 text-primary" strokeWidth={2.5} />
      </div>
      {!collapsed && (
        <div className="flex flex-col leading-none">
          <span className="font-display text-base font-bold tracking-wide text-foreground uppercase">
            SHEY <span className="text-primary text-glow">N8N</span>
          </span>
          <span className="font-display text-[9px] font-bold tracking-[0.25em] text-primary/80 uppercase">AI ENGINE</span>
        </div>
      )}
    </div>
  );
}
