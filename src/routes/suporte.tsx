import { createFileRoute } from '@tanstack/react-router';
import DOMPurify from "isomorphic-dompurify";
import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { LoginBackground } from '@/components/login/LoginBackground';
import { motion } from 'framer-motion';
import { LifeBuoy, MessageCircle, BookOpen, Mail } from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { DashboardHeader } from '@/components/dashboard/Header';
import { useAuthStore } from '@/lib/auth-store';

export const Route = createFileRoute('/suporte')({
  head: () => ({
    meta: [
      { title: "Suporte — SHEY VIRAL" },
      { name: "description", content: "Central de suporte SHEY VIRAL: tire dúvidas, abra chamado e fale com nosso time." },
      { property: "og:title", content: "Suporte — SHEY VIRAL" },
      { property: "og:description", content: "Central de suporte SHEY VIRAL: tire dúvidas, abra chamado e fale com nosso time." },
      { property: "og:url", content: "https://sheyn8n.lovable.app/suporte" },
    ],
    links: [{ rel: "canonical", href: "https://sheyn8n.lovable.app/suporte" }],
  }),
  component: SuportePage,
});

function SuportePage() {
  const { isAuthenticated } = useAuthStore();

  const { data: page, isLoading } = useQuery({
    queryKey: ['custom-page', 'suporte'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_pages')
        .select('*')
        .eq('slug', 'suporte')
        .single();
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="relative min-h-screen w-full flex flex-col bg-[#020202] text-white selection:bg-blue-500/30 font-outfit">
      {!isAuthenticated && <LoginBackground />}
      {isAuthenticated ? <DashboardHeader /> : <PublicHeader />}

      <main className={`flex-1 relative z-20 w-full ${isAuthenticated ? 'px-5 py-10 md:p-12' : 'max-w-5xl mx-auto px-6 pt-32 pb-20'}`}>
        <div className="max-w-5xl mx-auto">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10 space-y-4"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-[0.2em]">
              <LifeBuoy className="w-3 h-3" /> Central de Suporte
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
              Como podemos <span className="text-primary">ajudar</span>?
            </h1>
            <p className="text-gray-500 max-w-2xl mx-auto text-sm md:text-base">
              Resposta rápida, time dedicado e documentação completa pra você nunca travar.
            </p>
          </motion.div>

          {/* Quick action cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
            {[
              { icon: MessageCircle, title: 'Chat ao vivo', desc: 'Resposta em minutos no horário comercial.' },
              { icon: BookOpen, title: 'Documentação', desc: 'Guias e tutoriais passo a passo.' },
              { icon: Mail, title: 'E-mail', desc: 'suporte@sheyviral.com — resposta em 24h.' },
            ].map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="rounded-2xl border border-white/10 bg-[#0A0A0A] p-6 hover:border-primary/40 transition-colors"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-wider mb-1.5">{title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#0A0A0A] border border-white/10 rounded-[28px] p-8 md:p-12 shadow-2xl"
          >
            {isLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-10 bg-white/5 rounded w-1/3" />
                <div className="h-4 bg-white/5 rounded w-full" />
                <div className="h-4 bg-white/5 rounded w-full" />
                <div className="h-4 bg-white/5 rounded w-2/3" />
              </div>
            ) : (
              <div className="prose prose-invert max-w-none">
                <h2 className="text-2xl md:text-3xl font-black mb-6">{page?.title || 'Suporte'}</h2>
                <div
                  className="text-gray-400 leading-relaxed space-y-4"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(page?.content || 'Conteúdo não encontrado.') }}
                />
              </div>
            )}
          </motion.div>
        </div>
      </main>

      {!isAuthenticated && <PublicFooter />}
    </div>
  );
}
