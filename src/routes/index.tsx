import { createFileRoute } from "@tanstack/react-router";
import { DashboardHeader } from "@/components/dashboard/Header";
import { RealMetrics } from "@/components/dashboard/RealMetrics";
import { PerformanceMetrics } from "@/components/dashboard/PerformanceMetrics";
import { ApiCredentialsTable } from "@/components/dashboard/ApiCredentialsTable";
import { ActivityLog } from "@/components/dashboard/ActivityLog";
import { ClientDashboard } from "@/components/dashboard/ClientDashboard";
import { CriticalStatusAlert } from "@/components/dashboard/CriticalStatusAlert";
import { useAuthStore } from "@/lib/auth-store";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — SHEY N8N" },
      { name: "description", content: "Visão geral em tempo real das suas integrações e performance de conteúdo." },
      { property: "og:title", content: "Dashboard — SHEY N8N" },
      { property: "og:description", content: "Visão geral em tempo real das suas integrações e performance de conteúdo." },
      { property: "og:image", content: "https://sheyn8n.lovable.app/og-image.jpg" },
      { property: "og:url", content: "https://sheyn8n.lovable.app/" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://sheyn8n.lovable.app/og-image.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://sheyn8n.lovable.app/" }],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user, previewAsClient } = useAuthStore();
  const isCEO = user?.role === 'CEO' && !previewAsClient;


  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      <div className="flex-1 space-y-8 px-4 py-6 md:px-8 md:py-8">
        {isCEO ? (
          <div className="space-y-10">
            <CriticalStatusAlert />
            <RealMetrics />
            
            <ActivityLog />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              <div className="lg:col-span-3 space-y-8">
                <PerformanceMetrics />
                <ApiCredentialsTable />
              </div>
            </div>
          </div>
        ) : (
          <ClientDashboard />
        )}
      </div>
    </div>
  );
}

