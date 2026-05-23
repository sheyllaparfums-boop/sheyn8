import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/route-guards";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { DashboardHeader } from "@/components/dashboard/Header";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  KeyRound, ArrowRight, CheckCircle2, XCircle, HelpCircle, RefreshCw, Loader2,
  Eye, EyeOff, RotateCw, Search, Download, Upload, Activity, ExternalLink,
  Clock, AlertTriangle, DollarSign, Webhook, Bell, Filter,
  Instagram, Youtube, Mic2, Globe, Bot, Sparkles, Database,
} from "lucide-react";

const PROVIDER_ICON: Record<string, { Icon: any; cls: string }> = {
  INSTAGRAM_ACCESS_TOKEN: { Icon: Instagram, cls: "text-pink-400" },
  INSTAGRAM_APP_ID: { Icon: Instagram, cls: "text-pink-400" },
  INSTAGRAM_APP_SECRET: { Icon: Instagram, cls: "text-pink-400" },
  YOUTUBE_API_KEY: { Icon: Youtube, cls: "text-red-500" },
  ELEVENLABS_API_KEY: { Icon: Mic2, cls: "text-violet-400" },
  APIFY_API_TOKEN: { Icon: Database, cls: "text-sky-400" },
  FIRECRAWL_API_KEY: { Icon: Globe, cls: "text-orange-400" },
  GROQ_API_KEY: { Icon: Bot, cls: "text-emerald-400" },
};
import {
  API_KEYS,
  listApiCredentials,
  saveApiCredential,
  validateApiCredential,
  validateAllCredentials,
  listCredentialLogs,
  getCredentialMetadata,
  updateCredentialMetadata,
  rotateApiCredential,
  importFromEnv,
  exportCredentialsConfig,
  revealCredentialValue,
} from "@/lib/api-credentials.functions";
import { useIsCeo } from "@/hooks/use-is-ceo";
import { useAuthStore } from "@/lib/auth-store";

export const Route = createFileRoute("/integracoes")({
  beforeLoad: ({ location }) => requireAuth(location),
  head: () => ({
    meta: [
      { title: "Integrações — SHEY N8N" },
      { name: "description", content: "Conecte suas ferramentas e gerencie chaves de API." },
    ],
  }),
  component: IntegracoesPage,
});

const CATEGORY_MAP: Record<string, string> = {
  INSTAGRAM_ACCESS_TOKEN: "Social",
  INSTAGRAM_APP_ID: "Social",
  INSTAGRAM_APP_SECRET: "Social",
  APIFY_API_TOKEN: "Scraping",
  FIRECRAWL_API_KEY: "Scraping",
  ELEVENLABS_API_KEY: "Áudio",
  YOUTUBE_API_KEY: "Vídeo",
  GROQ_API_KEY: "IA",
};

