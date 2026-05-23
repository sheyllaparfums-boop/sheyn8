
import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/route-guards";
import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "@tanstack/react-router";
import { useAuthStore } from "@/lib/auth-store";
import { motion } from "framer-motion";
import { History, Users, ArrowRightLeft, Link as LinkIcon, Copy, FileText, Save, Layout, Plus, Trash2, Upload, ArrowUp, ArrowDown, Eye, Monitor, Smartphone, Instagram, Youtube, Github as GithubIcon, Twitter, Facebook, Linkedin, Globe as GlobeIcon, Music2, AlertTriangle, ExternalLink, Palette, Image as ImageIcon, Search, LayoutDashboard, Megaphone, Send, CheckCircle2, XCircle, Info, TrendingUp, UserCheck, Crown, Sparkles } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAdminOverview, verifyCeoRole } from "@/lib/admin-verify.functions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useSiteSettings, type SocialLink } from "@/lib/site-settings-store";
import { refreshProfile } from "@/lib/use-supabase-session";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin")({
  beforeLoad: ({ location }) => requireAuth(location),
  head: () => ({
    meta: [
      { title: "Admin — SHEY VIRAL" },
      { name: "description", content: "Painel de administração: editar tela de login, páginas e gerar links beta." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});


function AdminPage() {
  const { user, hasHydrated, sessionReady, isAuthenticated } = useAuthStore();
  const router = useRouter();
  // Server-side CEO verification (cannot be bypassed via localStorage)
  const { data: ceoCheck, isFetching: ceoLoading, isError: ceoError, refetch: retryCeoCheck } = useQuery({
    queryKey: ['verify-ceo'],
    queryFn: () => verifyCeoRole(),
    enabled: hasHydrated && sessionReady && isAuthenticated,
    retry: false,
    staleTime: 60_000,
  });
  const isCEO = ceoCheck?.isCeo === true;
  const authReady = hasHydrated && sessionReady;
  const localCeo = user?.role === 'CEO';
  const userLoaded = authReady && (!isAuthenticated || user !== null);
  const adminAllowed = isCEO || (!!user && localCeo && ceoLoading && !ceoError);

  const initialTab = typeof window !== 'undefined' ? (new URLSearchParams(window.location.search).get('tab') || 'overview') : 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [betaLink, setBetaLink] = useState("");
  const [editingPage, setEditingPage] = useState<any>(null);
  const [validationTimedOut, setValidationTimedOut] = useState(false);
  const queryClient = useQueryClient();

  const { data: pages, isLoading: pagesLoading } = useQuery({
    queryKey: ['custom-pages-admin'],
    queryFn: async () => {
      const { data, error } = await supabase.from('custom_pages').select('*').order('title');
      if (error) throw error;
      return data;
    },
    enabled: userLoaded && isCEO && activeTab === 'pages'
  });

  const updatePageMutation = useMutation({
    mutationFn: async (updatedPage: any) => {
      const { error } = await supabase
        .from('custom_pages')
        .update({
          title: updatedPage.title,
          summary: updatedPage.summary,
          content: updatedPage.content,
        })
        .eq('id', updatedPage.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-pages-admin'] });
      toast.success("Página atualizada!");
      setEditingPage(null);
    },
    onError: (error) => {
      toast.error("Erro ao atualizar: " + error.message);
    }
  });

  useEffect(() => {
    if (userLoaded) return;
    const timer = window.setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        await refreshProfile();
        setValidationTimedOut(true);
      } else {
        router.navigate({ to: "/login", search: { action: 'login' } });
      }
    }, 4500);
    return () => window.clearTimeout(timer);
  }, [userLoaded, router]);

  useEffect(() => {
    if (!userLoaded) return;
    if (!isAuthenticated) {
      router.navigate({ to: "/login", search: { action: 'login' } });
      return;
    }
    if (ceoError) {
      toast.error("Não foi possível validar o painel agora. Tente novamente.");
      return;
    }
    if (ceoCheck && !ceoLoading && !adminAllowed) {
      toast.error("Acesso restrito ao administrador.");
      router.navigate({ to: "/" });
    }
  }, [userLoaded, isAuthenticated, adminAllowed, ceoError, ceoCheck, ceoLoading, router]);

  // KPIs para badges nas abas (DEVE vir antes de qualquer early return p/ não violar regras de hooks)
  const { data: kpis } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: () => getAdminOverview(),
    enabled: userLoaded && adminAllowed,
    staleTime: 60_000,
  });

  if (!userLoaded && !validationTimedOut) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080808] text-white">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-[#888]">Validando acesso de administrador…</p>
        </div>
      </div>
    );
  }
  if (!userLoaded && validationTimedOut) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080808] px-4 text-white">
        <div className="max-w-sm text-center">
          <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-primary" />
          <h1 className="text-xl font-bold">Sessão demorou para validar</h1>
          <p className="mt-2 text-sm text-[#888]">Atualize a página ou entre novamente para carregar o painel.</p>
          <Button className="mt-6" onClick={() => window.location.reload()}>
            Atualizar página
          </Button>
        </div>
      </div>
    );
  }
  if (ceoError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080808] px-4 text-white">
        <div className="max-w-sm text-center">
          <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-primary" />
          <h1 className="text-xl font-bold">Validação temporariamente indisponível</h1>
          <p className="mt-2 text-sm text-[#888]">Sua sessão foi mantida. Tente validar o acesso admin novamente.</p>
          <Button className="mt-6" onClick={() => retryCeoCheck()}>
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }
  if (!isAuthenticated || !adminAllowed) return null;

  const handleGenerateBetaLink = () => {
    const token = Math.random().toString(36).substring(2, 10).toUpperCase();
    const link = `${window.location.origin}/login?beta=${token}`;
    setBetaLink(link);
    toast.success("Link de convite Beta gerado!");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Link copiado para a área de transferência!");
  };


  const tabs = [
    { id: "overview",  label: "Visão Geral",   icon: LayoutDashboard, badge: undefined },
    { id: "manage",    label: "Gerenciar @s",  icon: Users,           badge: kpis?.total },
    { id: "broadcast", label: "Avisos",        icon: Megaphone,       badge: kpis?.activeBroadcasts },
    { id: "beta",      label: "Convites Beta", icon: LinkIcon,        badge: undefined },
    { id: "landing",   label: "Tela de Login", icon: Layout,          badge: undefined },
    { id: "pages",     label: "Páginas",       icon: FileText,        badge: undefined },
    { id: "history",   label: "Histórico",     icon: History,         badge: kpis?.recentLogs },
  ];

  return (
    <div className="flex min-h-screen min-w-0 flex-col bg-[#080808] text-white">
      <div className="flex-1 min-w-0 p-4 md:p-8 max-w-7xl w-full mx-auto overflow-x-hidden">
        <div className="mb-8">
          <h1 className="font-rajdhani text-3xl md:text-4xl font-bold mb-2">Editar Login & Painel CEO</h1>
          <p className="text-[#888888]">Controle total sobre a tela de login, páginas e @s da plataforma.</p>
        </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 md:gap-3 mb-8">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "group relative flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all text-center min-h-[92px]",
                isActive
                  ? "border-primary/60 bg-primary/10 text-primary"
                  : "border-[#2A2A2A] bg-[#111111] text-[#888888] hover:text-white hover:border-[#3A3A3A] hover:bg-[#161616]"
              )}
            >
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={cn(
                  "absolute top-2 right-2 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center",
                  isActive ? "bg-primary text-black" : "bg-white/10 text-white"
                )}>
                  {tab.badge > 99 ? '99+' : tab.badge}
                </span>
              )}
              <div className={cn(
                "flex items-center justify-center w-9 h-9 rounded-xl transition-all",
                isActive ? "bg-primary/20" : "bg-white/5 group-hover:bg-white/10"
              )}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-[11px] md:text-xs font-semibold leading-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>


      <div
        className="bg-[#111111] border border-[#2A2A2A] rounded-2xl overflow-hidden"
      >


        {activeTab === "manage" && <ManageUsersTab />}

        {activeTab === "beta" && (
          <div className="p-8">
            <h2 className="text-xl font-bold mb-4">Gerador de Convites Beta</h2>
            <p className="text-[#888888] mb-8 text-sm">Crie links exclusivos para convidar novos usuários para o plano Beta gratuito.</p>
            
            <div className="flex flex-col gap-6 max-w-xl">
              <Button onClick={handleGenerateBetaLink} className="w-full bg-primary hover:bg-primary/90 text-black font-bold h-12">
                Gerar Novo Link de Convite
              </Button>

              {betaLink && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between gap-4"
                >
                  <div className="flex-1 truncate">
                    <p className="text-[10px] text-primary font-bold uppercase tracking-wider mb-1">Link Gerado</p>
                    <p className="font-mono text-sm truncate">{betaLink}</p>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => copyToClipboard(betaLink)} className="shrink-0 hover:bg-primary/10 hover:text-primary">
                    <Copy className="w-4 h-4" />
                  </Button>
                </motion.div>
              )}
            </div>
          </div>
        )}

        {activeTab === "landing" && <LandingEditor />}


        {activeTab === "pages" && (
          <div className="p-6">
            <h2 className="text-xl font-bold mb-6">Gerenciar Páginas Customizadas</h2>
            
            {editingPage ? (
              <div className="space-y-4 max-w-3xl">
                <div>
                  <label className="text-xs font-bold text-[#888888] uppercase mb-1 block">Título</label>
                  <Input 
                    value={editingPage.title} 
                    onChange={e => setEditingPage({...editingPage, title: e.target.value})}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#888888] uppercase mb-1 block">Resumo (Destaque)</label>
                  <Textarea 
                    value={editingPage.summary || ''} 
                    onChange={e => setEditingPage({...editingPage, summary: e.target.value})}
                    className="bg-white/5 border-white/10 min-h-[100px]"
                    placeholder="Um resumo curto que aparece em destaque no topo da página..."
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#888888] uppercase mb-1 block">Conteúdo (HTML/Markdown)</label>
                  <Textarea 
                    value={editingPage.content} 
                    onChange={e => setEditingPage({...editingPage, content: e.target.value})}
                    className="bg-white/5 border-white/10 min-h-[300px] font-mono text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => updatePageMutation.mutate(editingPage)} className="bg-primary text-black font-bold">
                    <Save className="w-4 h-4 mr-2" /> Salvar Alterações
                  </Button>
                  <Button variant="outline" onClick={() => setEditingPage(null)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pagesLoading ? (
                  <p>Carregando páginas...</p>
                ) : pages?.map((page: any) => (
                  <div key={page.id} className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-primary/30 transition-all group">
                    <h3 className="font-bold mb-1">{page.title}</h3>
                    <p className="text-xs text-[#888888] mb-1">Slug: /{page.slug}</p>
                    {page.summary && (
                      <p className="text-[10px] text-primary/70 line-clamp-1 italic mb-4">{page.summary}</p>
                    )}
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => setEditingPage(page)}
                      className="w-full border-white/10 group-hover:border-primary/50"
                    >
                      Editar Conteúdo
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "broadcast" && <BroadcastTab />}
        {activeTab === "history" && <HistoryTab />}
      </div>
      </div>
    </div>
  );
}

// ===================== LANDING EDITOR =====================

const MAX = {
  brandName: 20, brandAccent: 10, ctaLabel: 20,
  heroBadge: 60, heroTitle: 140, heroSubtitle: 280,
  heroCta: 30, loginTitle: 40, loginSubtitle: 160,
  whatsappLabel: 30, navName: 20, navHref: 200,
  seoTitle: 60, seoDescription: 160,
};

const SOCIAL_META: Record<SocialLink['platform'], { icon: any; label: string; prefix: string }> = {
  instagram: { icon: Instagram, label: 'Instagram', prefix: 'https://instagram.com/' },
  youtube:   { icon: Youtube,   label: 'YouTube',   prefix: 'https://youtube.com/@' },
  tiktok:    { icon: Music2,    label: 'TikTok',    prefix: 'https://tiktok.com/@' },
  twitter:   { icon: Twitter,   label: 'X/Twitter', prefix: 'https://x.com/' },
  facebook:  { icon: Facebook,  label: 'Facebook',  prefix: 'https://facebook.com/' },
  linkedin:  { icon: Linkedin,  label: 'LinkedIn',  prefix: 'https://linkedin.com/in/' },
  github:    { icon: GithubIcon, label: 'GitHub',   prefix: 'https://github.com/' },
  website:   { icon: GlobeIcon, label: 'Site',      prefix: 'https://' },
};

function isValidUrl(v: string) {
  if (!v) return true;
  if (v.startsWith('/')) return true;
  try { new URL(v); return true; } catch { return false; }
}

function CharCounter({ value, max }: { value: string; max: number }) {
  const over = value.length > max;
  return (
    <span className={cn("text-[10px] font-mono tabular-nums", over ? "text-red-400" : "text-[#666]")}>
      {value.length}/{max}
    </span>
  );
}

function FieldLabel({ children, value, max }: { children: React.ReactNode; value?: string; max?: number }) {
  return (
    <div className="flex items-center justify-between mb-1">
      <label className="text-xs font-bold text-[#888888] uppercase">{children}</label>
      {value !== undefined && max !== undefined && <CharCounter value={value} max={max} />}
    </div>
  );
}

function ImageUploadField({ value, onChange, label, hint }: { value: string; onChange: (v: string) => void; label: string; hint?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleFile = (file: File) => {
    if (file.size > 2 * 1024 * 1024) { toast.error("Imagem deve ter no máximo 2MB."); return; }
    const reader = new FileReader();
    reader.onload = (e) => onChange(e.target?.result as string);
    reader.readAsDataURL(file);
  };
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-center gap-3">
        <div className="w-20 h-20 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center overflow-hidden flex-shrink-0">
          {value ? <img src={value} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-6 h-6 text-[#444]" />}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} className="border-white/10">
              <Upload className="w-3.5 h-3.5 mr-1.5" /> {value ? 'Trocar' : 'Enviar'}
            </Button>
            {value && (
              <Button size="sm" variant="ghost" onClick={() => onChange('')} className="text-red-400 hover:bg-red-500/10">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
          {hint && <p className="text-[10px] text-[#666]">{hint}</p>}
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
      </div>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-12 h-10 rounded-lg cursor-pointer bg-transparent border border-white/10" />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="bg-white/5 border-white/10 font-mono text-xs" placeholder="#8b5cf6" />
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, desc }: { icon: any; title: string; desc?: string }) {
  return (
    <div className="flex items-start gap-3 pb-2 border-b border-white/5">
      <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div>
        <h3 className="font-bold text-base text-white">{title}</h3>
        {desc && <p className="text-xs text-[#888]">{desc}</p>}
      </div>
    </div>
  );
}

function LandingEditor() {
  const s = useSiteSettings();
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const lastSavedLabel = useMemo(() => {
    if (!s.lastSavedAt) return 'Sem alterações ainda';
    const diff = Math.floor((Date.now() - s.lastSavedAt) / 1000);
    if (diff < 5) return 'Salvo agora';
    if (diff < 60) return `Salvo há ${diff}s`;
    if (diff < 3600) return `Salvo há ${Math.floor(diff/60)}min`;
    return new Date(s.lastSavedAt).toLocaleString('pt-BR');
  }, [s.lastSavedAt]);

  const whatsappValid = /^\d{10,15}$/.test(s.whatsappNumber);

  return (
    <div className="p-6 space-y-8 max-w-5xl">
      {/* Topo: status + ações */}
      <div className="sticky top-0 z-10 -mx-6 px-6 py-3 bg-[#0A0A0A] border-b border-white/5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold leading-tight">Editar Tela de Login</h2>
          <p className="text-[11px] text-[#888]">{lastSavedLabel} • salvo automaticamente</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-white/10 p-0.5">
            <button onClick={() => setPreviewMode('desktop')} className={cn("p-1.5 rounded-md", previewMode === 'desktop' ? 'bg-primary/20 text-primary' : 'text-[#888]')}>
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setPreviewMode('mobile')} className={cn("p-1.5 rounded-md", previewMode === 'mobile' ? 'bg-primary/20 text-primary' : 'text-[#888]')}>
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>
          <a
            href={previewMode === 'mobile' ? '/login' : '/login'}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90"
          >
            <Eye className="w-3.5 h-3.5" /> Visualizar
          </a>
        </div>
      </div>

      {/* MARCA */}
      <section className="space-y-4">
        <SectionHeader icon={Palette} title="Marca & Identidade Visual" desc="Logo, nome e cores que aparecem em toda a tela pública." />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ImageUploadField
            label="Logo (opcional — usa ícone padrão se vazio)"
            value={s.logoUrl}
            onChange={(v) => s.update({ logoUrl: v })}
            hint="PNG/SVG transparente. Até 2MB."
          />
          <div className="space-y-3">
            <div>
              <FieldLabel value={s.brandName} max={MAX.brandName}>Nome da marca</FieldLabel>
              <Input value={s.brandName} maxLength={MAX.brandName} onChange={(e) => s.update({ brandName: e.target.value })} className="bg-white/5 border-white/10" />
            </div>
            <div>
              <FieldLabel value={s.brandAccent} max={MAX.brandAccent}>Sufixo destacado (ex.: "N8N")</FieldLabel>
              <Input value={s.brandAccent} maxLength={MAX.brandAccent} onChange={(e) => s.update({ brandAccent: e.target.value })} className="bg-white/5 border-white/10" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ColorField label="Cor primária" value={s.primaryColor} onChange={(v) => s.update({ primaryColor: v })} />
          <ColorField label="Cor de destaque (accent)" value={s.accentColor} onChange={(v) => s.update({ accentColor: v })} />
        </div>
      </section>

      {/* NAVEGAÇÃO */}
      <section className="space-y-4">
        <SectionHeader icon={Layout} title="Itens da Barra de Navegação" desc="Arraste com as setas para reordenar." />
        <div className="space-y-2">
          {s.navLinks.map((link, i) => {
            const invalid = link.href && !isValidUrl(link.href);
            return (
              <div key={i} className="grid grid-cols-[auto_1fr_1.5fr_auto_auto] gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/5 items-start">
                <div className="flex flex-col gap-1 pt-1">
                  <button onClick={() => s.moveNavLink(i, i - 1)} disabled={i === 0} className="text-[#666] hover:text-white disabled:opacity-20"><ArrowUp className="w-3.5 h-3.5" /></button>
                  <button onClick={() => s.moveNavLink(i, i + 1)} disabled={i === s.navLinks.length - 1} className="text-[#666] hover:text-white disabled:opacity-20"><ArrowDown className="w-3.5 h-3.5" /></button>
                </div>
                <Input value={link.name} maxLength={MAX.navName} onChange={(e) => s.setNavLink(i, { name: e.target.value })} placeholder="Nome" className="bg-white/5 border-white/10" />
                <div>
                  <Input value={link.href} maxLength={MAX.navHref} onChange={(e) => s.setNavLink(i, { href: e.target.value })} placeholder="/planos ou https://..." className={cn("bg-white/5 border-white/10 font-mono text-xs", invalid && "border-red-500/50")} />
                  {invalid && <p className="text-[10px] text-red-400 mt-1">URL inválida</p>}
                </div>
                <label className="flex items-center gap-1.5 text-[10px] text-[#888] cursor-pointer pt-2.5 whitespace-nowrap">
                  <input type="checkbox" checked={!!link.newTab} onChange={(e) => s.setNavLink(i, { newTab: e.target.checked })} />
                  Nova aba
                </label>
                <Button size="icon" variant="ghost" onClick={() => s.removeNavLink(i)} className="text-red-400 hover:bg-red-500/10">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
        </div>
        <Button size="sm" onClick={s.addNavLink} className="gap-1.5 bg-primary/15 text-primary hover:bg-primary/25 border border-primary/30">
          <Plus className="w-3.5 h-3.5" /> Adicionar item
        </Button>
        <div className="flex flex-wrap gap-6 pt-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={s.showGithub} onChange={(e) => s.update({ showGithub: e.target.checked })} />
            Ícone GitHub no header
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={s.showGlobe} onChange={(e) => s.update({ showGlobe: e.target.checked })} />
            Ícone Globe no header
          </label>
        </div>
        <div className="max-w-md">
          <FieldLabel value={s.ctaLabel} max={MAX.ctaLabel}>Texto do botão "Entrar"</FieldLabel>
          <Input value={s.ctaLabel} maxLength={MAX.ctaLabel} onChange={(e) => s.update({ ctaLabel: e.target.value })} className="bg-white/5 border-white/10" />
        </div>
      </section>

      {/* HERO */}
      <section className="space-y-4">
        <SectionHeader icon={Layout} title="Hero (topo da tela inicial)" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FieldLabel value={s.heroBadge} max={MAX.heroBadge}>Badge (selo)</FieldLabel>
            <Input value={s.heroBadge} maxLength={MAX.heroBadge} onChange={(e) => s.update({ heroBadge: e.target.value })} className="bg-white/5 border-white/10" />
          </div>
          <ImageUploadField
            label="Imagem de fundo (opcional)"
            value={s.heroBgImage}
            onChange={(v) => s.update({ heroBgImage: v })}
            hint="Substitui o mockup. Recomendado 1600x900."
          />
          <div>
            <FieldLabel value={s.heroCtaPrimary} max={MAX.heroCta}>CTA primário</FieldLabel>
            <Input value={s.heroCtaPrimary} maxLength={MAX.heroCta} onChange={(e) => s.update({ heroCtaPrimary: e.target.value })} className="bg-white/5 border-white/10" />
          </div>
          <div>
            <FieldLabel value={s.heroCtaSecondary} max={MAX.heroCta}>CTA secundário</FieldLabel>
            <Input value={s.heroCtaSecondary} maxLength={MAX.heroCta} onChange={(e) => s.update({ heroCtaSecondary: e.target.value })} className="bg-white/5 border-white/10" />
          </div>
        </div>
        <div>
          <FieldLabel value={s.heroTitle} max={MAX.heroTitle}>Título principal</FieldLabel>
          <Textarea value={s.heroTitle} maxLength={MAX.heroTitle} onChange={(e) => s.update({ heroTitle: e.target.value })} className="bg-white/5 border-white/10 min-h-[90px]" />
        </div>
        <div>
          <FieldLabel value={s.heroSubtitle} max={MAX.heroSubtitle}>Subtítulo</FieldLabel>
          <Textarea value={s.heroSubtitle} maxLength={MAX.heroSubtitle} onChange={(e) => s.update({ heroSubtitle: e.target.value })} className="bg-white/5 border-white/10 min-h-[100px]" />
        </div>
      </section>

      {/* LOGIN CARD */}
      <section className="space-y-4">
        <SectionHeader icon={Layout} title='Card de Login (bolha "Entrar")' />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FieldLabel value={s.loginTitle} max={MAX.loginTitle}>Título</FieldLabel>
            <Input value={s.loginTitle} maxLength={MAX.loginTitle} onChange={(e) => s.update({ loginTitle: e.target.value })} className="bg-white/5 border-white/10" />
          </div>
          <div>
            <FieldLabel value={s.loginSubtitle} max={MAX.loginSubtitle}>Subtítulo</FieldLabel>
            <Textarea value={s.loginSubtitle} maxLength={MAX.loginSubtitle} onChange={(e) => s.update({ loginSubtitle: e.target.value })} className="bg-white/5 border-white/10 min-h-[60px]" />
          </div>
        </div>
      </section>

      {/* WHATSAPP */}
      <section className="space-y-4">
        <SectionHeader icon={Layout} title="Bolha de Suporte (WhatsApp)" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={s.showWhatsappBubble} onChange={(e) => s.update({ showWhatsappBubble: e.target.checked })} />
          Exibir bolha do WhatsApp
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FieldLabel>Número (DDI + DDD, só dígitos)</FieldLabel>
            <Input
              value={s.whatsappNumber}
              onChange={(e) => s.update({ whatsappNumber: e.target.value.replace(/\D/g, '').slice(0, 15) })}
              placeholder="5582996961448"
              className={cn("bg-white/5 border-white/10 font-mono", !whatsappValid && "border-red-500/50")}
            />
            {!whatsappValid ? (
              <p className="text-[10px] text-red-400 mt-1">Deve ter 10–15 dígitos (DDI + DDD + número).</p>
            ) : (
              <p className="text-[10px] text-[#666] mt-1">→ https://wa.me/{s.whatsappNumber}</p>
            )}
          </div>
          <div>
            <FieldLabel value={s.whatsappLabel} max={MAX.whatsappLabel}>Texto do botão</FieldLabel>
            <Input value={s.whatsappLabel} maxLength={MAX.whatsappLabel} onChange={(e) => s.update({ whatsappLabel: e.target.value })} className="bg-white/5 border-white/10" />
          </div>
        </div>
      </section>

      {/* REDES SOCIAIS */}
      <section className="space-y-4">
        <SectionHeader icon={Instagram} title="Redes Sociais (rodapé)" desc="Aparecem nos ícones do rodapé público." />
        <div className="space-y-2">
          {s.socials.map((social, i) => {
            const meta = SOCIAL_META[social.platform];
            const Icon = meta.icon;
            const invalid = social.url && !isValidUrl(social.url);
            return (
              <div key={i} className="grid grid-cols-[auto_1fr_2fr_auto] gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/5 items-center">
                <Icon className="w-5 h-5 text-primary" />
                <select
                  value={social.platform}
                  onChange={(e) => s.setSocial(i, { platform: e.target.value as SocialLink['platform'] })}
                  className="bg-white/5 border border-white/10 rounded-md text-xs h-9 px-2 text-white"
                >
                  {Object.entries(SOCIAL_META).map(([k, v]) => (
                    <option key={k} value={k} className="bg-[#0A0A0A]">{v.label}</option>
                  ))}
                </select>
                <div>
                  <Input value={social.url} onChange={(e) => s.setSocial(i, { url: e.target.value })} placeholder={meta.prefix + 'usuario'} className={cn("bg-white/5 border-white/10 font-mono text-xs", invalid && "border-red-500/50")} />
                  {invalid && <p className="text-[10px] text-red-400 mt-1">URL inválida</p>}
                </div>
                <Button size="icon" variant="ghost" onClick={() => s.removeSocial(i)} className="text-red-400 hover:bg-red-500/10">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
        </div>
        <Button size="sm" onClick={s.addSocial} className="gap-1.5 bg-primary/15 text-primary hover:bg-primary/25 border border-primary/30">
          <Plus className="w-3.5 h-3.5" /> Adicionar rede
        </Button>
      </section>

      {/* SEO */}
      <section className="space-y-4">
        <SectionHeader icon={Search} title="SEO & Compartilhamento" desc="Como a página aparece no Google e ao compartilhar em redes sociais." />
        <div>
          <FieldLabel value={s.seoTitle} max={MAX.seoTitle}>Title (Google)</FieldLabel>
          <Input value={s.seoTitle} maxLength={MAX.seoTitle} onChange={(e) => s.update({ seoTitle: e.target.value })} className="bg-white/5 border-white/10" />
        </div>
        <div>
          <FieldLabel value={s.seoDescription} max={MAX.seoDescription}>Meta description</FieldLabel>
          <Textarea value={s.seoDescription} maxLength={MAX.seoDescription} onChange={(e) => s.update({ seoDescription: e.target.value })} className="bg-white/5 border-white/10 min-h-[70px]" />
        </div>
        <ImageUploadField
          label="Open Graph image (preview ao compartilhar)"
          value={s.seoOgImage}
          onChange={(v) => s.update({ seoOgImage: v })}
          hint="Recomendado 1200x630."
        />
      </section>

      {/* RESET */}
      <div className="flex items-center justify-between pt-6 border-t border-white/5">
        <p className="text-xs text-[#666]">Alterações aplicam automaticamente e ficam salvas no navegador.</p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
              <AlertTriangle className="w-4 h-4 mr-2" /> Restaurar padrão
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Restaurar valores padrão?</AlertDialogTitle>
              <AlertDialogDescription>
                Todas as suas customizações (logo, cores, textos, redes, SEO) serão perdidas. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => { s.reset(); toast.success("Valores padrão restaurados."); }}
                className="bg-red-500 text-white hover:bg-red-600"
              >
                Sim, restaurar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}


// ===================== OVERVIEW TAB =====================

function StatCard({ icon: Icon, label, value, hint, accent }: { icon: any; label: string; value: string | number; hint?: string; accent?: string }) {
  return (
    <div className="p-5 rounded-2xl bg-[#0E0E0E] border border-white/10 hover:border-primary/30 transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", accent ?? "bg-primary/15 text-primary")}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-3xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-[#888] mt-1">{label}</p>
      {hint && <p className="text-[10px] text-[#555] mt-2">{hint}</p>}
    </div>
  );
}

function OverviewTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: () => getAdminOverview(),
    staleTime: 60_000,
  });

  if (isLoading) return <div className="p-8 text-center text-[#888]">Carregando métricas…</div>;
  if (!data) return <div className="p-8 text-center text-[#888]">Sem dados.</div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1">Visão Geral da Plataforma</h2>
        <p className="text-xs text-[#888]">Métricas em tempo real dos usuários e atividade.</p>
      </div>

      <div className="grid grid-cols-1 min-[360px]:grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Total de usuários" value={data.total} />
        <StatCard icon={UserCheck} label="Novos (7 dias)" value={data.recent} accent="bg-emerald-500/15 text-emerald-400" hint="cadastros recentes" />
        <StatCard icon={Crown} label="Plano PRO" value={data.pro} accent="bg-yellow-500/15 text-yellow-400" />
        <StatCard icon={Sparkles} label="Em TRIAL" value={data.trial} accent="bg-blue-500/15 text-blue-400" />
      </div>

      <div>
        <h3 className="text-sm font-bold text-[#aaa] uppercase tracking-wide mb-3">Atividade da plataforma</h3>
          <div className="grid grid-cols-1 min-[360px]:grid-cols-2 md:grid-cols-3 gap-3">
          <StatCard icon={TrendingUp} label="Execuções (7d)" value={data.runs7d} accent="bg-purple-500/15 text-purple-400" />
          <StatCard icon={Layout} label="Fluxos criados" value={data.workflows} accent="bg-pink-500/15 text-pink-400" />
          <StatCard icon={ImageIcon} label="Carrosséis gerados" value={data.carousels} accent="bg-orange-500/15 text-orange-400" />
        </div>
      </div>
    </div>
  );
}

// ===================== BROADCAST TAB =====================

function BroadcastTab() {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'info' | 'warning' | 'success'>('info');
  const [expiresInDays, setExpiresInDays] = useState<number>(7);

  const { data: broadcasts, isLoading } = useQuery({
    queryKey: ['admin-broadcasts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('broadcasts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const expires_at = expiresInDays > 0
        ? new Date(Date.now() + expiresInDays * 86400000).toISOString()
        : null;
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('broadcasts').insert({
        title, message, type, expires_at, is_active: true, created_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Aviso enviado para todos os usuários!');
      setTitle(''); setMessage('');
      qc.invalidateQueries({ queryKey: ['admin-broadcasts'] });
      qc.invalidateQueries({ queryKey: ['admin-overview'] });
    },
    onError: (e: any) => toast.error('Erro: ' + e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('broadcasts').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-broadcasts'] });
      qc.invalidateQueries({ queryKey: ['admin-overview'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('broadcasts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Aviso removido.');
      qc.invalidateQueries({ queryKey: ['admin-broadcasts'] });
      qc.invalidateQueries({ queryKey: ['admin-overview'] });
    },
  });

  const typeStyles: Record<string, string> = {
    info: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    warning: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  };
  const typeIcons: Record<string, any> = { info: Info, warning: AlertTriangle, success: CheckCircle2 };

  const canSend = title.trim().length >= 3 && message.trim().length >= 5;

  return (
    <div className="p-6 space-y-8">
      <div>
        <h2 className="text-xl font-bold mb-1">Avisos Globais (Broadcast)</h2>
        <p className="text-xs text-[#888]">Envie comunicados para todos os usuários da plataforma. Aparece na sino de notificações.</p>
      </div>

      {/* Form */}
      <div className="p-5 rounded-2xl bg-[#0E0E0E] border border-white/10 space-y-4 max-w-3xl">
        <h3 className="font-bold text-sm flex items-center gap-2"><Send className="w-4 h-4 text-primary" /> Novo aviso</h3>

        <div>
          <FieldLabel value={title} max={60}>Título</FieldLabel>
          <Input value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Atualização V 2.8.0 disponível" className="bg-white/5 border-white/10" />
        </div>

        <div>
          <FieldLabel value={message} max={500}>Mensagem</FieldLabel>
          <Textarea value={message} maxLength={500} onChange={(e) => setMessage(e.target.value)} placeholder="Conte o que mudou, próximos passos…" className="bg-white/5 border-white/10 min-h-[100px]" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Tipo</FieldLabel>
            <div className="flex gap-2">
              {(['info', 'success', 'warning'] as const).map((t) => {
                const Icon = typeIcons[t];
                return (
                  <button key={t} onClick={() => setType(t)} className={cn(
                    "flex-1 px-3 py-2 rounded-lg border text-xs font-bold capitalize flex items-center justify-center gap-1.5 transition",
                    type === t ? typeStyles[t] : "border-white/10 bg-white/5 text-[#888] hover:text-white"
                  )}>
                    <Icon className="w-3.5 h-3.5" /> {t}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <FieldLabel>Expira em (dias, 0 = nunca)</FieldLabel>
            <Input type="number" min={0} max={365} value={expiresInDays} onChange={(e) => setExpiresInDays(Math.max(0, parseInt(e.target.value) || 0))} className="bg-white/5 border-white/10" />
          </div>
        </div>

        <Button onClick={() => createMutation.mutate()} disabled={!canSend || createMutation.isPending} className="bg-primary text-black font-bold h-11 w-full">
          <Send className="w-4 h-4 mr-2" /> {createMutation.isPending ? 'Enviando…' : 'Enviar para todos'}
        </Button>
      </div>

      {/* Lista */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-[#aaa] uppercase tracking-wide">Avisos recentes</h3>
        {isLoading ? <p className="text-sm text-[#888]">Carregando…</p> : null}
        {broadcasts?.length === 0 && <p className="text-sm text-[#888] p-4 text-center bg-white/5 rounded-xl">Nenhum aviso enviado ainda.</p>}
        {broadcasts?.map((b: any) => {
          const Icon = typeIcons[b.type] ?? Info;
          const isExpired = b.expires_at && new Date(b.expires_at) < new Date();
          return (
            <div key={b.id} className={cn("p-4 rounded-xl border flex items-start gap-3", b.is_active && !isExpired ? typeStyles[b.type] : "border-white/10 bg-white/5 text-[#666]")}>
              <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-sm text-white">{b.title}</p>
                  {!b.is_active && <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10">Inativo</span>}
                  {isExpired && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">Expirado</span>}
                </div>
                <p className="text-xs mt-1 text-[#bbb]">{b.message}</p>
                <p className="text-[10px] text-[#666] mt-2">
                  {new Date(b.created_at).toLocaleString('pt-BR')}
                  {b.expires_at && ` • expira ${new Date(b.expires_at).toLocaleDateString('pt-BR')}`}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Switch checked={b.is_active} onCheckedChange={(v) => toggleMutation.mutate({ id: b.id, is_active: v })} />
                <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(b.id)} className="text-red-400 hover:bg-red-500/10 h-8 w-8">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===================== HISTORY TAB =====================

function HistoryTab() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['admin-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const statusColor: Record<string, string> = {
    info: 'text-blue-400 bg-blue-500/10',
    success: 'text-emerald-400 bg-emerald-500/10',
    warning: 'text-yellow-400 bg-yellow-500/10',
    error: 'text-red-400 bg-red-500/10',
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-1">Histórico de Atividades</h2>
      <p className="text-xs text-[#888] mb-6">Últimas 100 ações registradas na plataforma.</p>

      {isLoading && <p className="text-sm text-[#888]">Carregando…</p>}
      {!isLoading && logs?.length === 0 && (
        <div className="p-8 text-center text-[#888] bg-white/5 rounded-xl">Nenhum log disponível.</div>
      )}

      <div className="space-y-2">
        {logs?.map((log: any) => (
          <div key={log.id} className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-start gap-3 hover:border-white/10 transition">
            <div className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold uppercase flex-shrink-0", statusColor[log.status] ?? statusColor.info)}>
              {log.status}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{log.event_type}</p>
              <p className="text-xs text-[#aaa] line-clamp-2">{log.description}</p>
              <p className="text-[10px] text-[#666] mt-1">
                {log.user_email ?? 'sistema'} • {new Date(log.created_at).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===================== MANAGE USERS TAB =====================

function ManageUsersTab() {
  const [search, setSearch] = useState('');
  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, name, email, handle, plan, trial_ends_at, created_at, avatar_url')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    if (!users) return [];
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u: any) =>
      (u.email ?? '').toLowerCase().includes(q) ||
      (u.name ?? '').toLowerCase().includes(q) ||
      (u.handle ?? '').toLowerCase().includes(q)
    );
  }, [users, search]);

  const planStyles: Record<string, string> = {
    CEO: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    PRO: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    TRIAL: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    USER: 'bg-white/10 text-[#aaa] border-white/10',
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h2 className="text-xl font-bold mb-1">Gerenciar Usuários</h2>
          <p className="text-xs text-[#888]">{users?.length ?? 0} usuários cadastrados na plataforma.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, email ou @"
            className="pl-9 bg-white/5 border-white/10"
          />
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-[#888] text-center py-8">Carregando usuários…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-[#888] text-center py-8 bg-white/5 rounded-xl">Nenhum usuário encontrado.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[#888] text-xs uppercase tracking-wider border-b border-[#2A2A2A]">
              <tr>
                <th className="px-3 py-3">Usuário</th>
                <th className="px-3 py-3">Email</th>
                <th className="px-3 py-3">@</th>
                <th className="px-3 py-3">Plano</th>
                <th className="px-3 py-3">Cadastro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2A2A]">
              {filtered.map((u: any) => (
                <tr key={u.user_id} className="hover:bg-white/5 transition-colors">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                          {(u.name ?? u.email ?? '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium truncate max-w-[160px]">{u.name ?? '—'}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-[#bbb] truncate max-w-[220px]">{u.email ?? '—'}</td>
                  <td className="px-3 py-3 text-primary">{u.handle ? `@${u.handle}` : <span className="text-[#555]">—</span>}</td>
                  <td className="px-3 py-3">
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-bold", planStyles[u.plan] ?? planStyles.USER)}>
                      {u.plan ?? 'USER'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-[#888] text-xs">{u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
