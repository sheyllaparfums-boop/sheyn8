import { createFileRoute } from '@tanstack/react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import {
  Check, X, Zap, Sparkles, Shield, Crown, ChevronDown, Star, Users,
  Clock, BadgePercent, MessageCircle, Calculator, ShieldCheck, ArrowRight,
  Globe,
} from 'lucide-react';
import { DashboardHeader } from "@/components/dashboard/Header";
import { useAuthStore, UserPlan } from '@/lib/auth-store';
import { toast } from "sonner";
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';

// ---------- Helpers ----------
type Cycle = 'monthly' | 'yearly';
type Currency = 'BRL' | 'USD';

const FX = { BRL: 1, USD: 0.2 }; // 1 BRL ≈ 0.20 USD (estimativa)
const SYMBOL = { BRL: 'R$', USD: 'US$' };
const YEARLY_DISCOUNT = 0.1667; // ~2 meses grátis

const PlanIcon = ({ type }: { type: string }) => {
  const cls = "w-5 h-5";
  switch (type) {
    case 'BETA': return <Sparkles className={`${cls} text-emerald-400`} />;
    case 'START': return <Sparkles className={cls} />;
    case 'PRO': return <Zap className={cls} />;
    case 'CEO': return <Crown className={cls} />;
    default: return <Sparkles className={cls} />;
  }
};

type Plan = {
  name: string;
  type: UserPlan;
  priceBRL: number; // mensal base
  description: string;
  features: string[];
  matrix: Record<string, boolean | string>;
  buttonText: string;
  highlight?: boolean;
  badge?: string;
  testimonial?: { quote: string; author: string };
};

const FEATURE_MATRIX_KEYS: { key: string; label: string }[] = [
  { key: 'radar', label: 'Radar Viral' },
  { key: 'hooks', label: 'Ganchos virais ilimitados' },
  { key: 'calendar', label: 'Calendário de conteúdo' },
  { key: 'analise', label: 'Análise de perfil' },
  { key: 'concorrentes', label: 'Análise de concorrentes' },
  { key: 'sheyai', label: 'SHEY AI (Automações)' },
  { key: 'scribe', label: 'Transcrição SCRIBE' },
  { key: 'flows', label: 'Flows / Workflows' },
  { key: 'mentorias', label: 'Mentorias gravadas' },
  { key: 'api', label: 'Acesso às APIs' },
  { key: 'gerente', label: 'Gerente de conta dedicado' },
  { key: 'suporte', label: 'Suporte' },
];

const plans: Plan[] = [
  {
    name: 'BETA',
    type: 'BETA',
    priceBRL: 0,
    description: 'Apenas para convidados (Beta Exclusivo).',
    features: ['Acesso ilimitado a tudo', 'Exclusivo para testadores', 'Todas as funções liberadas', 'Suporte prioritário'],
    matrix: { radar: true, hooks: true, calendar: true, analise: true, concorrentes: true, sheyai: true, scribe: true, flows: true, mentorias: true, api: true, gerente: false, suporte: 'Prioritário' },
    buttonText: 'APENAS COM CONVITE',
  },
  {
    name: 'START',
    type: 'START',
    priceBRL: 19,
    description: 'Ideal para iniciantes no digital.',
    features: ['Radar Viral (básico)', 'Ganchos virais ilimitados', 'Calendário de conteúdo', 'Suporte via comunidade'],
    matrix: { radar: 'Básico', hooks: true, calendar: true, analise: '3/mês', concorrentes: false, sheyai: false, scribe: '10/mês', flows: false, mentorias: false, api: false, gerente: false, suporte: 'Comunidade' },
    buttonText: 'ASSINAR START',
    testimonial: { quote: 'Em 30 dias bati meu primeiro reel com 1M de views.', author: '@maria.criadora' },
  },
  {
    name: 'PRO',
    type: 'PRO',
    priceBRL: 37,
    description: 'Otimizado para criadores profissionais.',
    features: ['Tudo do START', 'SHEY AI (Automações)', 'Análise de concorrentes', 'Transcrição SCRIBE ilimitada', 'Suporte prioritário'],
    matrix: { radar: 'Completo', hooks: true, calendar: true, analise: 'Ilimitado', concorrentes: true, sheyai: true, scribe: 'Ilimitado', flows: '5 ativos', mentorias: 'Parcial', api: false, gerente: false, suporte: 'Prioritário' },
    buttonText: 'ASSINAR PRO',
    highlight: true,
    badge: 'MAIS VENDIDO',
    testimonial: { quote: 'Cortei 80% do tempo planejando conteúdo. Vale cada centavo.', author: '@joao.digital' },
  },
  {
    name: 'CEO',
    type: 'CEO',
    priceBRL: 75,
    description: 'Domínio total do mercado e automações.',
    features: ['Tudo do PRO', 'Acesso total às APIs', 'Mentorias gravadas', 'Gestão de projetos ilimitada', 'Acesso antecipado a betas', 'Gerente de conta dedicado'],
    matrix: { radar: 'Completo', hooks: true, calendar: true, analise: 'Ilimitado', concorrentes: true, sheyai: true, scribe: 'Ilimitado', flows: 'Ilimitado', mentorias: 'Completo', api: true, gerente: true, suporte: 'Dedicado 1:1' },
    buttonText: 'SEJA ILIMITADO',
    testimonial: { quote: 'Substituí 6 ferramentas. Meu time agradece.', author: '@agencia.viral' },
  },
];

