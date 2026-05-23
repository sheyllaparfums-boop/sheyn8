import { createFileRoute, useNavigate, useSearch, Link } from '@tanstack/react-router';
import { LoginBackground } from '@/components/login/LoginBackground';
import { LoginCard } from '@/components/login/LoginCard';
import { FeatureBar } from '@/components/login/FeatureBar';
import { ComparisonSection } from '@/components/login/ComparisonSection';
import { RecoverPasswordModal, RegisterModal } from '@/components/login/AuthModals';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Infinity as InfinityIcon, Shield, Target, Zap, Lightbulb, TrendingUp, MessageSquare, ChevronRight, Phone, Mail as MailIcon, Globe, Github, Menu, X, ArrowRight, ChevronLeft } from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { useSiteSettings } from '@/lib/site-settings-store';

export const Route = createFileRoute('/login')({
  head: () => ({
    meta: [
      { title: "Entrar — SHEY VIRAL" },
      { name: "description", content: "Entre na SHEY VIRAL e ative sua inteligência viral ilimitada para Instagram e TikTok." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Entrar — SHEY VIRAL" },
      { property: "og:description", content: "Entre na SHEY VIRAL e ative sua inteligência viral ilimitada para Instagram e TikTok." },
      { property: "og:url", content: "https://sheyn8n.lovable.app/login" },
    ],
    links: [{ rel: "canonical", href: "https://sheyn8n.lovable.app/login" }],
  }),
  validateSearch: (search: Record<string, unknown>) => {
    return {
      action: (search.action as string) || undefined,
      redirect: (search.redirect as string) || undefined,
    };
  },
  component: LoginComponent,
});

function HeroSection() {
  const { heroBadge, heroTitle, heroSubtitle, heroCtaPrimary, heroCtaSecondary, heroBgImage } = useSiteSettings();
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);
  return (
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider mb-6">
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />

            {heroBadge}
          </div>
          
          <h1 className="text-4xl md:text-7xl font-bold text-white leading-[1.05] mb-8 tracking-tighter">
            {heroTitle}
          </h1>
          
          <p className="text-gray-400 text-lg md:text-xl leading-relaxed mb-12 max-w-xl">
            {heroSubtitle}
          </p>

          <div className="flex flex-wrap items-center gap-5">
            <button
              type="button"
              onClick={() => navigate({ to: '/login', search: { action: 'login' } })}
              className="px-10 py-5 rounded-2xl bg-primary text-primary-foreground font-black text-sm shadow-xl shadow-primary/20 hover:scale-105 transition-all flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              {heroCtaPrimary}
            </button>
            <button
              type="button"
              onClick={() => navigate({ to: '/planos' })}
              className="px-10 py-5 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-sm hover:bg-white/10 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              {heroCtaSecondary}
            </button>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="relative"
        >
          <div className="relative z-10 p-2 md:p-4 bg-[#1A1A1A] rounded-[2rem] border border-white/10 shadow-2xl shadow-primary/20 group">
            <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/5 bg-gradient-to-br from-primary/20 via-black to-primary/5">
              {!imgError && (
                <img 
                  src={heroBgImage || "/assets/dashboard-preview.png"}
                  alt="Plataforma" 
                  width={1280}
                  height={720}
                  loading="lazy"
                  decoding="async"
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-primary/20 rounded-full" />
            <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-primary/10 rounded-full" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function TrustSection() {
  const logos = [
    { name: 'Plusdin', url: '#' },
    { name: 'Etus', url: '#' },
    { name: 'Betinna', url: '#' },
    { name: 'Um2.ai', url: '#' },
    { name: 'Techify', url: '#' },
  ];

  return (
    <section className="py-20 border-t border-white/5 bg-[#030303]">
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-center text-[10px] font-bold tracking-[0.3em] text-gray-500 uppercase mb-12">QUEM CONFIA NA SHEY N8N</p>
        <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20 opacity-40 hover:opacity-100 transition-opacity">
          {logos.map((logo) => (
            <span key={logo.name} className="text-xl md:text-3xl font-black text-white italic tracking-tighter cursor-default hover:text-primary transition-colors">
              {logo.name}
            </span>
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link to="/ecosistema" className="text-primary text-xs font-bold flex items-center justify-center gap-2 hover:underline">
            Ver todos os apoiadores <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function LoginComponent() {
  const [isRecoverOpen, setIsRecoverOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [registeredUser, setRegisteredUser] = useState<{name: string, email: string} | null>(null);
  const [loginMode, setLoginMode] = useState<'cliente' | 'admin' | 'administrador'>('cliente');
  const { whatsappNumber, whatsappLabel, showWhatsappBubble, brandName, brandAccent, logoUrl, seoTitle, seoDescription, seoOgImage } = useSiteSettings();
  const search = useSearch({ from: '/login' });
  const showLogin = search.action === 'login';

  // Meta dinâmico extra (head() cobre o título base; aqui só atualizamos og:image se houver)
  useEffect(() => {
    if (!seoOgImage) return;
    let el = document.querySelector('meta[property="og:image"]');
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('property', 'og:image');
      document.head.appendChild(el);
    }
    el.setAttribute('content', seoOgImage);
  }, [seoOgImage]);

  const handleRegisterSuccess = (name: string, email: string) => {
    setRegisteredUser({ name, email });
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col bg-[#020202] text-white selection:bg-primary/30 overflow-x-hidden font-outfit">
      <LoginBackground />
      {!showLogin && <PublicHeader />}
      
      <main className="relative z-10 flex-1">
        <AnimatePresence mode="wait">
          {!showLogin ? (
            <motion.div
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <HeroSection />
              <TrustSection />
              <div className="px-6 pb-24">
                <ComparisonSection />
              </div>
            </motion.div>
          ) : (
            <div
              key="login"
              className="min-h-screen px-3 py-5 sm:pt-32 sm:pb-24 sm:px-6 relative z-10 flex items-center"
            >
              <div className="max-w-7xl mx-auto flex flex-col items-center">
                <div className="w-full max-w-[520px] mb-4 sm:mb-8">
                  <Link
                    to="/login"
                    search={{ action: undefined }}
                    className="inline-flex min-h-11 items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-bold uppercase tracking-wide"
                  >
                    <ChevronLeft className="w-5 h-5" />
                    Voltar para o início
                  </Link>
                </div>

                <div className="w-full max-w-[520px] bg-transparent border-0 rounded-none overflow-visible shadow-none px-0 py-0 sm:bg-[#0A0A0A] sm:border sm:border-white/5 sm:rounded-[32px] sm:overflow-hidden sm:shadow-2xl sm:shadow-black sm:px-10 sm:py-12 md:px-14 md:py-14 flex flex-col items-center">
                  <div className="flex items-center gap-3 mb-4 sm:mb-8">
                    {logoUrl ? (
                      <img src={logoUrl} alt={brandName} className="w-12 h-12 sm:w-10 sm:h-10 rounded-xl object-cover shadow-lg shadow-primary/20" />
                    ) : (
                      <div className="w-12 h-12 sm:w-10 sm:h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                        <InfinityIcon className="w-7 h-7 sm:w-6 sm:h-6 text-white" />
                      </div>
                    )}
                    <div className="flex flex-col leading-none">
                      <span className="text-2xl sm:text-xl font-bold tracking-tight text-white uppercase">{brandName} <span className="text-primary">{brandAccent}</span></span>
                      <span className="text-[11px] sm:text-[9px] tracking-[0.22em] sm:tracking-[0.3em] text-primary/80 font-black uppercase mt-1">Intelligence</span>
                    </div>
                  </div>
                  <LoginCard
                    onOpenRecover={() => setIsRecoverOpen(true)}
                    onOpenRegister={() => setIsRegisterOpen(true)}
                    initialEmail={registeredUser?.email}
                    loginMode={loginMode}
                    setLoginMode={setLoginMode}
                  />
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </main>

      {!showLogin && <PublicFooter />}

      {/* Floating Support Bubble */}
      {showWhatsappBubble && !showLogin && (
        <a 
          href={`https://wa.me/${whatsappNumber.replace(/\D/g, '')}`}
          target="_blank" 
          rel="noreferrer"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#25D366] hover:bg-[#20ba5a] text-white px-5 py-3.5 rounded-full shadow-2xl hover:shadow-[#25D366]/40 transition-all hover:-translate-y-1 group"
        >
          <div className="relative">
            <MessageSquare className="w-5 h-5 fill-current" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#25D366]" />
          </div>
          <span className="font-bold text-sm">{whatsappLabel}</span>
        </a>
      )}

      <RecoverPasswordModal 
        isOpen={isRecoverOpen} 
        onClose={() => setIsRecoverOpen(false)} 
      />
      
      <RegisterModal 
        isOpen={isRegisterOpen} 
        onClose={() => setIsRegisterOpen(false)}
        onRegisterSuccess={handleRegisterSuccess}
      />
    </div>
  );
}
