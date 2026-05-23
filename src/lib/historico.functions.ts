import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface HistoricoEntry {
  id: string;
  event_type: string;
  description: string;
  status: string;
  user_name: string | null;
  user_email: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

export const getHistorico = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      limit?: number;
      offset?: number;
      search?: string;
      status?: string;
      eventType?: string;
      userId?: string;
      userRole?: string;
      sinceIso?: string;
    }) => input ?? {},
  )
  .handler(async ({ data }) => {
    const limit = Math.min(Math.max(data.limit ?? 100, 1), 1000);
    const offset = Math.max(data.offset ?? 0, 0);

    let query = supabaseAdmin
      .from("activity_logs")
      .select(
        "id, event_type, description, status, user_name, user_email, metadata, created_at, user_id",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (data.userRole !== "CEO") {
      if (data.userId) query = query.eq("user_id", data.userId);
      else query = query.eq("user_id", "restricted");
    }

    if (data.status && data.status !== "all") query = query.eq("status", data.status);
    if (data.eventType && data.eventType !== "all") query = query.eq("event_type", data.eventType);
    if (data.sinceIso) query = query.gte("created_at", data.sinceIso);
    if (data.search) {
      const s = data.search.replace(/[%_]/g, "");
      query = query.or(
        `description.ilike.%${s}%,event_type.ilike.%${s}%,user_name.ilike.%${s}%,user_email.ilike.%${s}%`,
      );
    }

    const { data: rows, error, count } = await query;
    if (error) throw new Error(error.message);

    const { data: types } = await supabaseAdmin
      .from("activity_logs")
      .select("event_type")
      .limit(1000);
    const eventTypes = Array.from(new Set((types || []).map((t) => t.event_type))).sort();

    const normalized: HistoricoEntry[] = (rows || []).map((r) => ({
      id: r.id as string,
      event_type: r.event_type as string,
      description: r.description as string,
      status: r.status as string,
      user_name: (r.user_name as string | null) ?? null,
      user_email: (r.user_email as string | null) ?? null,
      metadata: (r.metadata as Record<string, any> | null) ?? null,
      created_at: r.created_at as string,
    }));

    return { rows: normalized, eventTypes, total: count ?? normalized.length };
  });