const FAQ = [
  { q: 'Posso cancelar a qualquer momento?', a: 'Sim. Cancele em 1 clique no portal do cliente. Sem multa, sem letra miúda. Você mantém acesso até o fim do ciclo pago.' },
  { q: 'Como funciona a garantia?', a: 'Garantia incondicional de 7 dias. Se não amar, devolvemos 100% do valor sem perguntas.' },
  { q: 'Posso trocar de plano depois?', a: 'Sim. Upgrade é imediato (com pro-rata do que falta no ciclo). Downgrade aplica no próximo ciclo.' },
  { q: 'Pago no cartão internacional?', a: 'Sim, aceitamos cartões nacionais e internacionais, Pix e boleto (mensal).' },
  { q: 'Preciso instalar algo?', a: 'Não. Tudo roda no navegador e no PWA. Funciona em qualquer dispositivo.' },
  { q: 'O plano anual tem desconto real?', a: 'Sim, ~2 meses grátis. Você economiza ~17% pagando o ano de uma vez.' },
];

const COMPETITOR_STACK = [
  { name: 'ChatGPT Plus', price: 100 },
  { name: 'Canva Pro', price: 55 },
  { name: 'Metricool', price: 90 },
  { name: 'Notion AI', price: 50 },
];

function priceFor(plan: Plan, cycle: Cycle, currency: Currency, coupon: number) {
  if (plan.priceBRL === 0) return { display: '0', original: null as null | string, monthly: 0 };
  const base = plan.priceBRL * FX[currency];
  const monthly = cycle === 'yearly' ? base * (1 - YEARLY_DISCOUNT) : base;
  const withCoupon = monthly * (1 - coupon);
  const fmt = (n: number) => n.toFixed(currency === 'BRL' ? 0 : 2);
  return {
    display: fmt(withCoupon),
    original: cycle === 'yearly' || coupon > 0 ? fmt(base) : null,
    monthly: withCoupon,
  };
}

function useTrialCountdown(endsAt?: string) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(i);
  }, []);
  if (!endsAt) return null;
  const ms = new Date(endsAt).getTime() - now;
  if (ms <= 0) return { expired: true, days: 0, hours: 0 };
  return { expired: false, days: Math.floor(ms / 86_400_000), hours: Math.floor((ms % 86_400_000) / 3_600_000) };
}

