import { createFileRoute } from '@tanstack/react-router';
import { StaticPageShell } from '@/components/layout/StaticPageShell';
import { Book, Zap, Workflow, Bot, Plug, Shield } from 'lucide-react';

export const Route = createFileRoute('/documentacao')({
  head: () => ({
    meta: [
      { title: 'Documentação — SHEY VIRAL' },
      { name: 'description', content: 'Documentação técnica e guias completos para usar todo o potencial da plataforma SHEY VIRAL.' },
      { property: 'og:title', content: 'Documentação — SHEY VIRAL' },
      { property: 'og:description', content: 'Documentação técnica e guias completos para usar a plataforma.' },
    ],
  }),
  component: DocsPage,
});

const sections = [
  { icon: Zap, title: 'Primeiros Passos', desc: 'Configure sua conta, conecte suas redes e crie seu primeiro projeto em minutos.' },
  { icon: Workflow, title: 'Workflows', desc: 'Crie automações visuais conectando gatilhos, ações e integrações com IA.' },
  { icon: Bot, title: 'Automações com IA', desc: 'Use Gemini, GPT e Claude para gerar roteiros, ganchos e legendas automaticamente.' },
  { icon: Plug, title: 'Integrações', desc: 'Conecte Instagram, TikTok, YouTube, WhatsApp, Google e mais de 200 ferramentas.' },
  { icon: Book, title: 'Referência de API', desc: 'Endpoints REST, autenticação e exemplos de uso para desenvolvedores.' },
  { icon: Shield, title: 'Segurança & RLS', desc: 'Como protegemos seus dados com autenticação, criptografia e políticas de acesso.' },
];

function DocsPage() {
  return (
    <StaticPageShell
      title="Documentação"
      summary="Tudo que você precisa para dominar a plataforma e levar seu conteúdo ao próximo nível."
    >
      <div className="grid sm:grid-cols-2 gap-4 not-prose">
        {sections.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 hover:border-primary/30 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-white font-bold mb-1">{s.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{s.desc}</p>
            </div>
          );
        })}
      </div>
      <p className="text-gray-500 text-sm mt-8">
        Não encontrou o que procurava? Fale com nosso time pelo <a href="/suporte" className="text-primary hover:underline">suporte</a>.
      </p>
    </StaticPageShell>
  );
}
