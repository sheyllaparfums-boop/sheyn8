import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { requireAuth } from "@/lib/route-guards";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/dashboard/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, Layers, Sparkles, Rocket, Flame, TreePine, Briefcase, Calendar as CalendarIcon,
  Star, Pin, Share2, Save, Layout, Mic, Megaphone, Users, BarChart3, Clock,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getProject, updateProject, getProjectContent } from "@/lib/projects.functions";

const ICONS: Record<string, any> = { Layers, Sparkles, Rocket, Flame, TreePine, Briefcase, Calendar: CalendarIcon };
const COLORS = ["#8b5cf6", "#ec4899", "#f97316", "#10b981", "#3b82f6", "#eab308", "#ef4444", "#06b6d4"];

export const Route = createFileRoute("/projetos/$id")({
  beforeLoad: ({ location }) => requireAuth(location),
  component: ProjectDetailPage,
  head: () => ({ meta: [{ title: "Projeto — SHEY N8N" }] }),
});

function ProjectDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const get = useServerFn(getProject);
  const upd = useServerFn(updateProject);
  const content = useServerFn(getProjectContent);

  const { data, isLoading } = useQuery({ queryKey: ["project", id], queryFn: () => get({ data: { id } }) });
  const { data: contentData } = useQuery({ queryKey: ["project-content", id], queryFn: () => content({ data: { id } }) });

  const project: any = data?.project;
  const stats: any = data?.stats ?? {};

  const [form, setForm] = useState<any>(null);
  useEffect(() => { if (project) setForm(project); }, [project?.id]);

  const mut = useMutation({
    mutationFn: async (patch: any) => upd({ data: { id, patch } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["project", id] }); qc.invalidateQueries({ queryKey: ["projects"] }); toast.success("Salvo"); },
  });

  if (isLoading || !project || !form) {
    return (
      <div className="min-h-screen bg-[#080808]">
        <DashboardHeader />
        <div className="px-4 md:px-8 py-6 space-y-4">
          <div className="h-8 w-48 bg-white/5 rounded animate-pulse" />
          <div className="h-32 bg-white/5 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  const Icon = ICONS[project.icon] ?? Layers;

  return (
    <div className="min-h-screen bg-[#080808] pb-24">
      <DashboardHeader />
      <div className="px-4 md:px-8 pt-2 space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/projetos" })} className="text-muted-foreground gap-1">
          <ArrowLeft className="w-3 h-3" /> Projetos
        </Button>

        {/* Header */}
        <header className="flex flex-col md:flex-row gap-4 md:items-center">
          <div className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl" style={{ backgroundColor: `${project.color}20`, color: project.color }}>
            {project.emoji ?? <Icon className="w-7 h-7" />}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white">{project.name}</h1>
            <p className="text-sm text-muted-foreground line-clamp-2">{project.description || "Sem descrição"}</p>
            <div className="flex flex-wrap gap-1 mt-2">
              {(project.tags ?? []).map((t: string) => <Badge key={t} variant="outline" className="border-white/10 text-[10px]">{t}</Badge>)}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => mut.mutate({ is_favorite: !project.is_favorite })}>
              <Star className={`w-4 h-4 ${project.is_favorite ? "text-yellow-500 fill-yellow-500" : ""}`} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => mut.mutate({ is_pinned: !project.is_pinned })}>
              <Pin className={`w-4 h-4 ${project.is_pinned ? "text-primary fill-primary" : ""}`} />
            </Button>
          </div>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <Kpi label="Carrosséis" value={stats.carousels ?? 0} icon={Layout} />
          <Kpi label="Ganchos" value={stats.hooks ?? 0} icon={Sparkles} />
          <Kpi label="Calendário" value={stats.calendar ?? 0} icon={CalendarIcon} />
          <Kpi label="Transcrições" value={stats.transcriptions ?? 0} icon={Mic} />
          <Kpi label="Concorrentes" value={stats.competitors ?? 0} icon={Users} />
          <Kpi label="Análises" value={stats.analyses ?? 0} icon={BarChart3} />
        </div>

        {project.deadline_at && (
          <div className="rounded-xl border border-white/5 bg-white/5 p-3 flex items-center gap-3 text-sm">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">Deadline:</span>
            <span className="text-white font-bold">{new Date(project.deadline_at).toLocaleDateString("pt-BR")}</span>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="overview">
          <TabsList className="bg-white/5">
            <TabsTrigger value="overview">Visão geral</TabsTrigger>
            <TabsTrigger value="content">Conteúdos</TabsTrigger>
            <TabsTrigger value="settings">Configurações</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4 space-y-3">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Progresso</p>
                <div className="flex items-center gap-4">
                  <Slider value={[form.progress ?? 0]} max={100} step={5} onValueChange={(v) => setForm({ ...form, progress: v[0] })} className="flex-1" />
                  <span className="text-2xl font-bold text-white tabular-nums w-14 text-right">{form.progress ?? 0}%</span>
                </div>
                <Button size="sm" onClick={() => mut.mutate({ progress: form.progress })} className="bg-primary"><Save className="w-3 h-3 mr-1" /> Salvar</Button>
              </CardContent>
            </Card>

            <QuickLinks projectId={id} />
          </TabsContent>

          <TabsContent value="content" className="mt-4">
            <ContentTabs content={contentData} projectId={id} />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4 mt-4">
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4 space-y-4">
                <div className="grid gap-3">
                  <Field label="Nome">
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-background border-white/10" />
                  </Field>
                  <Field label="Descrição">
                    <Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-background border-white/10 resize-none" rows={3} />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Status">
                      <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                        <SelectTrigger className="bg-background border-white/10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Ativo</SelectItem>
                          <SelectItem value="paused">Pausado</SelectItem>
                          <SelectItem value="completed">Concluído</SelectItem>
                          <SelectItem value="archived">Arquivado</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Deadline">
                      <Input type="date" value={form.deadline_at ? form.deadline_at.slice(0, 10) : ""} onChange={(e) => setForm({ ...form, deadline_at: e.target.value ? new Date(e.target.value).toISOString() : null })} className="bg-background border-white/10" />
                    </Field>
                  </div>
                  <Field label="Tags (vírgula)">
                    <Input value={(form.tags ?? []).join(", ")} onChange={(e) => setForm({ ...form, tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} className="bg-background border-white/10" />
                  </Field>
                  <Field label="Cor">
                    <div className="flex gap-2">
                      {COLORS.map((c) => (
                        <button key={c} onClick={() => setForm({ ...form, color: c })}
                          className={`w-7 h-7 rounded-full transition-all ${form.color === c ? "ring-2 ring-white" : ""}`}
                          style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </Field>
                </div>
                <Button onClick={() => mut.mutate({
                  name: form.name, description: form.description, status: form.status,
                  deadline_at: form.deadline_at, tags: form.tags, color: form.color,
                })} className="bg-primary font-bold gap-1"><Save className="w-3 h-3" /> SALVAR</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function Kpi({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/5 p-3">
      <Icon className="w-4 h-4 text-primary mb-1" />
      <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
    </div>
  );
}

function QuickLinks({ projectId }: { projectId: string }) {
  const links = [
    { to: "/ganchos", label: "Gerar Ganchos", icon: Sparkles },
    { to: "/carrossel", label: "Criar Carrossel", icon: Layout },
    { to: "/calendario", label: "Agendar Post", icon: CalendarIcon },
    { to: "/transcricao", label: "Transcrever Reel", icon: Mic },
    { to: "/concorrente", label: "Analisar Concorrente", icon: Users },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
      {links.map((l) => {
        const I = l.icon;
        return (
          <Link key={l.to} to={l.to} search={{ project: projectId } as any}
            className="rounded-xl border border-white/5 bg-white/5 hover:border-primary/30 hover:bg-primary/5 p-3 text-center transition">
            <I className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-[11px] font-bold text-white">{l.label}</p>
          </Link>
        );
      })}
    </div>
  );
}

function ContentTabs({ content, projectId: _ }: { content: any; projectId: string }) {
  if (!content) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  const sections = [
    { key: "carousels", label: "Carrosséis", to: "/carrossel", render: (i: any) => i.topic },
    { key: "hooks", label: "Ganchos", to: "/ganchos", render: (i: any) => i.hook },
    { key: "calendar", label: "Calendário", to: "/calendario", render: (i: any) => `${i.title} — ${new Date(i.scheduled_at).toLocaleDateString("pt-BR")}` },
    { key: "transcriptions", label: "Transcrições", to: "/transcricao", render: (i: any) => i.author_handle ?? i.reel_url },
    { key: "competitors", label: "Concorrentes", to: "/concorrente", render: (i: any) => `@${i.competitor_handle}` },
    { key: "analyses", label: "Análises", to: "/analise", render: (i: any) => `@${i.handle}` },
  ];
  return (
    <Tabs defaultValue={sections[0].key}>
      <TabsList className="bg-white/5 flex-wrap h-auto">
        {sections.map((s) => (
          <TabsTrigger key={s.key} value={s.key}>{s.label} ({content[s.key]?.length ?? 0})</TabsTrigger>
        ))}
      </TabsList>
      {sections.map((s) => (
        <TabsContent key={s.key} value={s.key} className="mt-3">
          {content[s.key]?.length ? (
            <ul className="space-y-2">
              {content[s.key].map((item: any) => (
                <li key={item.id} className="rounded-lg border border-white/5 bg-white/5 p-3 text-sm text-white flex items-center justify-between">
                  <span className="truncate">{s.render(item)}</span>
                  {item.is_favorite && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 shrink-0" />}
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 p-8 text-center">
              <Megaphone className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nada por aqui ainda.</p>
              <Link to={s.to as any}><Button size="sm" className="mt-3 bg-primary">Criar agora</Button></Link>
            </div>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
