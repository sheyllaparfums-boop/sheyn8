import React from 'react';
import { motion } from 'framer-motion';
import { Infinity as InfinityIcon, ChevronLeft } from 'lucide-react';
import { LoginBackground } from '@/components/login/LoginBackground';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';

interface StaticPageShellProps {
  title: string;
  summary?: string;
  children: React.ReactNode;
}

export const StaticPageShell = ({ title, summary, children }: StaticPageShellProps) => {
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

          <div className="prose prose-invert max-w-none">
            <h1 className="text-4xl font-black mb-4">{title}</h1>
            {summary && (
              <p className="text-primary font-medium text-lg leading-relaxed mb-8 italic">
                {summary}
              </p>
            )}
            <div className="text-gray-400 leading-relaxed space-y-4">
              {children}
            </div>
          </div>
        </motion.div>
      </main>
      <PublicFooter />
    </div>
  );
};
