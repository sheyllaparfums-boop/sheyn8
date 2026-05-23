import { useState, useEffect } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { 
  Bot, 
  LayoutGrid, 
  Sparkles, 
  Mic, 
  ArrowRight, 
  Video,
  Zap,
  TrendingUp,
  History,
  Lock,
  Clock,
  RefreshCw
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { hasFeature, FeatureKey } from "@/lib/plan-utils";
import { ClientKpiBar } from "@/components/dashboard/ClientKpiBar";

export function ClientDashboard() {
  const { user, onboardingByUser } = useAuthStore();
  const onboarding = user ? onboardingByUser[user.id] : null;
  const handle = onboarding?.handle ?? null;
  const onboardingDone = Boolean(onboarding);
  const name = user?.name?.split(' ')[0] || "Criador";
  const [trendUpdatedAt, setTrendUpdatedAt] = useState<Date>(new Date());
  const refreshTrends = () => setTrendUpdatedAt(new Date());
  const trendsAgo = Math.max(0, Math.floor((Date.now() - trendUpdatedAt.getTime()) / 60000));

  const isTrial = user?.plan === 'TRIAL';
  const trialDaysLeft = user?.trialEndsAt 
    ? Math.ceil((new Date(user.trialEndsAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const shortcuts = [
    { title: "SHEY AI", desc: "Assistente Viral", icon: Bot, to: "/automacoes-ia", color: "text-blue-400", bg: "bg-blue-500/10", feature: 'SHEY_AI' as FeatureKey },
    { title: "Carrossel", desc: "Gerador de Slides", icon: LayoutGrid, to: "/carrossel", color: "text-purple-400", bg: "bg-purple-500/10", feature: 'RADAR_VIRAL' as FeatureKey },
    { title: "Ganchos", desc: "Scripts de Impacto", icon: Sparkles, to: "/ganchos", color: "text-amber-400", bg: "bg-amber-500/10", feature: 'GANCHOS_VIRAIS' as FeatureKey },
    { title: "Scribe v1", desc: "Transcrição de Reels", icon: Mic, to: "/transcricao", color: "text-cyan-400", bg: "bg-cyan-500/10", feature: 'SCRIBE' as FeatureKey },
  ];

  const visibleShortcuts = shortcuts.filter(s => !s.feature || (user?.plan && hasFeature(user.plan, s.feature)));

  return (
    <div className="space-y-8">
      {/* Trial Alert */}
      {isTrial && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Seu período de teste está ativo!</p>
              <p className="text-xs text-muted-foreground">Você tem {trialDaysLeft} {trialDaysLeft === 1 ? 'dia' : 'dias'} para explorar todas as funções PRO gratuitamente.</p>
            </div>
          </div>
          <Link to="/planos" className="text-xs font-black uppercase tracking-wider bg-primary text-black px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
            Assinar Agora
          </Link>
        </motion.div>
      )}

      {/* Hero Welcome — compact after onboarding */}
      <section className={`relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background ${onboardingDone ? "p-4 md:p-5" : "p-6 md:p-10"}`}>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <h1 className={`font-display font-bold tracking-tight ${onboardingDone ? "text-xl md:text-2xl" : "text-3xl md:text-4xl"}`}>
              Olá, <span className="text-primary">{name}</span>! 👋
            </h1>
            {!onboardingDone && (
              <p className="text-muted-foreground max-w-md text-sm">
                Pronto para dominar o algoritmo hoje? {handle ? `O perfil @${handle} está ativo e pronto para novas estratégias.` : "Configure seu perfil para começar."}
              </p>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              {(!user?.plan || hasFeature(user.plan, 'SHEY_AI')) ? (
                <Link to="/automacoes-ia" className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition hover:opacity-90">
                  <Zap className="h-3.5 w-3.5" /> Começar Agora
                </Link>
              ) : (
                <Link to="/planos" className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition hover:opacity-90">
                  <Lock className="h-3.5 w-3.5" /> Upgrade IA
                </Link>
              )}
              {(!user?.plan || hasFeature(user.plan, 'MENTORIAS')) && (
                <Link to="/mentorias" className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground transition hover:bg-muted">
                  <Video className="h-3.5 w-3.5" /> Mentorias
                </Link>
              )}
            </div>
          </div>
          {!onboardingDone && (
            <div className="hidden lg:block relative h-32 w-32">
              <div className="absolute inset-0 bg-primary/20 animate-pulse" />
              <Bot className="relative h-full w-full text-primary opacity-50" />
            </div>
          )}
        </div>
      </section>

      {/* KPI cards + sparkline */}
      <ClientKpiBar />

      {/* Quick Access */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {visibleShortcuts.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Link 
              to={s.to}
              className="group flex flex-col gap-4 rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/50 hover:-translate-y-1"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.bg}`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{s.title}</h3>
                <p className="text-[11px] text-muted-foreground">{s.desc}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
            </Link>
          </motion.div>
        ))}
      </section>

      {/* Tendências + Atividade */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display text-lg font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" /> Tendências para você
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">
                {trendsAgo === 0 ? "agora" : `há ${trendsAgo} min`}
              </span>
              <button
                onClick={refreshTrends}
                aria-label="Atualizar tendências"
                className="text-muted-foreground hover:text-foreground transition"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="space-y-4">
             <p className="text-sm text-muted-foreground italic">"O conteúdo do seu nicho está valorizando carrosséis educativos com fundo escuro hoje."</p>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/30 border border-border text-xs">
                   <p className="font-bold text-primary mb-1">Dica Viral</p>
                   Use o Scribe v1 para transcrever os Reels do seu concorrente e peça para a SHEY AI reescrever o roteiro.
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border text-xs">
                   <p className="font-bold text-primary mb-1">Ação Sugerida</p>
                   Crie um carrossel baseado no seu último hook aprovado pela IA.
                </div>
             </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-display text-lg font-bold flex items-center gap-2 mb-6">
            <History className="h-5 w-5 text-primary" /> Atividade
          </h3>
          <div className="space-y-4">
             <ClientActivityList />
          </div>
        </div>
      </div>
    </div>
  );
}

function ClientActivityList() {
  const { user } = useAuthStore();
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase
        .from("activity_logs")
        .select("event_type, description, created_at, status")
        .or(`auth_user_id.eq.${user.id},user_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(5);
      if (data) setLogs(data);
    };
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [user?.id]);

  if (logs.length === 0) {
    return <p className="text-[11px] text-muted-foreground text-center py-4">Sua conta está sendo monitorada em tempo real.</p>;
  }

  return (
    <div className="space-y-4">
      {logs.map((log: any, i: number) => {
        const dot =
          log.status === "error" ? "bg-red-500" :
          log.status === "success" ? "bg-emerald-400" : "bg-primary";
        return (
          <div key={i} className="flex items-start gap-3">
            <div className={`h-2 w-2 rounded-full ${dot} mt-1.5`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate">{log.description}</p>
              <p className="text-[10px] text-muted-foreground">
                {new Date(log.created_at).toLocaleString("pt-BR", { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
