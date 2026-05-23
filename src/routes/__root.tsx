import React from "react"; 
import { MessageSquare } from "lucide-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileBottomNav } from "@/components/mobile-nav";

import { Toaster } from "sonner";
import { useAuthStore } from "@/lib/auth-store";
import { useSupabaseSessionSync } from "@/lib/use-supabase-session";
import { useLocation } from "@tanstack/react-router";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold text-primary text-glow">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe ou foi movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Ir para o início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">Algo deu errado</h1>
        <p className="mt-2 text-sm text-muted-foreground">Tente novamente em alguns instantes.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SHEY VIRAL — Inteligência Viral Ilimitada" },
      { name: "description", content: "Dashboard de automações n8n: monitore execuções, workflows e tempo economizado em tempo real." },
      { name: "author", content: "SHEY VIRAL" },
      { property: "og:title", content: "SHEY VIRAL — Inteligência Viral Ilimitada" },
      { property: "og:description", content: "Dashboard de automações n8n: monitore execuções, workflows e tempo economizado em tempo real." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "theme-color", content: "#FF6B00" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "twitter:title", content: "SHEY VIRAL — Inteligência Viral Ilimitada" },
      { name: "twitter:description", content: "Dashboard de automações n8n: monitore execuções, workflows e tempo economizado em tempo real." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/RpcqQmwGEVMMaOV8YRfRqux3Nkt1/social-images/social-1779152393078-9ZbRJwHGFiYtKD0KD5CREa8G1wIuGSkUo1TokHoQ8ANcrSXI9yxeOfSoiMh3r6bPcxCl5SACXk4lrPSy3Y7gSEGTsUhQvKw4RAMoT7Zt_aPJcgZQrb6r1tCW67eIVjI6rKDACRvi-dkMxL2b14Mjhx8RJCSGY1PCIdfSXtn1CkCuvIaB92pMx1p6A88aMa3-.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/RpcqQmwGEVMMaOV8YRfRqux3Nkt1/social-images/social-1779152393078-9ZbRJwHGFiYtKD0KD5CREa8G1wIuGSkUo1TokHoQ8ANcrSXI9yxeOfSoiMh3r6bPcxCl5SACXk4lrPSy3Y7gSEGTsUhQvKw4RAMoT7Zt_aPJcgZQrb6r1tCW67eIVjI6rKDACRvi-dkMxL2b14Mjhx8RJCSGY1PCIdfSXtn1CkCuvIaB92pMx1p6A88aMa3-.webp" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=Rajdhani:wght@600;700&family=Outfit:wght@400;500;600&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              window.__sheyPwaInstallPrompt = null;
              window.addEventListener('beforeinstallprompt', function(e) {
                e.preventDefault();
                window.__sheyPwaInstallPrompt = e;
                window.dispatchEvent(new Event('shey-pwa-install-ready'));
              });
              if (!('serviceWorker' in navigator)) return;
              var inIframe = false;
              try { inIframe = window.self !== window.top; } catch(e) { inIframe = true; }
              var host = window.location.hostname;
              var isPreview = host.indexOf('id-preview--') !== -1 || host.indexOf('lovableproject.com') !== -1;
              if (inIframe || isPreview) {
                navigator.serviceWorker.getRegistrations().then(function(rs){ rs.forEach(function(r){ r.unregister(); }); });
                return;
              }
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js', { scope: '/' })
                  .then(function(reg){ console.log('SW registered', reg.scope); })
                  .catch(function(err){ console.error('SW registration failed', err); });
              });
            })();
          `
        }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useSupabaseSessionSync(queryClient);
  const { pathname } = useLocation();
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const sessionReady = useAuthStore((state) => state.sessionReady);
  const user = useAuthStore((state) => state.user);
  const profileHandle = useAuthStore((state) => state.user ? state.onboardingByUser[state.user.id]?.handle ?? "" : "");
  const isLoginPage = pathname === "/login";
  const isUserPage = pathname === "/user";
  const isAdminPage = pathname === "/admin";
  const publicPages = ["/login", "/planos", "/quem-somos", "/ecosistema", "/suporte"];
  const isPublicRoute = publicPages.includes(pathname);
  const isPublicPage = isPublicRoute && !isAuthenticated;
  const usePublicShell = isLoginPage || isPublicPage;

  // Trial expirado: força ida pra /planos (CEO nunca bloqueia)
  const trialExpired = !!(user && user.plan === 'TRIAL' && user.trialEndsAt && new Date(user.trialEndsAt).getTime() < Date.now());

  React.useEffect(() => {
    if (!hasHydrated || !sessionReady) return;

    if (!isAuthenticated && !isPublicPage) {
      router.navigate({ to: "/login" });
      return;
    }
    if (isAuthenticated && !profileHandle && !isUserPage && !isPublicRoute && !isAdminPage) {
      router.navigate({ to: "/user" });
      return;
    }
    if (isAuthenticated && trialExpired && pathname !== "/planos" && pathname !== "/user") {
      router.navigate({ to: "/planos" });
    }
  }, [hasHydrated, sessionReady, isAuthenticated, isLoginPage, isUserPage, isAdminPage, profileHandle, router, isPublicPage, trialExpired, pathname, isPublicRoute]);

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster
        position="bottom-center"
        duration={3500}
        theme="dark"
        toastOptions={{
          style: {
            background: "#1A1A1A",
            color: "#FFFFFF",
            borderRadius: "12px",
            padding: "14px 22px",
            border: "1px solid #2A2A2A",
          },
        }}
      />
      <SidebarProvider defaultOpen={false}>
        {usePublicShell ? (
          <div className="relative w-full h-full min-h-screen">
            <Outlet />
          </div>
        ) : (
          <div className="flex min-h-screen w-full bg-background">
            <AppSidebar />
            <main className="flex-1 min-w-0 relative p-3 sm:p-5 md:p-8 lg:p-10">
              <SidebarTrigger className="fixed top-3 left-3 z-50 h-10 w-10 rounded-xl border border-[#2A2A2A] bg-[#111111]/95 text-white shadow-lg hover:bg-[#1a1a1a] md:top-4 md:left-4" />
              <Outlet />
            </main>
          </div>
        )}
      </SidebarProvider>
    </QueryClientProvider>
  );
}
