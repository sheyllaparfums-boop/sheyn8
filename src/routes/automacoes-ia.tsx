import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/route-guards";
import { useState, useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Send,
  User,
  Bot,
  Paperclip,
  Image as ImageIcon,
  Plus,
  MoreHorizontal,
  Eraser,
  Copy,
  RotateCcw,
  Sparkles,
  History,
  LayoutGrid,
  PanelLeft,
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { chatWithShey } from "@/lib/sheyai.functions";
import { useAuthStore } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSidebar, SidebarTrigger } from "@/components/ui/sidebar";

export const Route = createFileRoute("/automacoes-ia")({
  beforeLoad: ({ location }) => requireAuth(location),
  head: () => ({
    meta: [
      { title: "SHEY AI — Estrategista Viral" },
      { name: "description", content: "Converse com a SHEY AI: estratégias, roteiros e ideias de conteúdo viral sob demanda." },
      { property: "og:title", content: "SHEY AI — Estrategista Viral" },
      { property: "og:description", content: "Converse com a SHEY AI: estratégias, roteiros e ideias de conteúdo viral sob demanda." },
      { property: "og:image", content: "https://sheyn8n.lovable.app/og-image.jpg" },
      { property: "og:url", content: "https://sheyn8n.lovable.app/automacoes-ia" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://sheyn8n.lovable.app/og-image.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://sheyn8n.lovable.app/automacoes-ia" }],
  }),
  component: SheyChatPage,
});

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

function SheyChatPage() {
  const { user, onboardingByUser } = useAuthStore();
  const profile = user ? onboardingByUser[user.id] : null;
  const chatFn = useServerFn(chatWithShey);
  const sidebar = useSidebar();
  const toggleSidebar = sidebar?.toggleSidebar;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleFilePick = (accept: string, ref: React.RefObject<HTMLInputElement | null>) => {
    if (ref.current) {
      ref.current.accept = accept;
      ref.current.click();
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>, kind: "documento" | "imagem") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const sizeMb = (file.size / 1024 / 1024).toFixed(2);
    setInput((prev) => `${prev ? prev + "\n" : ""}[${kind} anexada: ${file.name} • ${sizeMb}MB] Analise este conteúdo e me dê ideias estratégicas.`);
    toast.success(`${kind === "imagem" ? "Imagem" : "Documento"} anexado: ${file.name}`);
    e.target.value = "";
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: Message = {
      id: Math.random().toString(36).slice(2),
      role: "user",
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await chatFn({
        data: {
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
          context: {
            user_name: user?.name,
            instagram_handle: profile?.handle,
            niche: profile?.niche,
          },
        },
      });

      const assistantMsg: Message = {
        id: Math.random().toString(36).slice(2),
        role: "assistant",
        content: res.text,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error: any) {
      toast.error("A SHEY AI encontrou um erro: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    if (confirm("Deseja apagar todo o histórico da conversa?")) {
      setMessages([]);
      toast.success("Conversa limpa");
    }
  };

  return (
    <div className="flex h-[100dvh] bg-background text-foreground overflow-hidden">
      {/* Sidebar de Chats Estilo Claude */}
      <div className="w-64 bg-sidebar border-r border-sidebar-border hidden md:flex flex-col">
        <div className="p-4">
          <Button
            onClick={() => setMessages([])}
            className="w-full justify-start gap-2 bg-card hover:bg-accent text-foreground border border-border rounded-lg h-10 font-medium shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nova Conversa
          </Button>
        </div>
        <ScrollArea className="flex-1 px-2">
          <div className="space-y-1 py-2">
            <p className="px-3 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Recentes
            </p>
            <button className="w-full text-left px-3 py-2 rounded-lg bg-sidebar-accent text-sm font-medium text-sidebar-accent-foreground">
              Estratégia Instagram
            </button>
            <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-sidebar-accent/50 text-sm text-muted-foreground transition-colors">
              Roteiro Viral
            </button>
          </div>
        </ScrollArea>
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-1">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs shadow-md">
              {user?.name?.[0] || "S"}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">{user?.name || "SHEY User"}</p>
              <p className="text-[10px] text-muted-foreground truncate font-medium">
                Plano Unlimited
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative h-[100dvh] bg-background">
        {/* Top Header */}
        <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-background/95 sticky top-0 z-50">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="h-8 w-8 text-muted-foreground hover:bg-accent" />
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-foreground font-display">SHEY AI</h1>
              <span className="w-1 h-1 rounded-full bg-border" />
              <span className="text-xs text-muted-foreground font-medium">
                Inteligência Estratégica
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={clearChat}
              className="h-8 w-8 text-muted-foreground hover:bg-accent hover:text-destructive transition-colors"
            >
              <Eraser className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:bg-accent"
            >
              <History className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:bg-accent"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* Messages */}
        <ScrollArea className="flex-1">
          <div className="max-w-3xl mx-auto px-6 py-10 w-full space-y-12">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center pt-20 pb-4 text-center space-y-8">
                <div className="w-20 h-20 rounded-3xl bg-card flex items-center justify-center shadow-inner group transition-all duration-500 hover:scale-110 border border-border/50">
                  <Bot className="w-10 h-10 text-foreground group-hover:text-primary transition-colors" />
                </div>
                <div className="space-y-3">
                  <h2 className="text-3xl font-bold tracking-tight text-foreground font-display">
                    Como posso ajudar hoje?
                  </h2>
                  <p className="text-muted-foreground max-w-md mx-auto text-base leading-relaxed">
                    Sou sua estrategista para o perfil <span className="text-primary font-bold">@{profile?.handle || "configurar"}</span>. 
                    Posso criar conteúdos, analisar dados ou planejar sua próxima viralização no nicho <span className="text-primary font-bold">{profile?.niche || "seu nicho"}</span>.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl mt-4">
                  <QuickAction
                    icon={<Sparkles />}
                    label="Criar roteiro de Reel viral"
                    onClick={() => setInput("Me ajude a criar um roteiro de Reel viral sobre...")}
                  />
                  <QuickAction
                    icon={<LayoutGrid />}
                    label="Ideias de carrossel infinito"
                    onClick={() => setInput("Gere 5 ideias de carrossel para meu Instagram")}
                  />
                  <QuickAction
                    icon={<User />}
                    label="Analisar meu nicho e persona"
                    onClick={() => setInput("Pode analisar as tendências atuais do meu nicho?")}
                  />
                  <QuickAction
                    icon={<RotateCcw />}
                    label="Dicas de engajamento real"
                    onClick={() => setInput("Como posso aumentar meu engajamento esta semana?")}
                  />
                </div>
              </div>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                className="group animate-in fade-in slide-in-from-bottom-2 duration-300"
              >
                <div className="flex gap-6">
                  <div className="shrink-0 pt-1">
                    {m.role === "assistant" ? (
                      <div className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center shadow-sm">
                        <Bot className="w-5 h-5 text-foreground" />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shadow-md">
                        {user?.name?.[0] || "U"}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="flex items-baseline justify-between">
                      <span className="font-bold text-sm text-foreground">
                        {m.role === "assistant" ? "SHEY AI" : user?.name || "Você"}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                        {new Date(m.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div
                      className={`text-foreground/90 text-[15px] leading-relaxed selection:bg-primary/20`}
                    >
                      {m.role === "assistant" ? (
                        <div className="prose prose-invert prose-neutral max-w-none prose-p:leading-relaxed prose-headings:text-foreground prose-headings:font-bold prose-code:bg-muted prose-code:text-primary prose-pre:bg-card prose-pre:text-foreground prose-pre:rounded-xl shadow-none">
                          <ReactMarkdown>{m.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap font-medium">{m.content}</p>
                      )}
                    </div>
                    {m.role === "assistant" && (
                      <div className="flex items-center gap-3 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(m.content);
                            toast.success("Copiado!");
                          }}
                          className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 text-xs font-medium"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Copiar
                        </button>
                        <button className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 text-xs font-medium">
                          <RotateCcw className="w-3.5 h-3.5" />
                          Regerar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-6 animate-pulse">
                <div className="shrink-0">
                  <div className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center shadow-sm">
                    <Bot className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
                <div className="flex-1 space-y-4">
                  <span className="font-bold text-sm text-muted-foreground">
                    SHEY AI está pensando...
                  </span>
                  <div className="flex gap-1.5 pt-2">
                    <span className="w-2 h-2 bg-muted rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-2 h-2 bg-muted rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2 h-2 bg-muted rounded-full animate-bounce" />
                  </div>
                </div>
              </div>
            )}
            <div ref={scrollRef} className="h-10" />
          </div>
        </ScrollArea>

        {/* Floating Input Area Estilo Claude */}
        <div className="w-full bg-background/80 pt-2 pb-8 px-6 sticky bottom-0">
          <div className="max-w-3xl mx-auto relative">
            <form
              onSubmit={handleSend}
              className="relative flex flex-col w-full bg-card border border-border rounded-2xl shadow-sm transition-all focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 overflow-hidden z-20"
            >
              <textarea
                value={input}
                autoFocus
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 240)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (input.trim() && !loading) {
                      handleSend();
                    }
                  }
                }}
                placeholder="Pergunte qualquer coisa à SHEY AI..."
                className="w-full bg-transparent border-none focus:ring-0 text-[15px] text-foreground px-4 py-4 min-h-[56px] max-h-[240px] resize-none leading-relaxed placeholder:text-muted-foreground relative z-40"
                rows={1}
              />

              <div className="flex items-center justify-between px-3 py-2 border-t border-border/50">
                <div className="flex items-center gap-0.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => handleFileSelected(e, "documento")}
                  />
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileSelected(e, "imagem")}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleFilePick(".pdf,.doc,.docx,.txt,.csv,.xlsx", fileInputRef)}
                    title="Anexar documento"
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => imageInputRef.current?.click()}
                    title="Anexar imagem"
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setInput((prev) => prev + (prev ? "\n\n" : "") + "✨ ")}
                    title="Nova ideia rápida"
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    type="submit"
                    disabled={!input.trim() || loading}
                    size="icon"
                    className={`rounded-xl h-8 w-8 flex items-center justify-center transition-all relative z-50 ${
                      input.trim() && !loading
                        ? "bg-primary text-primary-foreground shadow-lg glow-primary-sm cursor-pointer"
                        : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                    }`}
                  >
                    {loading ? (
                      <RotateCcw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </form>
            <p className="text-center text-[10px] text-muted-foreground mt-3 font-medium uppercase tracking-[0.2em] opacity-80">
              SHEY AI v2.0 • IA Estratégica Ilimitada
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  label,
  onClick,
  icon,
}: {
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left px-5 py-4 rounded-2xl border border-border bg-card hover:bg-accent hover:border-primary/30 transition-all duration-200 group flex flex-col gap-3 shadow-sm hover:shadow-md"
    >
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
        {icon}
      </div>
      <span className="text-foreground font-bold text-sm leading-snug">{label}</span>
    </button>
  );
}