const STATUS_META: Record<string, { label: string; cls: string; icon: any }> = {
  valid: { label: "OK", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  invalid: { label: "Erro", cls: "bg-red-500/15 text-red-400 border-red-500/30", icon: XCircle },
  saved: { label: "Salva", cls: "bg-blue-500/15 text-blue-400 border-blue-500/30", icon: CheckCircle2 },
  env: { label: "Env", cls: "bg-purple-500/15 text-purple-400 border-purple-500/30", icon: CheckCircle2 },
  missing: { label: "Faltando", cls: "bg-muted text-muted-foreground border-border", icon: HelpCircle },
  unknown: { label: "?", cls: "bg-muted text-muted-foreground border-border", icon: HelpCircle },
};

function relTime(iso: string | null): string {
  if (!iso) return "nunca";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `há ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}

function IntegracoesPage() {
  const isCeo = useIsCeo();
  const sessionReady = useAuthStore((s) => s.sessionReady);
  const authedUser = useAuthStore((s) => s.user);
  const [rows, setRows] = useState<any[]>([]);
  const [meta, setMeta] = useState<Record<string, any>>({});
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState<string | null>(null);
  const [validatingAll, setValidatingAll] = useState(false);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [selected, setSelected] = useState<any>(null);
  const [apiKey, setApiKey] = useState("");
  const [reveal, setReveal] = useState(false);
  const [revealedValue, setRevealedValue] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [envText, setEnvText] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);

  const validate = useServerFn(validateApiCredential);
  const validateAll = useServerFn(validateAllCredentials);
  const save = useServerFn(saveApiCredential);
  const rotate = useServerFn(rotateApiCredential);
  const updateMeta = useServerFn(updateCredentialMetadata);
  const importEnv = useServerFn(importFromEnv);
  const exportCfg = useServerFn(exportCredentialsConfig);
  const revealFn = useServerFn(revealCredentialValue);

  const load = async () => {
    try {
      const [a, b, c] = await Promise.all([
        listApiCredentials(),
        getCredentialMetadata(),
        listCredentialLogs({ data: { limit: 30 } }),
      ]);
      setRows(a.rows);
      setMeta(Object.fromEntries(b.rows.map((r: any) => [r.key, r])));
      setLogs(c.rows);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao carregar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  const enriched = useMemo(() => {
    return API_KEYS.map((k) => {
      const r = rows.find((x) => x.key === k.key);
      const m = meta[k.key] ?? {};
      return {
        ...k,
        category: CATEGORY_MAP[k.key] ?? "Outros",
        status: r?.status ?? "missing",
        hasValue: r?.hasValue ?? false,
        maskedValue: r?.maskedValue ?? null,
        message: r?.message ?? null,
        lastValidatedAt: r?.lastValidatedAt ?? null,
        expiresAt: m.expires_at ?? null,
        environment: m.environment ?? "prod",
        monthlyCost: Number(m.monthly_cost_usd ?? 0),
        quotaUsed: m.quota_used ?? 0,
        quotaLimit: m.quota_limit ?? null,
        autoHealthCheck: m.auto_health_check ?? false,
        notifyOnFailure: m.notify_on_failure ?? true,
        webhookUrl: m.webhook_url ?? null,
      };
    });
  }, [rows, meta]);

  const categories = useMemo(() => {
    const set = new Set(enriched.map((e) => e.category));
    return ["all", ...Array.from(set)];
  }, [enriched]);

  const filtered = useMemo(() => {
    return enriched.filter((it) => {
      if (catFilter !== "all" && it.category !== catFilter) return false;
      if (search && !`${it.label} ${it.key} ${it.description}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [enriched, catFilter, search]);

  const activeCount = enriched.filter((e) => e.status === "valid" || e.status === "saved" || e.status === "env").length;
  const totalCost = enriched.reduce((s, e) => s + e.monthlyCost, 0);

  const openConfig = async (it: any) => {
    setSelected(it);
    setApiKey("");
    setReveal(false);
    setRevealedValue(null);
  };

  const handleReveal = async () => {
    if (!selected) return;
    if (reveal) {
      setReveal(false);
      setRevealedValue(null);
      return;
    }
    try {
      const r = await revealFn({ data: { key: selected.key } });
      setRevealedValue(r.value);
      setReveal(true);
    } catch (e: any) {
      toast.error(e?.message ?? "Sem permissão");
    }
  };

  const handleSave = async () => {
    if (!selected || !apiKey.trim()) { toast.error("Informe a chave"); return; }
    try {
      await save({ data: { key: selected.key, value: apiKey.trim() } });
      toast.success("Chave salva");
      setApiKey("");
      await load();
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
  };

  const handleRotate = async () => {
    if (!selected || !apiKey.trim()) { toast.error("Informe a nova chave"); return; }
    try {
      await rotate({ data: { key: selected.key, newValue: apiKey.trim() } });
      toast.success("Chave rotacionada");
      setApiKey("");
      await load();
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
  };

  const handleValidateOne = async (key: string) => {
    setValidating(key);
    try {
      const r = await validate({ data: { key } });
      r.ok ? toast.success(`${key}: ${r.message}`) : toast.error(`${key}: ${r.message}`);
      await load();
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
    finally { setValidating(null); }
  };

  const handleValidateAll = async () => {
    setValidatingAll(true);
    try {
      const r = await validateAll();
      const ok = r.results.filter((x: any) => x.ok).length;
      toast.success(`${ok}/${r.results.length} integrações válidas`);
      await load();
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
    finally { setValidatingAll(false); }
  };

  const handleMetaPatch = async (key: string, patch: any) => {
    try {
      await updateMeta({ data: { key, ...patch } });
      await load();
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
  };

  const handleImport = async () => {
    try {
      const r = await importEnv({ data: { envText } });
      toast.success(`${r.saved} chaves importadas${r.skipped.length ? `, ${r.skipped.length} ignoradas` : ""}`);
      setImportOpen(false);
      setEnvText("");
      await load();
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
  };

  const handleExport = async () => {
    try {
      const r = await exportCfg();
      const blob = new Blob([JSON.stringify(r, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `integracoes-${new Date().toISOString().slice(0, 10)}.json`;
      a.click(); URL.revokeObjectURL(url);
      toast.success("Config exportada");
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
  };

  if (!sessionReady || !authedUser) {
    return (
      <div className="space-y-6">
        <DashboardHeader />
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Carregando…
        </div>
      </div>
    );
  }

  if (!isCeo) {
    return (
      <div className="space-y-6">
        <DashboardHeader />
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <KeyRound className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
          <h2 className="font-display text-xl font-bold">Acesso restrito</h2>
          <p className="text-sm text-muted-foreground mt-2">Esta página é exclusiva do CEO.</p>
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <DashboardHeader />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/40">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Integrações & Credenciais</h1>
            <p className="text-sm text-muted-foreground mt-1">Conexões, chaves, custos, quotas e histórico.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleValidateAll} disabled={validatingAll}>
            {validatingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
            Validar todas
          </Button>
          <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)}>
            <Activity className="h-3.5 w-3.5 mr-1.5" /> Histórico
          </Button>
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="h-3.5 w-3.5 mr-1.5" /> Importar .env
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-3.5 w-3.5 mr-1.5" /> Exportar
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Ativas</div>
          <div className="font-display text-2xl font-bold mt-1">{activeCount}/{enriched.length}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Custo / mês</div>
          <div className="font-display text-2xl font-bold mt-1">${totalCost.toFixed(2)}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Com erro</div>
          <div className="font-display text-2xl font-bold mt-1 text-red-400">{enriched.filter((e) => e.status === "invalid").length}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Expirando</div>
          <div className="font-display text-2xl font-bold mt-1 text-amber-400">
            {enriched.filter((e) => e.expiresAt && new Date(e.expiresAt).getTime() - Date.now() < 7 * 86400000).length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Buscar integração..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-full sm:w-48"><Filter className="h-3.5 w-3.5 mr-1.5" /><SelectValue /></SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>{c === "all" ? "Todas categorias" : c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Carregando...</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((it) => {
            const sm = STATUS_META[it.status] ?? STATUS_META.unknown;
            const StatusIcon = sm.icon;
            const isValidating = validating === it.key;
            const expSoon = it.expiresAt && new Date(it.expiresAt).getTime() - Date.now() < 7 * 86400000;
            const quotaPct = it.quotaLimit ? Math.min(100, (it.quotaUsed / it.quotaLimit) * 100) : 0;
            return (
              <div key={it.key} className="group rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition-all space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 min-w-0">
                    {(() => {
                      const pi = PROVIDER_ICON[it.key] ?? { Icon: KeyRound, cls: "text-muted-foreground" };
                      const PIcon = pi.Icon;
                      return (
                        <div className={`shrink-0 h-9 w-9 rounded-lg border border-border bg-muted/30 flex items-center justify-center ${pi.cls}`}>
                          <PIcon className="h-4.5 w-4.5" strokeWidth={2} />
                        </div>
                      );
                    })()}
                    <div className="min-w-0">
                      <h3 className="font-display text-sm font-bold truncate">{it.label}</h3>
                      <p className="text-[10px] font-mono text-muted-foreground mt-0.5 truncate">{it.key}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${sm.cls}`}>
                    <StatusIcon className="h-3 w-3" /> {sm.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{it.description}</p>

                <div className="flex flex-wrap gap-1.5 text-[10px]">
                  <Badge variant="outline">{it.category}</Badge>
                  <Badge variant="outline" className="uppercase">{it.environment}</Badge>
                  {it.monthlyCost > 0 && (
                    <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">
                      <DollarSign className="h-2.5 w-2.5 mr-0.5" />{it.monthlyCost.toFixed(2)}/mês
                    </Badge>
                  )}
                  {expSoon && (
                    <Badge variant="outline" className="text-amber-400 border-amber-500/30">
                      <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />expira {relTime(it.expiresAt)}
                    </Badge>
                  )}
                </div>

                {it.quotaLimit && (
                  <div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                      <span>Quota</span>
                      <span className="tabular-nums">{it.quotaUsed}/{it.quotaLimit}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full ${quotaPct > 80 ? "bg-red-500" : quotaPct > 60 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${quotaPct}%` }} />
                    </div>
                  </div>
                )}

                {it.message && (
                  <p className="text-[10px] text-muted-foreground truncate" title={it.message}>{it.message}</p>
                )}
                <p className="text-[10px] text-muted-foreground">Última validação: {relTime(it.lastValidatedAt)}</p>

                <div className="flex items-center gap-2 pt-1">
                  <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => openConfig(it)}>
                    {it.hasValue ? "Configurar" : "Conectar"}<ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                  {it.canValidate && (
                    <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => handleValidateOne(it.key)} disabled={isValidating}>
                      {isValidating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Config Dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected?.label}</DialogTitle>
            <DialogDescription>{selected?.description}</DialogDescription>
          </DialogHeader>

          {selected && (
            <Tabs defaultValue="key" className="mt-2">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="key">Chave</TabsTrigger>
                <TabsTrigger value="meta">Metadados</TabsTrigger>
                <TabsTrigger value="health">Health</TabsTrigger>
                <TabsTrigger value="docs">Docs</TabsTrigger>
              </TabsList>

              <TabsContent value="key" className="space-y-3 pt-3">
                {selected.hasValue && (
                  <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Valor atual</Label>
                      <Button size="sm" variant="ghost" className="h-7" onClick={handleReveal}>
                        {reveal ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
                        {reveal ? "Ocultar" : "Revelar"}
                      </Button>
                    </div>
                    <p className="font-mono text-xs break-all">{reveal ? revealedValue ?? "(vazio)" : selected.maskedValue ?? "—"}</p>
                  </div>
                )}
                <Label htmlFor="apikey">{selected.hasValue ? "Nova chave (substitui a atual)" : "Chave de API"}</Label>
                <Input id="apikey" type="password" placeholder="Cole sua chave aqui" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
                <div className="flex gap-2">
                  <Button onClick={handleSave} className="flex-1">Salvar</Button>
                  {selected.hasValue && (
                    <Button variant="outline" onClick={handleRotate}><RotateCw className="h-3.5 w-3.5 mr-1.5" />Rotacionar</Button>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="meta" className="space-y-3 pt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Ambiente</Label>
                    <Select value={selected.environment} onValueChange={(v) => handleMetaPatch(selected.key, { environment: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dev">Dev</SelectItem>
                        <SelectItem value="staging">Staging</SelectItem>
                        <SelectItem value="prod">Produção</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Expira em</Label>
                    <Input type="date" defaultValue={selected.expiresAt?.slice(0, 10) ?? ""} onBlur={(e) => handleMetaPatch(selected.key, { expires_at: e.target.value || null })} />
                  </div>
                  <div>
                    <Label className="text-xs">Custo mensal (USD)</Label>
                    <Input type="number" step="0.01" defaultValue={selected.monthlyCost} onBlur={(e) => handleMetaPatch(selected.key, { monthly_cost_usd: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label className="text-xs">Limite de quota</Label>
                    <Input type="number" defaultValue={selected.quotaLimit ?? ""} onBlur={(e) => handleMetaPatch(selected.key, { quota_limit: e.target.value ? Number(e.target.value) : null })} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs"><Webhook className="h-3 w-3 inline mr-1" />Webhook URL (callback)</Label>
                  <Input placeholder="https://..." defaultValue={selected.webhookUrl ?? ""} onBlur={(e) => handleMetaPatch(selected.key, { webhook_url: e.target.value || null })} />
                </div>
              </TabsContent>

              <TabsContent value="health" className="space-y-3 pt-3">
                <div className="flex items-center justify-between rounded-md border border-border p-3">
                  <div>
                    <Label className="text-sm">Health check automático</Label>
                    <p className="text-xs text-muted-foreground">Valida esta chave diariamente.</p>
                  </div>
                  <Switch checked={selected.autoHealthCheck} onCheckedChange={(v) => handleMetaPatch(selected.key, { auto_health_check: v })} />
                </div>
                <div className="flex items-center justify-between rounded-md border border-border p-3">
                  <div>
                    <Label className="text-sm"><Bell className="h-3.5 w-3.5 inline mr-1" />Notificar em falha</Label>
                    <p className="text-xs text-muted-foreground">Envia alerta quando a integração cai.</p>
                  </div>
                  <Switch checked={selected.notifyOnFailure} onCheckedChange={(v) => handleMetaPatch(selected.key, { notify_on_failure: v })} />
                </div>
                <Button variant="outline" className="w-full" onClick={() => handleValidateOne(selected.key)} disabled={!selected.canValidate}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Testar agora
                </Button>
              </TabsContent>

              <TabsContent value="docs" className="space-y-3 pt-3">
                <div className="rounded-md border border-border bg-muted/30 p-4 space-y-2">
                  <h4 className="font-semibold text-sm">Como obter esta chave?</h4>
                  <p className="text-xs text-muted-foreground">Acesse o painel oficial do provedor, gere uma nova chave e cole aqui.</p>
                  {selected.url && (
                    <a href={selected.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      Abrir painel <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <div className="rounded-md border border-border bg-muted/30 p-4">
                  <h4 className="font-semibold text-sm mb-2"><Clock className="h-3.5 w-3.5 inline mr-1" />Últimos eventos</h4>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {logs.filter((l) => l.key === selected.key).slice(0, 10).map((l) => (
                      <div key={l.id} className="text-[11px] flex justify-between gap-2 border-b border-border/50 pb-1">
                        <span className={l.status === "valid" || l.status === "ok" ? "text-emerald-400" : "text-red-400"}>{l.event_type}</span>
                        <span className="text-muted-foreground truncate flex-1">{l.message ?? "—"}</span>
                        <span className="text-muted-foreground">{relTime(l.created_at)}</span>
                      </div>
                    ))}
                    {logs.filter((l) => l.key === selected.key).length === 0 && <p className="text-xs text-muted-foreground">Sem eventos ainda.</p>}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setSelected(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import .env Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar do .env</DialogTitle>
            <DialogDescription>Cole o conteúdo do seu .env. Apenas chaves conhecidas serão importadas.</DialogDescription>
          </DialogHeader>
          <Textarea rows={10} placeholder="APIFY_API_TOKEN=...&#10;GROQ_API_KEY=..." value={envText} onChange={(e) => setEnvText(e.target.value)} className="font-mono text-xs" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Cancelar</Button>
            <Button onClick={handleImport} disabled={!envText.trim()}>Importar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle><Activity className="h-4 w-4 inline mr-1.5" />Histórico de validações</DialogTitle>
            <DialogDescription>Últimas 30 ações em todas as integrações.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            {logs.map((l) => (
              <div key={l.id} className="flex justify-between items-center gap-3 rounded-md border border-border bg-muted/20 px-3 py-2 text-xs">
                <span className="font-mono text-[10px]">{l.key}</span>
                <span className={`uppercase text-[10px] font-bold ${l.status === "valid" || l.status === "ok" ? "text-emerald-400" : "text-red-400"}`}>{l.event_type}</span>
                <span className="text-muted-foreground truncate flex-1">{l.message ?? "—"}</span>
                <span className="text-muted-foreground tabular-nums whitespace-nowrap">{relTime(l.created_at)}</span>
              </div>
            ))}
            {logs.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Nenhum evento registrado ainda.</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
