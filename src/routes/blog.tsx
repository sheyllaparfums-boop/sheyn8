import { createFileRoute } from '@tanstack/react-router';
import { StaticPageShell } from '@/components/layout/StaticPageShell';
import { Calendar, ArrowRight } from 'lucide-react';

export const Route = createFileRoute('/blog')({
  head: () => ({
    meta: [
      { title: 'Blog — SHEY VIRAL' },
      { name: 'description', content: 'Insights, tutoriais e novidades sobre automação, IA e criação de conteúdo viral.' },
      { property: 'og:title', content: 'Blog — SHEY VIRAL' },
      { property: 'og:description', content: 'Insights, tutoriais e novidades sobre automação, IA e criação de conteúdo viral.' },
    ],
  }),
  component: BlogPage,
});

const posts = [
  {
    date: '20 Mai 2026',
    title: 'Como usar IA para escalar seu conteúdo em 2026',
    excerpt: 'Um guia prático sobre os fluxos de automação que estão transformando criadores em estúdios completos.',
    tag: 'IA & Automação',
  },
  {
    date: '12 Mai 2026',
    title: 'Os 7 ganchos virais mais usados pelos top criadores',
    excerpt: 'Analisamos centenas de vídeos virais para identificar os padrões de gancho que retêm a atenção.',
    tag: 'Estratégia',
  },
  {
    date: '03 Mai 2026',
    title: 'Workflows N8N essenciais para criadores de conteúdo',
    excerpt: 'Templates prontos para integrar suas redes sociais, CRM e ferramentas de IA em um só lugar.',
    tag: 'Tutoriais',
  },
];

function BlogPage() {
  return (
    <StaticPageShell
      title="Blog"
      summary="Insights, tutoriais e bastidores da inteligência viral aplicada a criadores."
    >
      <div className="grid gap-6 not-prose">
        {posts.map((post, i) => (
          <article
            key={i}
            className="group bg-white/[0.02] border border-white/5 rounded-2xl p-6 hover:border-primary/30 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
              <span className="px-2 py-1 bg-primary/10 text-primary rounded-md font-medium">{post.tag}</span>
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{post.date}</span>
            </div>
            <h2 className="text-xl font-bold text-white mb-2 group-hover:text-primary transition-colors">{post.title}</h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-3">{post.excerpt}</p>
            <span className="text-primary text-sm font-medium inline-flex items-center gap-1">
              Ler mais <ArrowRight className="w-4 h-4" />
            </span>
          </article>
        ))}
      </div>
      <p className="text-center text-gray-600 text-sm mt-10">Mais conteúdos em breve.</p>
    </StaticPageShell>
  );
}
