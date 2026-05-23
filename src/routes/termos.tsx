import { createFileRoute } from '@tanstack/react-router';
import { StaticPageShell } from '@/components/layout/StaticPageShell';

export const Route = createFileRoute('/termos')({
  head: () => ({
    meta: [
      { title: 'Termos de Uso — SHEY VIRAL' },
      { name: 'description', content: 'Termos e condições de uso da plataforma SHEY VIRAL.' },
      { property: 'og:title', content: 'Termos de Uso — SHEY VIRAL' },
      { property: 'og:description', content: 'Termos e condições de uso da plataforma SHEY VIRAL.' },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <StaticPageShell
      title="Termos de Uso"
      summary="Última atualização: 23 de maio de 2026"
    >
      <h2 className="text-white text-xl font-bold mt-6">1. Aceitação dos Termos</h2>
      <p>Ao acessar e usar a SHEY VIRAL, você concorda em cumprir estes Termos de Uso. Se não concordar com qualquer parte, não utilize a plataforma.</p>

      <h2 className="text-white text-xl font-bold mt-6">2. Cadastro e Conta</h2>
      <p>Você é responsável por manter a confidencialidade da sua conta e senha, e por todas as atividades realizadas sob sua conta. Notifique-nos imediatamente sobre qualquer uso não autorizado.</p>

      <h2 className="text-white text-xl font-bold mt-6">3. Uso Permitido</h2>
      <p>Você concorda em usar a plataforma apenas para fins legais e de acordo com estes termos. É proibido usar a SHEY VIRAL para enviar spam, conteúdo ilegal, ofensivo ou que viole direitos de terceiros.</p>

      <h2 className="text-white text-xl font-bold mt-6">4. Propriedade Intelectual</h2>
      <p>Todo o conteúdo, marcas, logos e tecnologia da plataforma são de propriedade da SHEY VIRAL ou licenciados a ela. O conteúdo gerado por você permanece seu, mas você nos concede licença para processá-lo conforme necessário para prestar o serviço.</p>

      <h2 className="text-white text-xl font-bold mt-6">5. Pagamentos e Assinaturas</h2>
      <p>Os planos pagos são cobrados de forma recorrente conforme o ciclo escolhido. Você pode cancelar a qualquer momento — o cancelamento é efetivado no fim do período já pago.</p>

      <h2 className="text-white text-xl font-bold mt-6">6. Limitação de Responsabilidade</h2>
      <p>A SHEY VIRAL é fornecida "como está". Não nos responsabilizamos por danos indiretos, perda de lucros ou indisponibilidades de terceiros (APIs de redes sociais, provedores de IA, etc.).</p>

      <h2 className="text-white text-xl font-bold mt-6">7. Encerramento</h2>
      <p>Podemos suspender ou encerrar sua conta caso identifiquemos violação destes termos, mediante notificação prévia quando aplicável.</p>

      <h2 className="text-white text-xl font-bold mt-6">8. Alterações</h2>
      <p>Podemos atualizar estes termos a qualquer momento. Alterações relevantes serão comunicadas por e-mail ou notificação na plataforma.</p>

      <h2 className="text-white text-xl font-bold mt-6">9. Contato</h2>
      <p>Dúvidas sobre estes termos? Fale conosco em <a href="mailto:contato@sheyviral.com" className="text-primary hover:underline">contato@sheyviral.com</a>.</p>
    </StaticPageShell>
  );
}
