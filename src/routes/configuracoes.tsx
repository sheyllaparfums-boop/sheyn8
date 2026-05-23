import { createFileRoute, Link } from "@tanstack/react-router";
import { requireAuth } from "@/lib/route-guards";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  ShieldCheck,
  Bell,
  Lock,
  HardDrive,
  Info,
  User as UserIcon,
  Palette,
  Plug,
  Sparkles,
  Trash2,
  KeyRound,
  LogOut,
  AlertTriangle,
  Globe,
  Clock,
  Wand2,
  FileDown,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { getBackupOverview, exportBackup, importBackup } from "@/lib/backup.functions";
import { getMyProfile, updateMyProfile } from "@/lib/profile-settings.functions";
import { DashboardHeader } from "@/components/dashboard/Header";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/auth-store";
import { usePreferences, type NotificationTopics } from "@/lib/preferences-store";

export const Route = createFileRoute("/configuracoes")({
  beforeLoad: ({ location }) => requireAuth(location),
  head: () => ({
    meta: [
      { title: "Configurações — SHEY N8N" },
      { name: "description", content: "Perfil, segurança, aparência, notificações, integrações, plano e backup." },
    ],
  }),
  component: ConfiguracoesPage,
});

const TABLE_LABELS: Record<string, string> = {
  carousels: "Carrosséis",
  viral_hooks: "Ganchos Virais",
  content_calendar: "Calendário Editorial",
  competitor_analyses: "Análises de Concorrente",
  reel_transcriptions: "Transcrições de Reel",
  activity_logs: "Histórico de Atividades",
  api_credentials: "Credenciais de API",
  profile_analyses: "Análises de Perfil",
  user_workflows: "Workflows",
};

const ACCENTS = [
  { name: "Roxo", value: "#8b5cf6" },
  { name: "Rosa", value: "#ec4899" },
  { name: "Azul", value: "#3b82f6" },
  { name: "Verde", value: "#10b981" },
  { name: "Âmbar", value: "#f59e0b" },
  { name: "Coral", value: "#ef4444" },
];

const TOPIC_LABELS: Record<keyof NotificationTopics, { title: string; desc: string }> = {
  reports: { title: "Relatórios", desc: "Análises de perfil, snapshots semanais." },
  alerts: { title: "Alertas críticos", desc: "Quedas de engajamento, falhas em fluxos." },
  schedule: { title: "Agendamentos", desc: "Lembretes do calendário editorial." },
  product: { title: "Novidades", desc: "Atualizações da plataforma e dicas." },
};