// ---------- Page ----------
function PlanosPage() {
  const { user, updatePlan, isAuthenticated } = useAuthStore();
  const [cycle, setCycle] = useState<Cycle>('yearly');
  const [currency, setCurrency] = useState<Currency>('BRL');
  const [couponInput, setCouponInput] = useState('');
  const [couponApplied, setCouponApplied] = useState<{ code: string; pct: number } | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [openCompare, setOpenCompare] = useState(false);

  const trial = useTrialCountdown(user?.trialEndsAt);
  const couponPct = couponApplied?.pct ?? 0;

  const competitorTotal = useMemo(
    () => COMPETITOR_STACK.reduce((s, c) => s + c.price, 0) * FX[currency],
    [currency]
  );

  const applyCoupon = () => {
    const code = couponInput.trim().toUpperCase();
    const valid: Record<string, number> = { VIRAL10: 0.1, SHEY20: 0.2, BLACK50: 0.5 };
    if (valid[code]) {
      setCouponApplied({ code, pct: valid[code] });
      toast.success(`Cupom ${code} aplicado: ${Math.round(valid[code] * 100)}% off`);
    } else {
      toast.error('Cupom inválido. Tente VIRAL10 ou SHEY20.');
    }
  };

  const handleSubscribe = (plan: Plan) => {
    if (!isAuthenticated) {
      toast.error('Crie uma conta ou faça login para assinar um plano.');
      return;
    }
    if (plan.type === 'BETA') {
      toast.error('O plano Beta só está disponível através de convites.');
      return;
    }
    if (user?.plan === plan.type) {
      toast.error(`Você já possui o plano ${plan.type} ativo.`);
      return;
    }
    const t = toast.loading(`Processando assinatura ${plan.type}...`);
    setTimeout(() => {
      updatePlan(plan.type);
      toast.dismiss(t);
      toast.success(`Parabéns! Plano ${plan.type} ativado.`, { duration: 5000, icon: '🚀' });
    }, 1500);
  };

  const openWhatsApp = () => {
    const msg = encodeURIComponent('Olá! Quero um plano personalizado SHEY VIRAL.');
    window.open(`https://wa.me/5511999999999?text=${msg}`, '_blank');
  };

  return (
    <div className="flex min-h-screen flex-col">
      {!isAuthenticated ? (
        <>
          <div
            aria-hidden
            className="fixed inset-0 z-[-1] bg-[#050505]"
            style={{
              backgroundImage:
                'radial-gradient(ellipse 60% 50% at 20% 10%, rgba(255,107,0,0.08), transparent 60%), radial-gradient(ellipse 50% 40% at 80% 90%, rgba(255,107,0,0.05), transparent 60%)',
            }}
          />
          <PublicHeader />
        </>
      ) : (
        <DashboardHeader />
      )}

      <div className={`flex-1 px-5 py-10 md:p-12 font-outfit relative z-20 ${!isAuthenticated ? 'bg-transparent pt-28' : 'bg-background'}`}>
        <div className="max-w-7xl mx-auto">

          {/* Hero */}
          <div className="text-center mb-10 space-y-4">
            <motion.div
              initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-[0.2em]"
            >
              <Shield className="w-3 h-3" /> Planos & Assinaturas
            </motion.div>
            <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
              Escolha o nível do seu <span className="text-primary">sucesso</span>
            </h1>
            <p className="text-gray-500 max-w-2xl mx-auto text-sm md:text-base">
              Mais de <span className="text-white font-semibold">1.200 criadores</span> automatizam conteúdo com a SHEY VIRAL.
            </p>

            {/* Trust signals */}
            <div className="flex flex-wrap justify-center items-center gap-3 md:gap-6 pt-4 text-[10px] md:text-xs text-gray-500">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Garantia 7 dias</span>
              <span className="inline-flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-primary" /> +1.200 criadores</span>
              <span className="inline-flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-yellow-500" /> 4.9/5 (320 reviews)</span>
              <span className="inline-flex items-center gap-1.5"><BadgePercent className="w-3.5 h-3.5 text-primary" /> Cancele quando quiser</span>
            </div>
          </div>

          {/* Trial banner */}
          {isAuthenticated && user?.plan === 'TRIAL' && trial && (
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="mb-8 rounded-2xl border border-primary/30 bg-primary/5 p-4 md:p-5 flex items-center gap-3"
            >
              <Clock className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 text-sm">
                {trial.expired ? (
                  <span className="text-white">Seu trial expirou. <span className="text-primary font-bold">Escolha um plano</span> para continuar.</span>
                ) : (
                  <span className="text-white">
                    Seu trial acaba em <span className="text-primary font-black">{trial.days}d {trial.hours}h</span> — assine agora para não perder seu progresso.
                  </span>
                )}
              </div>
            </motion.div>
          )}

          {/* Toggle row */}
          <div className="flex flex-col md:flex-row gap-3 items-center justify-center mb-10">
            {/* Cycle */}
            <div className="inline-flex p-1 rounded-full bg-white/5 border border-white/10">
              <button
                onClick={() => setCycle('monthly')}
                className={`px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-wider transition ${cycle === 'monthly' ? 'bg-white text-black' : 'text-gray-400'}`}
              >Mensal</button>
              <button
                onClick={() => setCycle('yearly')}
                className={`px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-wider transition inline-flex items-center gap-2 ${cycle === 'yearly' ? 'bg-primary text-white' : 'text-gray-400'}`}
              >
                Anual
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${cycle === 'yearly' ? 'bg-white/20' : 'bg-emerald-500/20 text-emerald-400'}`}>-17%</span>
              </button>
            </div>

            {/* Currency */}
            <div className="inline-flex p-1 rounded-full bg-white/5 border border-white/10">
              {(['BRL', 'USD'] as Currency[]).map(c => (
                <button key={c}
                  onClick={() => setCurrency(c)}
                  className={`px-3 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition inline-flex items-center gap-1 ${currency === c ? 'bg-white text-black' : 'text-gray-400'}`}
                >
                  <Globe className="w-3 h-3" /> {c}
                </button>
              ))}
            </div>

            {/* Coupon */}
            <div className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-white/5 border border-white/10">
              <BadgePercent className="w-4 h-4 text-primary ml-2" />
              <input
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                placeholder="Cupom"
                className="bg-transparent text-xs text-white placeholder:text-gray-600 outline-none w-20"
              />
              <button onClick={applyCoupon} className="px-3 py-1.5 rounded-full bg-primary text-white text-[10px] font-black uppercase tracking-wider">Aplicar</button>
              {couponApplied && (
                <span className="text-[10px] text-emerald-400 font-bold pr-2">{couponApplied.code} -{Math.round(couponPct * 100)}%</span>
              )}
            </div>
          </div>

          {/* Plans grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-7">

            {plans.map((plan, index) => {
              const p = priceFor(plan, cycle, currency, couponPct);
              const isCurrent = isAuthenticated && user?.plan === plan.type;
              const isUpgrade = isAuthenticated && user?.plan && user.plan !== plan.type && plan.priceBRL > (plans.find(x => x.type === user.plan)?.priceBRL ?? 0);

              return (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06, duration: 0.35 }}
                  style={{ willChange: 'transform' }}
                  className={`relative flex flex-col p-8 md:p-9 rounded-[28px] bg-[#0A0A0A] border ${plan.highlight ? 'border-primary/50 shadow-2xl shadow-primary/10' : 'border-white/10'}`}
                >
                  {/* Badges */}
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary rounded-full text-[9px] font-black uppercase tracking-widest text-white shadow-lg shadow-primary/40">
                      {plan.badge}
                    </div>
                  )}
                  {plan.type === 'PRO' && user?.plan === 'TRIAL' && (
                    <div className="absolute -top-3 right-3 px-2 py-1 bg-emerald-500 rounded-full text-[9px] font-black uppercase tracking-widest text-white">
                      Recomendado p/ você
                    </div>
                  )}

                  <div className="flex items-center gap-3 mb-6">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${plan.highlight ? 'bg-primary text-white' : 'bg-white/5 text-gray-400'}`}>
                      <PlanIcon type={plan.type} />
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">{plan.name}</h3>
                  </div>

                  <div className="mb-7">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      {p.original && (
                        <span className="text-sm text-gray-600 line-through">{SYMBOL[currency]} {p.original}</span>
                      )}
                      <span className="text-4xl font-bold text-white">{SYMBOL[currency]} {p.display}</span>
                      <span className="text-gray-600 text-xs font-medium">
                        /{plan.priceBRL === 0 ? 'sempre' : 'mês'}
                      </span>
                    </div>
                    {cycle === 'yearly' && plan.priceBRL > 0 && (
                      <p className="mt-2 text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                        Cobrado anual · economiza ~2 meses
                      </p>
                    )}
                    <p className="mt-4 text-xs text-gray-500 leading-relaxed">{plan.description}</p>
                  </div>

                  <div className="flex-1 space-y-3.5 mb-7">
                    {plan.features.map((f) => (
                      <div key={f} className="flex items-start gap-2.5">
                        <div className="mt-0.5 w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 text-primary" strokeWidth={4} />
                        </div>
                        <span className="text-xs text-gray-400 font-medium leading-relaxed">{f}</span>
                      </div>
                    ))}
                  </div>

                  {/* Upgrade pro-rata hint */}
                  {isUpgrade && cycle === 'monthly' && (
                    <div className="mb-3 text-[10px] text-gray-500 bg-white/5 rounded-lg p-2">
                      Upgrade imediato — cobramos só a diferença pro-rata do ciclo.
                    </div>
                  )}

                  <button
                    onClick={() => handleSubscribe(plan)}
                    disabled={isCurrent && plan.type !== 'BETA'}
                    className={`w-full py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 inline-flex items-center justify-center gap-2 ${
                      isCurrent
                        ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 cursor-default'
                        : plan.highlight
                          ? 'bg-primary text-white shadow-xl shadow-primary/20 hover:bg-primary-glow active:scale-[0.98]'
                          : 'bg-white/5 text-white border border-white/10 hover:bg-white/10 active:scale-[0.98]'
                    }`}
                  >
                    {isCurrent ? 'PLANO ATUAL' : plan.buttonText}
                    {!isCurrent && <ArrowRight className="w-3 h-3" />}
                  </button>

                  {/* Mini testimonial */}
                  {plan.testimonial && (
                    <div className="mt-4 pt-4 border-t border-white/5">
                      <p className="text-[11px] text-gray-400 italic leading-relaxed">"{plan.testimonial.quote}"</p>
                      <p className="text-[10px] text-primary font-bold mt-1">{plan.testimonial.author}</p>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* ROI Calculator */}
          <div className="mt-14 p-6 md:p-8 rounded-[28px] bg-gradient-to-br from-primary/10 via-transparent to-emerald-500/5 border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center"><Calculator className="w-5 h-5 text-primary" /></div>
              <div>
                <h4 className="text-base md:text-lg font-bold text-white">Quanto você economiza vs ferramentas separadas</h4>
                <p className="text-xs text-gray-500">Comparação real do stack típico de um criador.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
              {COMPETITOR_STACK.map(c => (
                <div key={c.name} className="rounded-xl bg-white/5 border border-white/10 p-3">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">{c.name}</p>
                  <p className="text-sm font-bold text-white mt-1">{SYMBOL[currency]} {(c.price * FX[currency]).toFixed(currency === 'BRL' ? 0 : 2)}</p>
                </div>
              ))}
              <div className="rounded-xl bg-primary/15 border border-primary/30 p-3">
                <p className="text-[10px] text-primary uppercase tracking-wider font-black">SHEY VIRAL PRO</p>
                <p className="text-sm font-bold text-white mt-1">{SYMBOL[currency]} {(37 * FX[currency]).toFixed(currency === 'BRL' ? 0 : 2)}</p>
              </div>
            </div>
            <div className="mt-5 flex items-baseline gap-3 flex-wrap">
              <p className="text-xs text-gray-400">Stack tradicional:</p>
              <p className="text-lg font-bold text-gray-500 line-through">{SYMBOL[currency]} {competitorTotal.toFixed(currency === 'BRL' ? 0 : 2)}/mês</p>
              <p className="text-2xl md:text-3xl font-black text-emerald-400">Economia: {SYMBOL[currency]} {(competitorTotal - 37 * FX[currency]).toFixed(currency === 'BRL' ? 0 : 2)}/mês</p>
            </div>
          </div>

          {/* Comparison table */}
          <div className="mt-10 rounded-[28px] bg-[#0A0A0A] border border-white/10 overflow-hidden">
            <button
              onClick={() => setOpenCompare(v => !v)}
              className="w-full flex items-center justify-between p-5 md:p-6 hover:bg-white/5 transition"
            >
              <div className="text-left">
                <h4 className="text-base md:text-lg font-bold text-white">Comparativo completo de funções</h4>
                <p className="text-xs text-gray-500">Veja exatamente o que vem em cada plano.</p>
              </div>
              <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${openCompare ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {openCompare && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-x-auto">
                  <table className="w-full text-xs min-w-[600px]">
                    <thead>
                      <tr className="border-y border-white/10 bg-white/[0.02]">
                        <th className="text-left p-3 text-gray-500 font-medium">Função</th>
                        {plans.map(p => (
                          <th key={p.type} className={`p-3 text-center font-black uppercase tracking-wider ${p.highlight ? 'text-primary' : 'text-white'}`}>{p.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {FEATURE_MATRIX_KEYS.map(({ key, label }) => (
                        <tr key={key} className="border-b border-white/5">
                          <td className="p-3 text-gray-400">{label}</td>
                          {plans.map(p => {
                            const v = p.matrix[key];
                            return (
                              <td key={p.type} className="p-3 text-center">
                                {v === true ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> :
                                  v === false ? <X className="w-4 h-4 text-gray-700 mx-auto" /> :
                                  <span className="text-[11px] text-white font-medium">{v}</span>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* FAQ */}
          <div className="mt-10">
            <h4 className="text-xl md:text-2xl font-bold text-white mb-5">Perguntas frequentes</h4>
            <div className="space-y-2">
              {FAQ.map((f, i) => (
                <div key={i} className="rounded-2xl bg-[#0A0A0A] border border-white/10 overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition text-left"
                  >
                    <span className="text-sm font-semibold text-white">{f.q}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${openFaq === i ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {openFaq === i && (
                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                        <p className="px-4 pb-4 text-xs text-gray-400 leading-relaxed">{f.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>

          {/* Custom CTA */}
          <div className="mt-12 p-6 md:p-8 rounded-[28px] bg-gradient-to-r from-primary/10 to-transparent border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <h4 className="text-lg md:text-xl font-bold text-white">Precisa de um plano personalizado?</h4>
              <p className="text-sm text-gray-500 max-w-md">Agências e grandes operações: APIs exclusivas, white-label e SLA dedicado.</p>
            </div>
            <button
              onClick={openWhatsApp}
              className="px-6 py-3.5 rounded-2xl bg-white text-black font-black text-[11px] uppercase tracking-[0.2em] hover:bg-gray-200 transition inline-flex items-center gap-2"
            >
              <MessageCircle className="w-4 h-4" /> Falar no WhatsApp
            </button>
          </div>

        </div>
      </div>
      {!isAuthenticated && <PublicFooter />}
    </div>
  );
}

export const Route = createFileRoute('/planos')({
  head: () => ({
    meta: [
      { title: "Planos & Preços — SHEY VIRAL" },
      { name: "description", content: "Escolha seu plano SHEY VIRAL: BETA, START, PRO ou CEO. Mensal ou anual com até 17% off. Garantia 7 dias." },
      { property: "og:title", content: "Planos & Preços — SHEY VIRAL" },
      { property: "og:description", content: "Escolha seu plano SHEY VIRAL: BETA, START, PRO ou CEO. Mensal ou anual com até 17% off. Garantia 7 dias." },
      { property: "og:url", content: "https://sheyn8n.lovable.app/planos" },
      { property: "og:image", content: "https://sheyn8n.lovable.app/og-image.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://sheyn8n.lovable.app/og-image.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://sheyn8n.lovable.app/planos" }],
  }),
  component: PlanosPage,
});
