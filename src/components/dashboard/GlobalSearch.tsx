import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import {
  Search,
  LayoutDashboard,
  Workflow,
  KeyRound,
  Sparkles,
  CalendarDays,
  Flame,
  Users,
  LayoutGrid,
  Mic,
  Library,
  History,
  Settings as SettingsIcon,
  FolderKanban,
  ShieldCheck,
  LogOut,
  RotateCw,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/auth-store";
import { supabase } from "@/integrations/supabase/client";

type NavEntry = {
  label: string;
  to: string;
  group: string;
  keywords?: string;
  icon: React.ComponentType<{ className?: string }>;
};

const NAV: NavEntry[] = [
  { label: "Dashboard", to: "/", group: "Visão Geral", icon: LayoutDashboard, keywords: "home inicio painel" },
  { label: "User", to: "/user", group: "Visão Geral", icon: Library, keywords: "perfil @ handle conta" },
  { label: "Histórico", to: "/execucoes", group: "Visão Geral", icon: History, keywords: "logs auditoria" },
  { label: "Gerador de Carrossel", to: "/carrossel", group: "Conteúdo IA", icon: LayoutGrid, keywords: "carousel slides" },
  { label: "Ganchos Virais", to: "/ganchos", group: "Conteúdo IA", icon: Flame, keywords: "hooks viral" },
  { label: "Transcrição de Reel", to: "/transcricao", group: "Conteúdo IA", icon: Mic, keywords: "reel video elevenlabs" },
  { label: "Análise de Concorrente", to: "/concorrente", group: "Conteúdo IA", icon: Users, keywords: "competitor" },
  { label: "Calendário Editorial", to: "/calendario", group: "Conteúdo IA", icon: CalendarDays, keywords: "posts planner agenda" },
  { label: "SHEY AI", to: "/automacoes-ia", group: "Conteúdo IA", icon: Sparkles, keywords: "ai ia chat shey claude" },
  { label: "Workflows", to: "/workflows", group: "Automação", icon: Workflow },
  { label: "APIs & Credenciais", to: "/integracoes", group: "Sistema", icon: KeyRound, keywords: "api keys elevenlabs openai" },
  { label: "Projetos", to: "/projetos", group: "Sistema", icon: FolderKanban },
  { label: "Admin", to: "/admin", group: "Sistema", icon: ShieldCheck },
  { label: "Configurações", to: "/configuracoes", group: "Sistema", icon: SettingsIcon, keywords: "settings preferencias backup" },
];

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (to: string) => {
    setOpen(false);
    navigate({ to });
  };

  const grouped = useMemo(() => {
    const map = new Map<string, NavEntry[]>();
    for (const item of NAV) {
      if (!map.has(item.group)) map.set(item.group, []);
      map.get(item.group)!.push(item);
    }
    return Array.from(map.entries());
  }, []);

  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

  return (
    <>
      <Button
        variant="ghost"
        onClick={() => setOpen(true)}
        aria-label="Pesquisa global"
        className="hidden md:inline-flex h-9 items-center gap-2 rounded-full border border-border/60 bg-background/40 px-3 text-xs text-muted-foreground hover:text-foreground"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Pesquisar</span>
        <kbd className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
          {isMac ? "⌘" : "Ctrl"} K
        </kbd>
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label="Pesquisa global"
        className="md:hidden"
      >
        <Search className="h-4 w-4" />
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Pesquise páginas, ações, conteúdos..." />
        <CommandList>
          <CommandEmpty>Nenhum resultado.</CommandEmpty>

          {grouped.map(([group, items]) => (
            <CommandGroup key={group} heading={group}>
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.to}
                    value={`${item.label} ${item.keywords ?? ""} ${item.to}`}
                    onSelect={() => go(item.to)}
                  >
                    <Icon className="h-4 w-4 text-primary" />
                    <span>{item.label}</span>
                    <CommandShortcut>{item.to}</CommandShortcut>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}

          <CommandSeparator />
          <CommandGroup heading="Ações rápidas">
            <CommandItem
              value="novo carrossel criar"
              onSelect={() => go("/carrossel")}
            >
              <Plus className="h-4 w-4 text-primary" />
              <span>Criar novo carrossel</span>
            </CommandItem>
            <CommandItem
              value="nova transcricao reel"
              onSelect={() => go("/transcricao")}
            >
              <Plus className="h-4 w-4 text-primary" />
              <span>Nova transcrição de reel</span>
            </CommandItem>
            <CommandItem
              value="analisar concorrente"
              onSelect={() => go("/concorrente")}
            >
              <Plus className="h-4 w-4 text-primary" />
              <span>Analisar concorrente</span>
            </CommandItem>
            <CommandItem
              value="forcar atualizacao cache reload"
              onSelect={() => {
                setOpen(false);
                toast.success("Limpando cache e reiniciando...");
                setTimeout(() => {
                  if ("serviceWorker" in navigator) {
                    navigator.serviceWorker.getRegistrations().then((regs) => {
                      for (const r of regs) r.unregister();
                    });
                  }
                  window.location.href =
                    window.location.origin + window.location.pathname + "?refresh=" + Date.now();
                }, 600);
              }}
            >
              <RotateCw className="h-4 w-4 text-primary" />
              <span>Forçar atualização</span>
            </CommandItem>
            <CommandItem
              value="sair logout"
              onSelect={() => {
                setOpen(false);
                supabase.auth.signOut().finally(() => logout());
                toast.success("Sessão encerrada");
                navigate({ to: "/login" });
              }}
            >
              <LogOut className="h-4 w-4 text-red-400" />
              <span>Sair</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
