import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/auth-store";

/**
 * Use inside a route `beforeLoad` to require an authenticated user.
 * Redirects to `/login?action=login&redirect=<current-url>` when there is no session.
 *
 * IMPORTANT: Right after `signInWithPassword`, there is a brief window where
 * the Supabase in-memory session exists but `getSession()` (which awaits
 * storage hydration) can momentarily return null on a fresh client-side
 * navigation. If the auth store already has a `user`, we trust it and let
 * the root effect handle any further routing — this prevents the post-login
 * bounce back to /login.
 */
export async function requireAuth(location: { href: string }) {
  // Route beforeLoad also runs during SSR. The user's session lives in the
  // browser storage, so the server cannot reliably know it here; redirecting
  // on the server causes a false /admin → /login bounce right after login.
  if (typeof window === "undefined") return;

  // Trust the in-memory store first (covers the post-login race)
  const storeState = useAuthStore.getState();
  if (storeState.user && storeState.isAuthenticated) return;

  const { data } = await supabase.auth.getSession();
  if (data.session) return;

  // Still no session and store empty → not authenticated
  throw redirect({
    to: "/login",
    search: { action: "login", redirect: location.href },
  });
}
