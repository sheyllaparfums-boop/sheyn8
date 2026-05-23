import { createFileRoute } from '@tanstack/react-router';
import { StaticPageShell } from '@/components/layout/StaticPageShell';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { MessageSquare, Mail } from 'lucide-react';

export const Route = createFileRoute('/central-ajuda')({
  head: () => ({
    meta: [
      { title: 'Central de Ajuda — SHEY VIRAL' },
      { name: 'description', content: 'Respostas para as dúvidas mais comuns sobre planos, automações e integrações.' },
      { property: 'og:title', content: 'Central de Ajuda — SHEY VIRAL' },
      { property: 'og:description', content: 'Respostas para as dúvidas mais comuns da plataforma.' },
    ],
  }),
  component: HelpPage,
});

const faqs = [
  { q: 'Como começo a usar a plataforma?', a: 'Crie sua conta gratuitamente, escolha um plano e siga o onboarding guiado para conectar suas redes sociais e ativar suas primeiras automações.' },
  { q: 'Posso cancelar minha assinatura a qualquer momento?', a: 'Sim. Você pode cancelar quando quiser direto nas configurações da sua conta, sem multas ou burocracia.' },
  { q: 'Quais redes sociais são suportadas?', a: 'Instagram, TikTok, YouTube, Facebook, X (Twitter), LinkedIn e WhatsApp Business, além de integrações via N8N.' },
  { q: 'Os créditos de IA expiram?', a: 'Os créditos renovam a cada ciclo mensal de cobrança. Créditos extras adquiridos avulsos não expiram.' },
  { q: 'Meus dados estão seguros?', a: 'Sim. Usamos criptografia em trânsito e em repouso, autenticação multifator e políticas RLS no banco de dados para garantir total privacidade.' },
  { q: 'Existe plano gratuito?', a: 'Oferecemos um período de teste para você explorar a plataforma. Veja todos os detalhes na página de Planos.' },
];

function HelpPage() {
  return (
    <StaticPageShell
      title="Central de Ajuda"
      summary="Encontre respostas rápidas ou fale com nosso time quando precisar."
    >
      <Accordion type="single" collapsible className="not-prose">
        {faqs.map((faq, i) => (
          <AccordionItem key={i} value={`item-${i}`} className="border-white/5">
            <AccordionTrigger className="text-white text-left hover:no-underline hover:text-primary">
              {faq.q}
            </AccordionTrigger>
            <AccordionContent className="text-gray-400 leading-relaxed">
              {faq.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <div className="not-prose grid sm:grid-cols-2 gap-4 mt-10">
        <a href="/suporte" className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 hover:border-primary/30 transition-colors flex items-center gap-4">
          <MessageSquare className="w-6 h-6 text-primary" />
          <div>
            <div className="text-white font-bold">Falar com Suporte</div>
            <div className="text-gray-500 text-sm">Time pronto pra te atender</div>
          </div>
        </a>
        <a href="mailto:contato@sheyviral.com" className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 hover:border-primary/30 transition-colors flex items-center gap-4">
          <Mail className="w-6 h-6 text-primary" />
          <div>
            <div className="text-white font-bold">Enviar E-mail</div>
            <div className="text-gray-500 text-sm">contato@sheyviral.com</div>
          </div>
        </a>
      </div>
    </StaticPageShell>
  );
}
