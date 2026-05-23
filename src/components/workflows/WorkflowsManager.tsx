import { useEffect, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plus,
  Sparkles,
  History,
  Calendar as CalIcon,
  Star,
  Copy,
  Trash2,
  Download,
  Upload,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  Zap,
  LayoutGrid,
  TrendingUp,
  Radar,
  Eye,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  listWorkflows,
  listTemplates,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  duplicateWorkflow,
  listRuns,
} from "@/lib/workflows.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TEMPLATE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  TrendingUp,
  LayoutGrid,
  Radar,
  Zap,
  Eye,
};

const SCHEDULE_PRESETS = [
  { label: "Manual (sem agendamento)", value: "" },
  { label: "Toda hora", value: "0 * * * *" },
  { label: "Todo dia às 9h", value: "0 9 * * *" },
  { label: "Toda segunda às 9h", value: "0 9 * * 1" },
  { label: "1º do mês às 9h", value: "0 9 1 * *" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentSnapshot?: { nodes: unknown[]; edges: unknown[] };
  onLoad: (snapshot: { nodes: unknown[]; edges: unknown[] }, workflowId: string, name: string) => void;
  activeWorkflowId: string | null;
}

export function WorkflowsManager({ open, onOpenChange, currentSnapshot, onLoad, activeWorkflowId }: Props) {
  const qc = useQueryClient();
  const list = useServerFn(listWorkflows);
  const listTpl = useServerFn(listTemplates);
  const create = useServerFn(createWorkflow);
  const update = useServerFn(updateWorkflow);
  const remove = useServerFn(deleteWorkflow);
  const dup = useServerFn(duplicateWorkflow);
  const runs = useServerFn(listRuns);

  const { data: wfData, isLoading: loadingWf } = useQuery({
    queryKey: ["workflows"],
    queryFn: () => list(),
    enabled: open,
  });
  const { data: tplData } = useQuery({
    queryKey: ["workflow-templates"],
    queryFn: () => listTpl(),
    enabled: open,
  });
  const { data: runData, isLoading: loadingRuns } = useQuery({
    queryKey: ["workflow-runs"],
    queryFn: () => runs({ data: { limit: 20 } }),
    enabled: open,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["workflows"] });
    qc.invalidateQueries({ queryKey: ["workflow-runs"] });
  };

  const createMut = useMutation({
    mutationFn: (vars: { name: string; template_id?: string; snapshot?: { nodes: unknown[]; edges: unknown[] } }) =>
      create({ data: vars }),
    onSuccess: (r) => {
      toast.success("Fluxo criado");
      invalidate();
      if (r.workflow) onLoad(r.workflow.snapshot as { nodes: unknown[]; edges: unknown[] }, r.workflow.id, r.workflow.name);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  type UpdateInput = {
    id: string;
    name?: string;
    description?: string | null;
    snapshot?: { nodes: unknown[]; edges: unknown[] };
    schedule_cron?: string | null;
    schedule_enabled?: boolean;
    is_favorite?: boolean;
  };
  const updateMut = useMutation({
    mutationFn: (vars: UpdateInput) => update({ data: vars }),
    onSuccess: () => invalidate(),
  });

  const dupMut = useMutation({
    mutationFn: (id: string) => dup({ data: { id } }),
    onSuccess: () => {
      toast.success("Fluxo duplicado");
      invalidate();
    },
  });

  const delMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Fluxo excluído");
      invalidate();
    },
  });

  const handleSaveCurrent = () => {
    if (!activeWorkflowId) {
      toast.error("Nenhum fluxo ativo");
      return;
    }
    updateMut.mutate({ id: activeWorkflowId, snapshot: currentSnapshot });
    toast.success("Salvo");
  };

  const handleExport = (wf: { id: string; name: string; snapshot: unknown }) => {
    const blob = new Blob([JSON.stringify(wf.snapshot, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${wf.name.replace(/[^a-z0-9]+/gi, "-")}.flow.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const snap = JSON.parse(String(reader.result));
        createMut.mutate({ name: file.name.replace(/\.flow\.json$/i, ""), snapshot: snap });
      } catch {
        toast.error("Arquivo inválido");
      }
    };
    reader.readAsText(file);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl bg-[#0A0A0A] border-white/10 text-white overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-white font-rajdhani text-2xl uppercase tracking-widest">
            Gerenciador de <span className="text-primary">Fluxos</span>
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="meus" className="mt-6">
          <TabsList className="bg-white/5 border border-white/10 w-full grid grid-cols-3">
            <TabsTrigger value="meus">Meus fluxos</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          {/* MEUS FLUXOS */}
          <TabsContent value="meus" className="space-y-3 mt-4">
            <div className="flex gap-2 flex-wrap">
              <Button onClick={() => createMut.mutate({ name: "Novo fluxo", snapshot: currentSnapshot })} className="bg-primary text-black hover:bg-primary/90">
                <Plus className="w-4 h-4" /> Novo em branco
              </Button>
              <Button variant="outline" onClick={handleSaveCurrent} disabled={!activeWorkflowId} className="border-white/20 text-white hover:bg-white/10">
                Salvar atual
              </Button>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImport(f);
                    e.target.value = "";
                  }}
                />
                <span className="inline-flex items-center gap-2 h-9 px-4 rounded-md border border-white/20 hover:bg-white/10 text-sm">
                  <Upload className="w-4 h-4" /> Importar
                </span>
              </label>
            </div>

            {loadingWf ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full bg-white/5" />)}
              </div>
            ) : (wfData?.workflows ?? []).length === 0 ? (
              <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
                <Sparkles className="w-10 h-10 mx-auto text-primary/50 mb-3" />
                <p className="text-white/60 text-sm">Nenhum fluxo salvo ainda.</p>
                <p className="text-white/40 text-xs mt-1">Crie um do zero ou escolha um template.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {wfData?.workflows.map((wf) => (
                  <WorkflowCard
                    key={wf.id}
                    wf={wf}
                    active={wf.id === activeWorkflowId}
                    onLoad={() => onLoad(wf.snapshot as { nodes: unknown[]; edges: unknown[] }, wf.id, wf.name)}
                    onRename={(name) => updateMut.mutate({ id: wf.id, name })}
                    onFav={() => updateMut.mutate({ id: wf.id, is_favorite: !wf.is_favorite })}
                    onDup={() => dupMut.mutate(wf.id)}
                    onDel={() => delMut.mutate(wf.id)}
                    onExport={() => handleExport(wf)}
                    onSchedule={(cron, enabled) => updateMut.mutate({ id: wf.id, schedule_cron: cron || null, schedule_enabled: enabled })}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* TEMPLATES */}
          <TabsContent value="templates" className="space-y-3 mt-4">
            {!tplData ? (
              <Skeleton className="h-40 w-full bg-white/5" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {tplData.templates.map((t) => {
                  const Icon = TEMPLATE_ICONS[t.icon ?? "Zap"] ?? Zap;
                  return (
                    <div key={t.id} className="border border-white/10 rounded-xl p-4 hover:border-primary/40 transition-colors bg-white/[0.02]">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm text-white">{t.name}</h4>
                          <p className="text-xs text-white/60 mt-1 line-clamp-2">{t.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-[10px] border-white/20 text-white/60">{t.category}</Badge>
                            <span className="text-[10px] text-white/40">~${Number(t.estimated_cost_usd).toFixed(3)}/run</span>
                          </div>
                          <Button
                            size="sm"
                            className="mt-3 h-7 text-xs bg-primary text-black hover:bg-primary/90"
                            onClick={() => createMut.mutate({ name: t.name, template_id: t.id })}
                          >
                            <Plus className="w-3 h-3" /> Usar template
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* HISTÓRICO */}
          <TabsContent value="historico" className="space-y-2 mt-4">
            {loadingRuns ? (
              <Skeleton className="h-40 w-full bg-white/5" />
            ) : (runData?.runs ?? []).length === 0 ? (
              <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
                <History className="w-10 h-10 mx-auto text-white/30 mb-3" />
                <p className="text-white/60 text-sm">Sem execuções ainda.</p>
              </div>
            ) : (
              runData?.runs.map((r) => (
                <div key={r.id} className="border border-white/10 rounded-lg p-3 bg-white/[0.02] flex items-center gap-3">
                  {r.status === "success" ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  ) : r.status === "error" ? (
                    <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                  ) : (
                    <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-white truncate">
                        {(r.user_workflows as { name?: string } | null)?.name ?? "Fluxo"}
                      </span>
                      <Badge variant="outline" className="text-[10px] border-white/20 text-white/60">{r.trigger_source}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-white/50 mt-0.5">
                      <span><Clock className="w-3 h-3 inline" /> {format(new Date(r.started_at), "dd/MM HH:mm", { locale: ptBR })}</span>
                      {r.duration_ms != null && <span>{(r.duration_ms / 1000).toFixed(1)}s</span>}
                      {r.estimated_cost_usd > 0 && <span>${Number(r.estimated_cost_usd).toFixed(4)}</span>}
                    </div>
                    {r.error && <p className="text-[11px] text-red-400 mt-1 truncate">{r.error}</p>}
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function WorkflowCard({
  wf,
  active,
  onLoad,
  onRename,
  onFav,
  onDup,
  onDel,
  onExport,
  onSchedule,
}: {
  wf: { id: string; name: string; description: string | null; is_favorite: boolean; updated_at: string; last_run_at: string | null; last_run_status: string | null; schedule_cron: string | null; schedule_enabled: boolean };
  active: boolean;
  onLoad: () => void;
  onRename: (n: string) => void;
  onFav: () => void;
  onDup: () => void;
  onDel: () => void;
  onExport: () => void;
  onSchedule: (cron: string, enabled: boolean) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(wf.name);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  return (
    <div className={cn("border rounded-xl p-3 transition-colors bg-white/[0.02]", active ? "border-primary/60" : "border-white/10 hover:border-white/30")}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {editing ? (
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => { onRename(name); setEditing(false); }}
              onKeyDown={(e) => { if (e.key === "Enter") { onRename(name); setEditing(false); } }}
              className="h-7 bg-white/5 border-white/20 text-white text-sm"
            />
          ) : (
            <button onClick={() => setEditing(true)} className="text-sm font-semibold text-white truncate text-left hover:text-primary">
              {wf.name}
            </button>
          )}
          <div className="flex items-center gap-2 text-[11px] text-white/50 mt-1">
            <span>Editado {format(new Date(wf.updated_at), "dd/MM HH:mm", { locale: ptBR })}</span>
            {wf.last_run_status === "success" && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
            {wf.last_run_status === "error" && <XCircle className="w-3 h-3 text-red-500" />}
            {wf.schedule_enabled && wf.schedule_cron && (
              <Badge variant="outline" className="text-[9px] border-primary/40 text-primary px-1 py-0">
                <CalIcon className="w-2.5 h-2.5" /> {wf.schedule_cron}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onFav}>
            <Star className={cn("w-3.5 h-3.5", wf.is_favorite ? "fill-yellow-500 text-yellow-500" : "text-white/40")} />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onDup} title="Duplicar">
            <Copy className="w-3.5 h-3.5 text-white/60" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onExport} title="Exportar JSON">
            <Download className="w-3.5 h-3.5 text-white/60" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setScheduleOpen((v) => !v)} title="Agendar">
            <CalIcon className="w-3.5 h-3.5 text-white/60" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="icon" variant="ghost" className="h-7 w-7">
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-[#0A0A0A] border-white/10 text-white">
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir fluxo?</AlertDialogTitle>
                <AlertDialogDescription className="text-white/60">Essa ação não pode ser desfeita. Todo o histórico de execuções deste fluxo também será apagado.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-white/5 border-white/20 text-white hover:bg-white/10">Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={onDel} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {scheduleOpen && (
        <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
          <Label className="text-xs text-white/60">Agendamento</Label>
          <select
            value={wf.schedule_cron ?? ""}
            onChange={(e) => onSchedule(e.target.value, !!e.target.value)}
            className="w-full h-8 bg-white/5 border border-white/20 rounded text-xs text-white px-2"
          >
            {SCHEDULE_PRESETS.map((p) => <option key={p.value} value={p.value} className="bg-[#0A0A0A]">{p.label}</option>)}
          </select>
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/60">Ativo</span>
            <Switch checked={wf.schedule_enabled} onCheckedChange={(v) => onSchedule(wf.schedule_cron ?? "", v)} />
          </div>
        </div>
      )}

      <Button size="sm" variant={active ? "default" : "outline"} className={cn("w-full mt-3 h-7 text-xs", active ? "bg-primary text-black" : "border-white/20 text-white hover:bg-white/10")} onClick={onLoad}>
        {active ? "Em uso" : "Carregar no canvas"}
      </Button>
    </div>
  );
}
