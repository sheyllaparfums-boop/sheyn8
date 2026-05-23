import { useEffect } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore, type UserPlan } from "@/lib/auth-store";

interface ProfileRow {
  name: string | null;
  email: string | null;
  plan: string | null;
  trial_ends_at: string | null;
  avatar_url: string | null;
  handle: string | null;
  niche: string | null;
  goal: string | null;
  validated_profile: any | null;
  onboarding_completed: boolean | null;
}

async function loadUserAndProfile(userId: string, email: string) {
  try {
    const [{ data: profile }, { data: roleRow }] = await Promise.all([
      supabase
        .from("profiles")
        .select("name, email, plan, trial_ends_at, avatar_url, handle, niche, goal, validated_profile, onboarding_completed")
        .eq("user_id", userId)
        .maybeSingle<ProfileRow>(),
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle<{ role: "CEO" | "USER" }>(),
    ]);

    const role: "CEO" | "USER" = roleRow?.role ?? "USER";
    const plan = (profile?.plan as UserPlan) ?? (role === "CEO" ? "CEO" : "TRIAL");

    useAuthStore.getState().setUser({
      id: userId,
      email: profile?.email ?? email,
      name: profile?.name ?? email.split("@")[0],
      role,
      plan,
      trialEndsAt: profile?.trial_ends_at ?? undefined,
      avatar: profile?.avatar_url ?? undefined,
    });

    if (profile?.handle) {
      useAuthStore.getState().setOnboardingData({
        handle: profile.handle,
        niche: profile.niche ?? "",
        goal: profile.goal ?? "",
        validated: !!profile.validated_profile,
        lastProfile: profile.validated_profile ?? undefined,
      });
    }
  } catch (error) {
    console.error("Falha ao carregar perfil da sessão", error);
    useAuthStore.getState().setUser({
      id: userId,
      email,
      name: email.split("@")[0] || "Usuário",
      role: "USER",
      plan: "TRIAL",
    });
  }
}

/**
 * Syncs Supabase auth session with the local zustand store.
 * Must be mounted once at the root.
 */
export function useSupabaseSessionSync(queryClient: QueryClient) {
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    let clearTimer: ReturnType<typeof setTimeout> | null = null;
    const store = useAuthStore.getState();
    store.setSessionReady(false);

    const clearLocalSession = () => {
      if (!mounted) return;
      useAuthStore.getState().logout();
      queryClient.clear();
      router.invalidate();
    };

    // Set listener FIRST to avoid races
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (session?.user) {
        if (clearTimer) {
          clearTimeout(clearTimer);
          clearTimer = null;
        }
        // Defer Supabase calls to avoid deadlock inside the callback
        setTimeout(async () => {
          if (!mounted) return;
          await loadUserAndProfile(session.user.id, session.user.email ?? "");
          if (event === "SIGNED_IN" || event === "USER_UPDATED") {
            queryClient.invalidateQueries();
            router.invalidate();
          }
        }, 0);
      } else if (event === "SIGNED_OUT") {
        if (clearTimer) clearTimeout(clearTimer);
        clearTimer = setTimeout(clearLocalSession, 250);
      }
    });

    // Then check current session
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session?.user) {
        loadUserAndProfile(data.session.user.id, data.session.user.email ?? "");
      } else {
        useAuthStore.getState().setSessionReady(true);
      }
    }).catch(() => {
      if (mounted) useAuthStore.getState().setSessionReady(true);
    });

    return () => {
      mounted = false;
      if (clearTimer) clearTimeout(clearTimer);
      subscription.unsubscribe();
    };
  }, [router, queryClient]);
}

export async function refreshProfile() {
  const { data } = await supabase.auth.getUser();
  if (data.user) {
    await loadUserAndProfile(data.user.id, data.user.email ?? "");
  }
}
