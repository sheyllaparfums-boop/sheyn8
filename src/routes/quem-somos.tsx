import { createFileRoute } from '@tanstack/react-router';
import DOMPurify from "isomorphic-dompurify";
import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { LoginBackground } from '@/components/login/LoginBackground';
import { motion } from 'framer-motion';
import { Infinity as InfinityIcon, ChevronLeft } from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';

export const Route = createFileRoute('/quem-somos')({
  head: () => ({
    meta: [
      { title: "Quem Somos — SHEY VIRAL" },
      { name: "description", content: "A história, missão e visão por trás da SHEY VIRAL — inteligência viral para criadores." },
      { property: "og:title", content: "Quem Somos — SHEY VIRAL" },
      { property: "og:description", content: "A história, missão e visão por trás da SHEY VIRAL — inteligência viral para criadores." },
      { property: "og:url", content: "https://sheyn8n.lovable.app/quem-somos" },
    ],
    links: [{ rel: "canonical", href: "https://sheyn8n.lovable.app/quem-somos" }],
  }),
  component: QuemSomosPage,
});

function QuemSomosPage() {
  const { data: page, isLoading } = useQuery({
    queryKey: ['custom-page', 'quem-somos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_pages')
        .select('*')
        .eq('slug', 'quem-somos')
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="relative min-h-screen w-full flex flex-col bg-[#020202] text-white selection:bg-blue-500/30 font-outfit">
      <LoginBackground />
      <PublicHeader />
      
      <main className="flex-1 relative z-20 max-w-4xl mx-auto px-6 pt-32 pb-20 w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0A0A0A] border border-white/5 rounded-[32px] p-8 md:p-12 shadow-2xl"
        >
          <div className="flex items-center justify-between mb-12">
            <a href="/login" className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors">
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm font-bold uppercase tracking-wider">Voltar</span>
            </a>
            <div className="flex items-center gap-3">
              <InfinityIcon className="w-6 h-6 text-primary" />
              <span className="text-xl font-bold tracking-tight uppercase">SHEY <span className="text-primary">N8N</span></span>
            </div>
          </div>

          {isLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-10 bg-white/5 rounded w-1/3" />
              <div className="h-4 bg-white/5 rounded w-full" />
              <div className="h-4 bg-white/5 rounded w-full" />
              <div className="h-4 bg-white/5 rounded w-2/3" />
            </div>
          ) : (
            <div className="prose prose-invert max-w-none">
              <h1 className="text-4xl font-black mb-4">{page?.title || 'Quem Somos'}</h1>
              {page?.summary && (
                <p className="text-primary font-medium text-lg leading-relaxed mb-8 italic">
                  {page.summary}
                </p>
              )}
              <div 
                className="text-gray-400 leading-relaxed space-y-4"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(page?.content || 'Conteúdo não encontrado.') }} 
              />
            </div>
          )}
        </motion.div>
      </main>
      <PublicFooter />
    </div>
  );
}
