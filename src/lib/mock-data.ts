export type Metric = {
  id: string;
  label: string;
  value: number;
  suffix?: string;
  deltaPct: number;
  sparkline: number[];
  icon: "zap" | "infinity" | "clock" | "target";
};

export const metrics: Metric[] = [
  {
    id: "analises",
    label: "Conteúdos Analisados",
    value: 1246,
    deltaPct: 32.8,
    icon: "zap",
    sparkline: [120, 180, 150, 220, 260, 240, 310, 280, 360, 420, 480, 520],
  },
  {
    id: "tendencias",
    label: "Tendências Monitoradas",
    value: 84,
    deltaPct: 14.3,
    icon: "infinity",
    sparkline: [12, 13, 14, 14, 16, 17, 18, 19, 20, 21, 23, 84],
  },
  {
    id: "viralidade",
    label: "Potencial Viral Médio",
    value: 87,
    suffix: "%",
    deltaPct: 28.1,
    icon: "clock",
    sparkline: [40, 55, 62, 70, 78, 88, 95, 102, 110, 118, 122, 87],
  },
  {
    id: "crescimento",
    label: "Score de Crescimento",
    value: 942,
    deltaPct: 18.7,
    icon: "target",
    sparkline: [300, 400, 450, 500, 600, 650, 700, 750, 800, 850, 900, 942],
  },
];

export const executions24h = [
  { time: "00:00", value: 120 },
  { time: "04:00", value: 80 },
  { time: "08:00", value: 240 },
  { time: "12:00", value: 480 },
  { time: "14:00", value: 612 },
  { time: "16:00", value: 540 },
  { time: "20:00", value: 360 },
  { time: "24:00", value: 200 },
];

export const workflowStatus = [
  { label: "Ativos", value: 18, color: "var(--success)" },
  { label: "Em Execução", value: 4, color: "var(--primary)" },
  { label: "Inativos", value: 2, color: "var(--muted-foreground)" },
];

export type WorkflowStatusKey = "ativo" | "execucao" | "inativo";

export const recentWorkflows: {
  name: string;
  status: WorkflowStatusKey;
  statusLabel: string;
  executions: number;
  lastRun: string;
}[] = [
  { name: "Radar Viral: Nicho Perfumaria", status: "ativo", statusLabel: "Monitorando", executions: 342, lastRun: "2 min atrás" },
  { name: "Análise de Hooks: Top 10 Vídeos", status: "ativo", statusLabel: "Analizado", executions: 187, lastRun: "5 min atrás" },
  { name: "Ideias de Reels: Estratégia VIP", status: "execucao", statusLabel: "Gerando", executions: 128, lastRun: "7 min atrás" },
  { name: "Tendências do Nicho: Brasil", status: "ativo", statusLabel: "Ativo", executions: 98, lastRun: "15 min atrás" },
  { name: "Score Viral: @perfumaria_strategy", status: "inativo", statusLabel: "Pausado", executions: 0, lastRun: "1 dia atrás" },
];

export type ActivityKind = "success" | "running" | "error";

export const recentActivity: {
  kind: ActivityKind;
  title: string;
  description: string;
  time: string;
}[] = [
  { kind: "success", title: 'Tendência detectada: Perfumes Importados', description: "Alto Potencial Viral", time: "2 min atrás" },
  { kind: "success", title: "Análise de Hook concluída", description: "Hook de 3s detectado", time: "5 min atrás" },
  { kind: "running", title: 'IA gerando roteiro de Reels', description: "Em processamento", time: "7 min atrás" },
  { kind: "success", title: "Relatório de Crescimento gerado", description: "+12% potencial", time: "15 min atrás" },
  { kind: "error", title: 'Falha na conexão com Instagram', description: "Aguardando proxy", time: "1h atrás" },
];
