import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { requireAuth } from "@/lib/route-guards";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/dashboard/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  FolderKanban, Plus, Layers, Star, Clock, Search, Grid3X3, List, KanbanSquare,
  MoreVertical, Pin, Copy, Trash2, Archive, Share2, Download, Sparkles, Rocket,
  Flame, TreePine, Briefcase, Calendar as CalendarIcon, Pause, CheckCircle2, ArrowRight,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  listProjects, createProject, updateProject, deleteProject,
  duplicateProject, sharePublicly, listTemplates, exportProject,
} from "@/lib/projects.functions";

const ICONS: Record<string, any> = { Layers, Sparkles, Rocket, Flame, TreePine, Briefcase, Calendar: CalendarIcon };
const COLORS = ["#8b5cf6", "#ec4899", "#f97316", "#10b981", "#3b82f6", "#eab308", "#ef4444", "#06b6d4"];

export const Route = createFileRoute("/projetos")({
  beforeLoad: ({ location }) => requireAuth(location),
  component: ProjetosPage,
  head: () => ({
    meta: [
      { title: "Projetos — SHEY N8N" },
      { name: "description", content: "Organize seus conteúdos virais por campanha." },
    ],
  }),
});

function ProjetosPage() {
  const qc = useQueryClient();
  const list = useServerFn(listProjects);
  const tpls = useServerFn(listTemplates);
  const createFromTpl = useServerFn(createProject);

  const { data, isLoading } = useQuery({ queryKey: ["projects"], queryFn: () => list() });
  const { data: tplData } = useQuery({ queryKey: ["project-templates"], queryFn: () => tpls() });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [view, setView] = useState<"grid" | "list" | "kanban">("grid");
  const [showCreate, setShowCreate] = useState(false);

  const projects = data?.projects ?? [];
  const filtered = useMemo(() => {
    return projects.filter((p: any) => {
      if (statusFilter === "favorites" && !p.is_favorite) return false;
      if (statusFilter === "archived" && !p.is_archived) return false;
      if (statusFilter !== "all" && statusFilter !== "favorites" && statusFilter !== "archived") {
        if (p.status !== statusFilter) return false;
      }
      if (statusFilter !== "archived" && p.is_archived) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !(p.description ?? "").toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [projects, search, statusFilter]);

  const pinned = filtered.filter((p: any) => p.is_pinned);
  const others = filtered.filter((p: any) => !p.is_pinned);

  return (
    <div className="min-h-screen bg-[#080808] pb-24">
      <DashboardHeader />

      <div className="px-4 md:px-8 space-y-6 pt-2">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-primary" />
              Meus Projetos
              <Badge variant="outline" className="border-white/10 text-muted-foreground">{projects.length}</Badge>
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Organize ganchos, carrosséis, calendário e transcrições por campanha.
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-2">
            <Plus className="w-4 h-4" /> Novo Projeto
          </Button>
        </header>

        {/* Filters */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar projeto…"
              className="pl-9 bg-white/5 border-white/10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="md:w-[180px] bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos ativos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="paused">Pausados</SelectItem>
              <SelectItem value="completed">Concluídos</SelectItem>
              <SelectItem value="favorites">⭐ Favoritos</SelectItem>
              <SelectItem value="archived">📦 Arquivados</SelectItem>
            </SelectContent>
          </Select>
          <Tabs value={view} onValueChange={(v) => setView(v as any)}>
            <TabsList className="bg-white/5">
              <TabsTrigger value="grid"><Grid3X3 className="w-4 h-4" /></TabsTrigger>
              <TabsTrigger value="list"><List className="w-4 h-4" /></TabsTrigger>
              <TabsTrigger value="kanban"><KanbanSquare className="w-4 h-4" /></TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Templates strip */}
        {(tplData?.templates?.length ?? 0) > 0 && projects.length < 3 && (
          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Comece de um modelo</h3>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {(tplData?.templates ?? []).map((t: any) => {
                const Icon = ICONS[t.icon] ?? Sparkles;
                return (
                  <button
                    key={t.id}
                    onClick={async () => {
                      try {
                        await createFromTpl({ data: { name: t.name, description: t.description, color: t.color, icon: t.icon, tags: t.default_tags, template_id: t.id, deadline_at: t.duration_days ? new Date(Date.now() + t.duration_days * 86400000).toISOString() : null } });
                        toast.success(`Projeto "${t.name}" criado!`);
                        qc.invalidateQueries({ queryKey: ["projects"] });
                      } catch (e: any) { toast.error(e.message); }
                    }}
                    className="min-w-[220px] text-left rounded-xl border border-white/5 bg-white/5 hover:border-primary/40 hover:bg-primary/5 transition p-4"
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2" style={{ backgroundColor: `${t.color}20`, color: t.color }}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <p className="text-sm font-bold text-white">{t.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{t.description}</p>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Pinned */}
        {pinned.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
              <Pin className="w-3 h-3" /> Fixados
            </h3>
            <ProjectsView view={view} projects={pinned} />
          </section>
        )}

        {/* Main grid */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-44 rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState onCreate={() => setShowCreate(true)} hasAnyProject={projects.length > 0} />
        ) : (
          <ProjectsView view={view} projects={others} showCreate={() => setShowCreate(true)} />
        )}
      </div>

      <CreateProjectDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}

/* ============ Views ============ */
function ProjectsView({ view, projects, showCreate }: { view: string; projects: any[]; showCreate?: () => void }) {
  if (view === "list") {
    return (
      <div className="rounded-xl border border-white/5 overflow-hidden bg-white/5">
        {projects.map((p) => <ProjectRow key={p.id} project={p} />)}
      </div>
    );
  }
  if (view === "kanban") {
    const cols = [
      { key: "active", label: "Ativos", icon: Rocket },
      { key: "paused", label: "Pausados", icon: Pause },
      { key: "completed", label: "Concluídos", icon: CheckCircle2 },
    ];
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {cols.map((c) => {
          const Icon = c.icon;
          const items = projects.filter((p) => p.status === c.key);
          return (
            <div key={c.key} className="rounded-xl border border-white/5 bg-white/5 p-3 space-y-2 min-h-[200px]">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 px-1">
                <Icon className="w-3 h-3" /> {c.label} <span className="ml-auto">{items.length}</span>
              </h4>
              {items.map((p) => <ProjectCard key={p.id} project={p} compact />)}
            </div>
          );
        })}
      </div>
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {showCreate && (
        <button onClick={showCreate} className="rounded-xl border border-dashed border-primary/20 bg-primary/5 hover:bg-primary/10 transition py-12 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-3">
            <Plus className="w-6 h-6 text-primary" />
          </div>
          <p className="font-bold text-white text-sm">Criar Projeto</p>
        </button>
      )}
      {projects.map((p) => <ProjectCard key={p.id} project={p} />)}
    </div>
  );
}

/* ============ Card ============ */
function ProjectCard({ project, compact }: { project: any; compact?: boolean }) {
  const Icon = ICONS[project.icon] ?? Layers;
  const stats = `${(project.tags ?? []).length} tags`;
  const days = project.deadline_at ? Math.ceil((new Date(project.deadline_at).getTime() - Date.now()) / 86400000) : null;

  return (
    <Link to="/projetos/$id" params={{ id: project.id }} className="block">
      <Card className="bg-card/40 border-white/5 hover:border-primary/30 transition-all group h-full">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${project.color}20`, color: project.color }}>
              {project.emoji ? <span className="text-xl">{project.emoji}</span> : <Icon className="w-5 h-5" />}
            </div>
            <div className="flex items-center gap-1">
              {project.is_pinned && <Pin className="w-3 h-3 text-primary fill-primary" />}
              {project.is_favorite && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
              <ProjectMenu project={project} />
            </div>
          </div>
          <CardTitle className="text-base mt-3 group-hover:text-primary transition-colors line-clamp-1">{project.name}</CardTitle>
          {!compact && <CardDescription className="line-clamp-2 text-xs">{project.description || "Sem descrição"}</CardDescription>}
        </CardHeader>
        <CardContent className="pt-3 space-y-3">
          {project.progress > 0 && (
            <div>
              <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full transition-all" style={{ width: `${project.progress}%`, backgroundColor: project.color }} />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{project.progress}% completo</p>
            </div>
          )}
          {(project.tags?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-1">
              {project.tags.slice(0, 3).map((t: string) => (
                <Badge key={t} variant="outline" className="border-white/10 text-[10px] py-0">{t}</Badge>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between text-[10px] text-muted-foreground uppercase tracking-wider pt-2 border-t border-white/5">
            <span className="flex items-center gap-1">
              <StatusDot status={project.status} /> {project.status}
            </span>
            {days != null && (
              <span className={days < 0 ? "text-red-500" : days < 7 ? "text-yellow-500" : ""}>
                {days < 0 ? `${Math.abs(days)}d atraso` : `${days}d restantes`}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = { active: "bg-green-500", paused: "bg-yellow-500", completed: "bg-blue-500", archived: "bg-gray-500" };
  return <span className={`w-1.5 h-1.5 rounded-full ${colors[status] ?? "bg-gray-500"}`} />;
}

function ProjectRow({ project }: { project: any }) {
  const Icon = ICONS[project.icon] ?? Layers;
  return (
    <Link to="/projetos/$id" params={{ id: project.id }} className="flex items-center gap-4 p-3 hover:bg-white/5 border-b border-white/5 last:border-0">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${project.color}20`, color: project.color }}>
        {project.emoji ? <span>{project.emoji}</span> : <Icon className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white truncate">{project.name}</p>
        <p className="text-xs text-muted-foreground truncate">{project.description}</p>
      </div>
      <StatusDot status={project.status} />
      {project.is_favorite && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
      <ProjectMenu project={project} />
    </Link>
  );
}

/* ============ Menu ============ */
function ProjectMenu({ project }: { project: any }) {
  const qc = useQueryClient();
  const upd = useServerFn(updateProject);
  const del = useServerFn(deleteProject);
  const dup = useServerFn(duplicateProject);
  const share = useServerFn(sharePublicly);
  const exp = useServerFn(exportProject);

  const mut = useMutation({
    mutationFn: async (patch: any) => upd({ data: { id: project.id, patch } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["projects"] }); },
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="icon" className="h-6 w-6"><MoreVertical className="w-3 h-3" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={() => mut.mutate({ is_favorite: !project.is_favorite })}>
          <Star className="w-3 h-3 mr-2" /> {project.is_favorite ? "Desfavoritar" : "Favoritar"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => mut.mutate({ is_pinned: !project.is_pinned })}>
          <Pin className="w-3 h-3 mr-2" /> {project.is_pinned ? "Desafixar" : "Fixar no topo"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={async () => { await dup({ data: { id: project.id } }); qc.invalidateQueries({ queryKey: ["projects"] }); toast.success("Duplicado!"); }}>
          <Copy className="w-3 h-3 mr-2" /> Duplicar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={async () => {
          const r = await share({ data: { id: project.id, enable: !project.is_public } });
          qc.invalidateQueries({ queryKey: ["projects"] });
          if (r.slug) {
            navigator.clipboard.writeText(`${window.location.origin}/p/${r.slug}`);
            toast.success("Link copiado!");
          } else toast.success("Compartilhamento desativado");
        }}>
          <Share2 className="w-3 h-3 mr-2" /> {project.is_public ? "Tornar privado" : "Compartilhar link"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={async () => {
          const r = await exp({ data: { id: project.id } });
          const blob = new Blob([JSON.stringify(r, null, 2)], { type: "application/json" });
          const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
          a.download = `${project.name}.json`; a.click();
        }}>
          <Download className="w-3 h-3 mr-2" /> Exportar JSON
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => mut.mutate({ is_archived: !project.is_archived })}>
          <Archive className="w-3 h-3 mr-2" /> {project.is_archived ? "Desarquivar" : "Arquivar"}
        </DropdownMenuItem>
        <DropdownMenuItem className="text-red-500" onClick={async () => {
          if (!confirm(`Excluir "${project.name}"? Conteúdos vinculados serão desvinculados.`)) return;
          await del({ data: { id: project.id } });
          qc.invalidateQueries({ queryKey: ["projects"] });
          toast.success("Excluído");
        }}>
          <Trash2 className="w-3 h-3 mr-2" /> Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ============ Create dialog ============ */
function CreateProjectDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const create = useServerFn(createProject);
  const [form, setForm] = useState({ name: "", description: "", color: COLORS[0], emoji: "" });

  const submit = async () => {
    if (!form.name.trim()) return toast.error("Dê um nome ao projeto");
    try {
      const r = await create({ data: { name: form.name, description: form.description, color: form.color, emoji: form.emoji || null } });
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Projeto criado!");
      onClose();
      setForm({ name: "", description: "", color: COLORS[0], emoji: "" });
      navigate({ to: "/projetos/$id", params: { id: r.project.id } });
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-primary font-rajdhani text-xl flex items-center gap-2">
            <FolderKanban className="w-5 h-5" /> NOVO PROJETO
          </DialogTitle>
          <DialogDescription>Crie um projeto para agrupar conteúdos.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex gap-2">
            <Input
              placeholder="🚀"
              value={form.emoji}
              onChange={(e) => setForm({ ...form, emoji: e.target.value.slice(0, 2) })}
              className="w-16 text-center bg-background border-white/10 text-2xl"
            />
            <Input
              placeholder="Nome do projeto"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="bg-background border-white/10"
            />
          </div>
          <Textarea
            placeholder="Descrição (opcional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="bg-background border-white/10 resize-none"
            rows={3}
          />
          <div>
            <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-bold">Cor</p>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button key={c} onClick={() => setForm({ ...form, color: c })}
                  className={`w-7 h-7 rounded-full transition-all ${form.color === c ? "ring-2 ring-white ring-offset-2 ring-offset-card" : ""}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} className="bg-primary font-bold">CRIAR</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============ Empty ============ */
function EmptyState({ onCreate, hasAnyProject }: { onCreate: () => void; hasAnyProject: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-12 text-center">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
        <FolderKanban className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-lg font-bold text-white">
        {hasAnyProject ? "Nenhum projeto corresponde ao filtro" : "Comece seu primeiro projeto"}
      </h3>
      <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
        Organize ganchos, carrosséis e calendário por campanha — fica muito mais fácil escalar conteúdo viral.
      </p>
      <Button onClick={onCreate} className="mt-4 bg-primary font-bold gap-2">
        <Plus className="w-4 h-4" /> Criar Projeto <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
