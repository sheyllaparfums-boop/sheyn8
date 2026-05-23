import { createFileRoute, Link } from "@tanstack/react-router";
import { requireAuth } from "@/lib/route-guards";
import { UserCog } from "lucide-react";
import { WorkflowCanvas } from "@/components/workflows/WorkflowCanvas";
import { useAuthStore } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/workflows")({
  beforeLoad: ({ location }) => requireAuth(location),
  head: () => ({
    meta: [
      { title: "Inteligência Viral — SHEY VIRAL" },
      { name: "description", content: "Gerencie todos os seus fluxos de automação." },
    ],
  }),
  component: WorkflowsPage,
});

function WorkflowsPage() {
  const user = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const onboardingData = useAuthStore((state) => state.user ? state.onboardingByUser[state.user.id] ?? null : null);

  if (!hasHydrated) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!onboardingData?.handle?.trim()) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-5 bg-[#111] border border-white/10 rounded-2xl p-8">
          <UserCog className="w-10 h-10 mx-auto text-[var(--primary)]" />
          <h2 className="font-rajdhani text-2xl font-bold text-white">Configure seu perfil</h2>
          <p className="text-white/60 text-sm">
            Antes de usar os workflows, salve o @ desta conta em <strong>Minha Conta</strong>. Sem esse @, nenhuma análise é iniciada.
          </p>
          <Button asChild className="bg-[var(--primary)] hover:bg-[var(--primary)]/90 w-full">
            <Link to="/user">Ir para User</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1">
        <WorkflowCanvas data={onboardingData} />
      </div>
    </div>
  );
}
