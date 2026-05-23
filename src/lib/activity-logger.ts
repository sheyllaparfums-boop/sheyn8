import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/auth-store";

export type EventType = "login" | "logout" | "action" | "error";
export type EventStatus = "info" | "success" | "warning" | "error";

const SESSION_KEY = "shey-activity-session";

function getOrCreateSessionId(): string {
  try {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = `s_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return `s_${Date.now()}`;
  }
}

export function clearSessionId() {
  try { sessionStorage.removeItem(SESSION_KEY); } catch {}
}

interface LogInput {
  event_type: EventType;
  description: string;
  status?: EventStatus;
  metadata?: Record<string, any>;
}

export async function logActivity(input: LogInput) {
  try {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return; // Only log when authenticated (RLS requires it)
    const user = useAuthStore.getState().user;
    await supabase.from("activity_logs").insert({
      user_id: authUser.id,
      auth_user_id: authUser.id,
      user_name: user?.name ?? authUser.email ?? null,
      user_email: authUser.email ?? null,
      session_id: getOrCreateSessionId(),
      event_type: input.event_type,
      description: input.description,
      status: input.status ?? "info",
      metadata: input.metadata ?? {},
    });
  } catch (e) {
    console.warn("[activity-logger] falha ao registrar:", e);
  }
}
