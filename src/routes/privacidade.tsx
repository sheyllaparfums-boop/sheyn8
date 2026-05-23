import { createFileRoute } from '@tanstack/react-router';
import { StaticPageShell } from '@/components/layout/StaticPageShell';

export const Route = createFileRoute('/privacidade')({
  head: () => ({
    meta: [
      { title: 'Política de Privacidade — SHEY VIRAL' },
      { name: 'description', content: 'Como a SHEY VIRAL coleta, usa e protege seus dados pessoais.' },
      { property: 'og:title', content: 'Política de Privacidade — SHEY VIRAL' },
      { property: 'og:description', content: 'Como a SHEY VIRAL coleta, usa e protege seus dados pessoais.' },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <StaticPageShell
      title="Política de Privacidade"
      summary="Última atualização: 23 de maio de 2026 — em conformidade com a LGPD."
    >
      <h2 className="text-white text-xl font-bold mt-6">1. Dados que Coletamos</h2>
      <p>Coletamos informações que você nos fornece (nome, e-mail, telefone, dados de pagamento), dados de uso da plataforma (logs, métricas, interações) e dados de redes sociais conectadas via OAuth.</p>

      <h2 className="text-white text-xl font-bold mt-6">2. Como Usamos seus Dados</h2>
      <ul className="list-disc pl-6 space-y-2">
        <li>Para prestar e melhorar nossos serviços</li>
        <li>Para processar pagamentos e gerenciar assinaturas</li>
        <li>Para enviar comunicações importantes sobre sua conta</li>
        <li>Para personalizar sua experiência e recomendações</li>
        <li>Para cumprir obrigações legais</li>
      </ul>

      <h2 className="text-white text-xl font-bold mt-6">3. Compartilhamento</h2>
      <p>Não vendemos seus dados. Compartilhamos apenas com processadores essenciais (pagamentos, hospedagem, e-mail) e quando exigido por lei.</p>

      <h2 className="text-white text-xl font-bold mt-6">4. Segurança</h2>
      <p>Aplicamos criptografia em trânsito (TLS) e em repouso, autenticação multifator, políticas de acesso por linha (RLS) e auditoria contínua para proteger suas informações.</p>

      <h2 className="text-white text-xl font-bold mt-6">5. Seus Direitos (LGPD)</h2>
      <p>Você tem direito de acessar, corrigir, exportar, anonimizar ou excluir seus dados a qualquer momento. Para exercer esses direitos, envie um e-mail para <a href="mailto:privacidade@sheyviral.com" className="text-primary hover:underline">privacidade@sheyviral.com</a>.</p>

      <h2 className="text-white text-xl font-bold mt-6">6. Cookies</h2>
      <p>Usamos cookies essenciais para autenticação e cookies analíticos para entender o uso da plataforma. Você pode gerenciar preferências no seu navegador.</p>

      <h2 className="text-white text-xl font-bold mt-6">7. Retenção</h2>
      <p>Mantemos seus dados pelo tempo necessário para prestar o serviço e cumprir obrigações legais. Após o encerramento da conta, dados pessoais são excluídos ou anonimizados em até 90 dias.</p>

      <h2 className="text-white text-xl font-bold mt-6">8. Contato do Encarregado (DPO)</h2>
      <p>Para qualquer questão sobre privacidade: <a href="mailto:privacidade@sheyviral.com" className="text-primary hover:underline">privacidade@sheyviral.com</a>.</p>
    </StaticPageShell>
  );
}