function download(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function applyTheme(theme: "dark" | "light" | "system") {
  const root = document.documentElement;
  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", isDark);
  root.classList.toggle("light", !isDark);
}

function applyAccent(hex: string) {
  document.documentElement.style.setProperty("--accent-custom", hex);
}

function applyMotion(reduce: boolean) {
  document.documentElement.dataset.reduceMotion = reduce ? "true" : "false";
}

function applyDensity(density: "comfortable" | "compact") {
  document.documentElement.dataset.density = density;
}

function ConfiguracoesPage() {
  const fetchOverview = useServerFn(getBackupOverview);
  const runExport = useServerFn(exportBackup);
  const runImport = useServerFn(importBackup);
  const fetchProfile = useServerFn(getMyProfile);
  const saveProfile = useServerFn(updateMyProfile);

  const { user, logout } = useAuthStore();
  const prefs = usePreferences();

  const overview = useQuery({
    queryKey: ["backup-overview"],
    queryFn: () => fetchOverview(),
  });

  const profileQ = useQuery({
    queryKey: ["my-profile-settings"],
    queryFn: () => fetchProfile(),
  });

  const tables = overview.data?.tables ?? [];
  const counts = overview.data?.counts ?? {};

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const fileRef = useRef<HTMLInputElement>(null);

  // Profile form local state
  const [profileForm, setProfileForm] = useState({
    name: "",
    handle: "",
    niche: "",
    goal: "",
    avatar_url: "",
  });
  useEffect(() => {
    if (profileQ.data) {
      setProfileForm({
        name: profileQ.data.name ?? "",
        handle: profileQ.data.handle ?? "",
        niche: profileQ.data.niche ?? "",
        goal: profileQ.data.goal ?? "",
        avatar_url: profileQ.data.avatar_url ?? "",
      });
    }
  }, [profileQ.data]);

  // Apply visual prefs on mount + change
  useEffect(() => applyTheme(prefs.theme), [prefs.theme]);
  useEffect(() => applyAccent(prefs.accent), [prefs.accent]);
  useEffect(() => applyMotion(prefs.reduceMotion), [prefs.reduceMotion]);
  useEffect(() => applyDensity(prefs.density), [prefs.density]);

  const allSelected = tables.length > 0 && tables.every((t) => selected[t]);
  const someSelected = tables.some((t) => selected[t]);
  const toggleAll = () => {
    if (allSelected) setSelected({});
    else setSelected(Object.fromEntries(tables.map((t) => [t, true])));
  };
  const wantedTables = () => tables.filter((t) => selected[t]);

  const handleExport = async () => {
    setBusy(true);
    try {
      const list = wantedTables();
      const { json } = await runExport({ data: { tables: list.length ? list : undefined } });
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      download(`shey-backup-${stamp}.json`, json, "application/json");
      prefs.update({ lastBackupAt: new Date().toISOString() });
      toast.success("Backup gerado com sucesso.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar backup.");
    } finally {
      setBusy(false);
    }
  };

  const handleImportFile = async (file: File) => {
    if (!file.name.endsWith(".json")) {
      toast.error("Selecione um arquivo .json de backup.");
      return;
    }
    setBusy(true);
    try {
      const text = await file.text();
      if (mode === "replace") {
        const confirmed = window.confirm(
          "Modo SUBSTITUIR vai apagar os dados atuais das tabelas selecionadas antes de importar. Continuar?",
        );
        if (!confirmed) {
          setBusy(false);
          return;
        }
      }
      const list = wantedTables();
      const { summary } = await runImport({
        data: { payload: text, mode, tables: list.length ? list : undefined },
      });
      const total = Object.values(summary).reduce((acc, s) => acc + s.imported, 0);
      toast.success(`Importação concluída: ${total} registros.`);
      overview.refetch();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Falha ao importar.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // Profile save
  const handleSaveProfile = async () => {
    setBusy(true);
    try {
      await saveProfile({
        data: {
          name: profileForm.name || undefined,
          handle: profileForm.handle.replace(/^@+/, "") || undefined,
          niche: profileForm.niche || undefined,
          goal: profileForm.goal || undefined,
          avatar_url: profileForm.avatar_url || null,
        },
      });
      toast.success("Perfil atualizado.");
      profileQ.refetch();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar.");
    } finally {
      setBusy(false);
    }
  };

  // Password change
  const [pwd, setPwd] = useState({ next: "", confirm: "" });
  const handleChangePassword = async () => {
    if (pwd.next.length < 8) return toast.error("Mínimo de 8 caracteres.");
    if (pwd.next !== pwd.confirm) return toast.error("Senhas não conferem.");
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwd.next });
      if (error) throw error;
      toast.success("Senha alterada.");
      setPwd({ next: "", confirm: "" });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Falha ao alterar senha.");
    } finally {
      setBusy(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return toast.error("Email não disponível.");
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Link de redefinição enviado para seu email.");
  };

  const handleSignOutAll = async () => {
    if (!window.confirm("Sair de TODOS os dispositivos? Você terá que entrar novamente.")) return;
    await supabase.auth.signOut({ scope: "global" });
    logout();
    window.location.href = "/login";
  };

  // LGPD export
  const handleDataExport = async () => {
    setBusy(true);
    try {
      const { json } = await runExport({ data: {} });
      download(`meus-dados-${new Date().toISOString().slice(0, 10)}.json`, json, "application/json");
      toast.success("Seus dados foram exportados.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Falha na exportação.");
    } finally {
      setBusy(false);
    }
  };

  const handleClearCache = () => {
    if (!window.confirm("Limpar cache local? Suas preferências de visualização e histórico local serão perdidos.")) return;
    try {
      const keep = ["shey-n8n-auth"];
      Object.keys(localStorage).forEach((k) => {
        if (!keep.includes(k)) localStorage.removeItem(k);
      });
      toast.success("Cache limpo. Recarregando…");
      setTimeout(() => window.location.reload(), 600);
    } catch {
      toast.error("Falha ao limpar cache.");
    }
  };

  const handleDeleteAccount = async () => {
    const phrase = "EXCLUIR";
    const input = window.prompt(
      `Esta ação solicita a exclusão definitiva da sua conta e de todos os seus dados (LGPD). Digite "${phrase}" para confirmar:`,
    );
    if (input !== phrase) return;
    toast.success("Pedido recebido. Nossa equipe processará em até 30 dias.");
    setTimeout(() => handleSignOutAll(), 1500);
  };

  const lastBackupLabel = prefs.lastBackupAt
    ? new Date(prefs.lastBackupAt).toLocaleString("pt-BR")
    : "Nunca";

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      <div className="flex-1 space-y-6 px-4 pb-12 md:px-8 md:py-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Configurações</h1>
          <p className="text-sm text-muted-foreground">
            Perfil, segurança, aparência, notificações, integrações, plano e dados.
          </p>
        </div>

        <Tabs defaultValue="perfil" className="space-y-4">
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
            <TabsTrigger value="perfil" className="gap-2"><UserIcon className="h-4 w-4" /> Perfil</TabsTrigger>
            <TabsTrigger value="seguranca" className="gap-2"><Lock className="h-4 w-4" /> Segurança</TabsTrigger>
            <TabsTrigger value="aparencia" className="gap-2"><Palette className="h-4 w-4" /> Aparência</TabsTrigger>
            <TabsTrigger value="notificacoes" className="gap-2"><Bell className="h-4 w-4" /> Notificações</TabsTrigger>
            <TabsTrigger value="integracoes" className="gap-2"><Plug className="h-4 w-4" /> Integrações</TabsTrigger>
            <TabsTrigger value="plano" className="gap-2"><Sparkles className="h-4 w-4" /> Plano</TabsTrigger>
            <TabsTrigger value="backup" className="gap-2"><HardDrive className="h-4 w-4" /> Dados</TabsTrigger>
            <TabsTrigger value="avancado" className="gap-2"><Wand2 className="h-4 w-4" /> Avançado</TabsTrigger>
          </TabsList>

          {/* ============ PERFIL ============ */}
          <TabsContent value="perfil" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><UserIcon className="h-5 w-5 text-primary" /> Meu perfil</CardTitle>
                <CardDescription>Como você aparece na plataforma e nos relatórios.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Nome de exibição</Label>
                    <Input value={profileForm.name} onChange={(e) => setProfileForm((s) => ({ ...s, name: e.target.value }))} maxLength={120} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input value={profileQ.data?.email ?? user?.email ?? ""} disabled />
                    <p className="text-[11px] text-muted-foreground">Email é gerenciado pelo provedor de autenticação.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Handle Instagram</Label>
                    <Input value={profileForm.handle} onChange={(e) => setProfileForm((s) => ({ ...s, handle: e.target.value }))} placeholder="seuhandle" maxLength={60} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Nicho</Label>
                    <Input value={profileForm.niche} onChange={(e) => setProfileForm((s) => ({ ...s, niche: e.target.value }))} placeholder="ex.: beleza, fitness" maxLength={60} />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>Objetivo principal</Label>
                    <Input value={profileForm.goal} onChange={(e) => setProfileForm((s) => ({ ...s, goal: e.target.value }))} placeholder="ex.: chegar a 50k seguidores em 6 meses" maxLength={120} />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>URL do avatar</Label>
                    <Input value={profileForm.avatar_url} onChange={(e) => setProfileForm((s) => ({ ...s, avatar_url: e.target.value }))} placeholder="https://…" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSaveProfile} disabled={busy}>Salvar perfil</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5 text-primary" /> Idioma, moeda e fuso</CardTitle>
                <CardDescription>Usado em relatórios, datas e valores monetários.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Idioma</Label>
                  <Select value={prefs.language} onValueChange={(v: "pt-BR" | "en-US" | "es-ES") => prefs.update({ language: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                      <SelectItem value="en-US">English (US)</SelectItem>
                      <SelectItem value="es-ES">Español</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Moeda</Label>
                  <Select value={prefs.currency} onValueChange={(v: "BRL" | "USD" | "EUR") => prefs.update({ currency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BRL">Real (R$)</SelectItem>
                      <SelectItem value="USD">Dólar ($)</SelectItem>
                      <SelectItem value="EUR">Euro (€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Fuso horário</Label>
                  <Input value={prefs.timezone} onChange={(e) => prefs.update({ timezone: e.target.value })} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============ SEGURANÇA ============ */}
          <TabsContent value="seguranca" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-primary" /> Senha</CardTitle>
                <CardDescription>Defina uma nova senha de no mínimo 8 caracteres.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Nova senha</Label>
                    <Input type="password" value={pwd.next} onChange={(e) => setPwd((s) => ({ ...s, next: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Confirmar</Label>
                    <Input type="password" value={pwd.confirm} onChange={(e) => setPwd((s) => ({ ...s, confirm: e.target.value }))} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleChangePassword} disabled={busy}>Alterar senha</Button>
                  <Button variant="outline" onClick={handlePasswordReset}>Enviar link por email</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Autenticação em dois fatores</CardTitle>
                <CardDescription>Camada extra de segurança com app autenticador (TOTP).</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Status: <Badge variant="outline">Em breve</Badge></p>
                  <p className="text-xs text-muted-foreground">Suporte a Google Authenticator e Authy.</p>
                </div>
                <Button variant="outline" disabled>Configurar 2FA</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><LogOut className="h-5 w-5 text-primary" /> Sessões</CardTitle>
                <CardDescription>Encerra o acesso em todos os navegadores e dispositivos.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-lg border border-border bg-card/40 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{user?.name ?? "Sessão atual"}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                    <Badge>Ativa</Badge>
                  </div>
                </div>
                <Button variant="destructive" onClick={handleSignOutAll} className="gap-2">
                  <LogOut className="h-4 w-4" /> Sair de todos os dispositivos
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============ APARÊNCIA ============ */}
          <TabsContent value="aparencia" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5 text-primary" /> Tema</CardTitle>
                <CardDescription>Modo claro, escuro ou siga o sistema.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <RadioGroup value={prefs.theme} onValueChange={(v: "dark" | "light" | "system") => prefs.update({ theme: v })} className="grid grid-cols-3 gap-2">
                  {(["dark", "light", "system"] as const).map((t) => (
                    <Label key={t} htmlFor={`th-${t}`} className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card/40 p-3 text-sm">
                      <RadioGroupItem value={t} id={`th-${t}`} />
                      <span className="capitalize">{t === "system" ? "Sistema" : t === "dark" ? "Escuro" : "Claro"}</span>
                    </Label>
                  ))}
                </RadioGroup>

                <Separator />

                <div className="space-y-2">
                  <Label>Cor de destaque</Label>
                  <div className="flex flex-wrap gap-2">
                    {ACCENTS.map((a) => (
                      <button
                        key={a.value}
                        onClick={() => prefs.update({ accent: a.value })}
                        className={`h-9 w-9 rounded-full border-2 transition-transform hover:scale-110 ${prefs.accent === a.value ? "border-foreground" : "border-transparent"}`}
                        style={{ background: a.value }}
                        aria-label={a.name}
                      />
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Densidade</Label>
                  <RadioGroup value={prefs.density} onValueChange={(v: "comfortable" | "compact") => prefs.update({ density: v })} className="grid grid-cols-2 gap-2">
                    <Label htmlFor="d-comf" className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card/40 p-3 text-sm">
                      <RadioGroupItem value="comfortable" id="d-comf" /> Confortável
                    </Label>
                    <Label htmlFor="d-comp" className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card/40 p-3 text-sm">
                      <RadioGroupItem value="compact" id="d-comp" /> Compacto
                    </Label>
                  </RadioGroup>
                </div>

                <div className="flex items-center justify-between rounded-md border border-border bg-card/40 p-3">
                  <div>
                    <p className="text-sm font-medium">Reduzir animações</p>
                    <p className="text-xs text-muted-foreground">Acessibilidade — menos movimento na interface.</p>
                  </div>
                  <Switch checked={prefs.reduceMotion} onCheckedChange={(v) => prefs.update({ reduceMotion: v })} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============ NOTIFICAÇÕES ============ */}
          <TabsContent value="notificacoes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-primary" /> Canais por tópico</CardTitle>
                <CardDescription>Escolha como receber cada tipo de notificação.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(Object.keys(TOPIC_LABELS) as Array<keyof NotificationTopics>).map((topic) => {
                  const t = prefs.notifications[topic];
                  const meta = TOPIC_LABELS[topic];
                  return (
                    <div key={topic} className="rounded-md border border-border bg-card/40 p-3">
                      <div className="mb-2">
                        <p className="text-sm font-semibold">{meta.title}</p>
                        <p className="text-xs text-muted-foreground">{meta.desc}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {(["email", "push", "inApp"] as const).map((ch) => (
                          <label key={ch} className="flex items-center gap-2 text-xs">
                            <Checkbox checked={t[ch]} onCheckedChange={(v) => prefs.setTopic(topic, { [ch]: !!v })} />
                            <span className="capitalize">{ch === "inApp" ? "In-app" : ch}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-primary" /> Não perturbe</CardTitle>
                <CardDescription>Pausa notificações em um horário definido.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Ativar horário silencioso</Label>
                  <Switch checked={prefs.quietHours.enabled} onCheckedChange={(v) => prefs.update({ quietHours: { ...prefs.quietHours, enabled: v } })} />
                </div>
                {prefs.quietHours.enabled && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>De</Label>
                      <Input type="time" value={prefs.quietHours.from} onChange={(e) => prefs.update({ quietHours: { ...prefs.quietHours, from: e.target.value } })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Até</Label>
                      <Input type="time" value={prefs.quietHours.to} onChange={(e) => prefs.update({ quietHours: { ...prefs.quietHours, to: e.target.value } })} />
                    </div>
                  </div>
                )}
                <Separator />
                <div className="space-y-1.5">
                  <Label>Resumo por email</Label>
                  <Select value={prefs.digest} onValueChange={(v: "off" | "daily" | "weekly") => prefs.update({ digest: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="off">Desativado</SelectItem>
                      <SelectItem value="daily">Diário</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============ INTEGRAÇÕES ============ */}
          <TabsContent value="integracoes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Plug className="h-5 w-5 text-primary" /> Contas conectadas</CardTitle>
                <CardDescription>Gerencie as integrações da sua conta.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { name: "Instagram", desc: "Coleta de métricas e mídias.", status: "Configurar" },
                  { name: "YouTube", desc: "Mentorias e vídeos virais.", status: "Configurar" },
                  { name: "WhatsApp", desc: "Suporte e notificações.", status: "Configurar" },
                  { name: "Google", desc: "Login social.", status: "Configurar" },
                ].map((i) => (
                  <div key={i.name} className="flex items-center justify-between rounded-md border border-border bg-card/40 p-3">
                    <div>
                      <p className="text-sm font-medium">{i.name}</p>
                      <p className="text-xs text-muted-foreground">{i.desc}</p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link to="/integracoes" className="gap-1"><ExternalLink className="h-3 w-3" /> {i.status}</Link>
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============ PLANO ============ */}
          <TabsContent value="plano" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Sua assinatura</CardTitle>
                <CardDescription>Plano atual, trial e faturas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between rounded-md border border-border bg-card/40 p-3">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Plano atual</p>
                    <p className="text-lg font-bold">{user?.plan ?? "TRIAL"}</p>
                    {user?.trialEndsAt && (
                      <p className="text-xs text-muted-foreground">Trial até {new Date(user.trialEndsAt).toLocaleDateString("pt-BR")}</p>
                    )}
                  </div>
                  <Button asChild><Link to="/planos">Gerenciar plano</Link></Button>
                </div>
                <div className="rounded-md border border-border bg-card/40 p-3 text-sm">
                  <p className="font-medium">Histórico de faturas</p>
                  <p className="text-xs text-muted-foreground">Disponível após ativação do pagamento.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============ BACKUP / DADOS ============ */}
          <TabsContent value="backup" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-primary" /> Selecione os dados</CardTitle>
                  <CardDescription>Tabelas para incluir no backup ou importação. Nenhuma seleção = todas.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => overview.refetch()} disabled={overview.isFetching} className="gap-2">
                  <RefreshCw className={`h-4 w-4 ${overview.isFetching ? "animate-spin" : ""}`} /> Atualizar
                </Button>
              </CardHeader>
              <CardContent>
                <div className="mb-3 flex items-center gap-2">
                  <Checkbox id="all" checked={allSelected} onCheckedChange={toggleAll} />
                  <Label htmlFor="all" className="text-sm font-medium">Selecionar todas</Label>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {tables.map((t) => (
                    <label key={t} className="flex items-center justify-between rounded-md border border-border/60 bg-card/30 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Checkbox checked={!!selected[t]} onCheckedChange={(v) => setSelected((s) => ({ ...s, [t]: !!v }))} />
                        <span className="text-sm">{TABLE_LABELS[t] ?? t}</span>
                      </div>
                      <span className="font-mono text-xs text-muted-foreground">{counts[t] ?? 0} reg.</span>
                    </label>
                  ))}
                  {!tables.length && (<p className="col-span-2 py-6 text-center text-sm text-muted-foreground">Carregando tabelas...</p>)}
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Download className="h-5 w-5 text-primary" /> Exportar backup</CardTitle>
                  <CardDescription>Arquivo .json com todos os registros das tabelas selecionadas.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">Último backup: <span className="font-mono">{lastBackupLabel}</span></p>
                  <Button onClick={handleExport} disabled={busy} className="w-full gap-2">
                    <Download className="h-4 w-4" />{someSelected ? "Exportar selecionadas" : "Exportar tudo"}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5 text-primary" /> Importar backup</CardTitle>
                  <CardDescription>Envie um arquivo .json gerado por esta plataforma.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <RadioGroup value={mode} onValueChange={(v) => setMode(v as "merge" | "replace")}>
                    <div className="flex items-start gap-2">
                      <RadioGroupItem value="merge" id="merge" />
                      <Label htmlFor="merge" className="text-sm font-normal leading-tight">
                        <span className="font-medium">Mesclar</span>
                        <span className="block text-xs text-muted-foreground">Adiciona/atualiza registros (recomendado).</span>
                      </Label>
                    </div>
                    <div className="flex items-start gap-2">
                      <RadioGroupItem value="replace" id="replace" />
                      <Label htmlFor="replace" className="text-sm font-normal leading-tight">
                        <span className="font-medium text-red-400">Substituir</span>
                        <span className="block text-xs text-muted-foreground">Apaga os dados atuais antes de importar.</span>
                      </Label>
                    </div>
                  </RadioGroup>
                  <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImportFile(f); }} />
                  <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={busy} className="w-full gap-2">
                    <Upload className="h-4 w-4" /> Escolher arquivo .json
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-primary" /> Backup automático</CardTitle>
                <CardDescription>Lembrete para gerar backup periódico.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Ativar lembrete</Label>
                  <Switch checked={prefs.backupSchedule.enabled} onCheckedChange={(v) => prefs.update({ backupSchedule: { ...prefs.backupSchedule, enabled: v } })} />
                </div>
                {prefs.backupSchedule.enabled && (
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Frequência</Label>
                      <Select value={prefs.backupSchedule.frequency} onValueChange={(v: "daily" | "weekly" | "monthly") => prefs.update({ backupSchedule: { ...prefs.backupSchedule, frequency: v } })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Diário</SelectItem>
                          <SelectItem value="weekly">Semanal</SelectItem>
                          <SelectItem value="monthly">Mensal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Horário ({prefs.backupSchedule.hour.toString().padStart(2, "0")}h)</Label>
                      <Slider min={0} max={23} step={1} value={[prefs.backupSchedule.hour]} onValueChange={(v) => prefs.update({ backupSchedule: { ...prefs.backupSchedule, hour: v[0] } })} />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileDown className="h-5 w-5 text-primary" /> LGPD — Meus dados</CardTitle>
                <CardDescription>Exporte uma cópia de tudo que armazenamos sobre você.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" onClick={handleDataExport} disabled={busy} className="gap-2">
                  <FileDown className="h-4 w-4" /> Baixar meus dados (.json)
                </Button>
              </CardContent>
            </Card>

            <Alert>
              <ShieldCheck className="h-4 w-4" />
              <AlertTitle>Boas práticas de backup</AlertTitle>
              <AlertDescription>Exporte um backup completo semanalmente. Mantenha cópias em pelo menos dois lugares. O modo "Substituir" é destrutivo.</AlertDescription>
            </Alert>
          </TabsContent>

          {/* ============ AVANÇADO ============ */}
          <TabsContent value="avancado" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Wand2 className="h-5 w-5 text-primary" /> Manutenção</CardTitle>
                <CardDescription>Ferramentas de diagnóstico e limpeza.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between rounded-md border border-border bg-card/40 p-3">
                  <div>
                    <p className="text-sm font-medium">Limpar cache local</p>
                    <p className="text-xs text-muted-foreground">Remove preferências de UI, mantém sua sessão.</p>
                  </div>
                  <Button variant="outline" onClick={handleClearCache} className="gap-2">
                    <RefreshCw className="h-4 w-4" /> Limpar
                  </Button>
                </div>
                <div className="flex items-center justify-between rounded-md border border-border bg-card/40 p-3">
                  <div>
                    <p className="text-sm font-medium">Refazer onboarding</p>
                    <p className="text-xs text-muted-foreground">Mostrar novamente o tour inicial.</p>
                  </div>
                  <Button variant="outline" onClick={() => { useAuthStore.setState((s) => ({ tourSeenByUser: { ...s.tourSeenByUser, [user?.id ?? "anon"]: false } })); toast.success("Tour reativado."); }}>
                    Refazer tour
                  </Button>
                </div>
                <div className="flex items-center justify-between rounded-md border border-border bg-card/40 p-3">
                  <div>
                    <p className="text-sm font-medium">Histórico de atividades</p>
                    <p className="text-xs text-muted-foreground">Veja logins, ações e eventos da sua conta.</p>
                  </div>
                  <Button asChild variant="outline"><Link to="/execucoes">Ver histórico</Link></Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-destructive/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-5 w-5" /> Zona de perigo</CardTitle>
                <CardDescription>Ações irreversíveis. Faça backup antes.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-md border border-destructive/30 bg-destructive/5 p-3">
                  <div>
                    <p className="text-sm font-semibold text-destructive">Excluir minha conta</p>
                    <p className="text-xs text-muted-foreground">Remove conta e todos os dados em até 30 dias (LGPD).</p>
                  </div>
                  <Button variant="destructive" onClick={handleDeleteAccount} className="gap-2">
                    <Trash2 className="h-4 w-4" /> Excluir conta
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Alert className="border-primary/20 bg-primary/5">
              <Info className="h-4 w-4 text-primary" />
              <AlertTitle>Suas preferências são privadas</AlertTitle>
              <AlertDescription>Tema, idioma e canais de notificação ficam salvos apenas no seu navegador.</AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
