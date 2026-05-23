import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type AlertSeverity = "critical" | "warning" | "info" | "success";

export interface SmartAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  href?: string;
  cta?: string;
  category: "credenciais" | "atividade" | "conteudo" | "agenda" | "sistema";
  createdAt: string;
}

function iso(d: Date) { return d.toISOString(); }

export const getSmartAlerts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).handler(async () => {
  const alerts: SmartAlert[] = [];
  const now = new Date();

  // 1. API credentials
  const { data: creds } = await supabaseAdmin
    .from("api_credentials")
    .select("key, status, message, last_validated_at");

  const invalid = (creds || []).filter((c) => c.status === "invalid");
  const untested = (creds || []).filter((c) => c.status !== "valid" && c.status !== "invalid");

  if (invalid.length > 0) {
    alerts.push({
      id: `cred-invalid-${invalid.map((c) => c.key).join("_")}`,
      severity: "critical",
      title: `${invalid.length} credencial(is) com falha`,
      description: invalid.map((c) => c.key).join(", "),
      href: "/integracoes",
      cta: "Corrigir agora",
      category: "credenciais",
      createdAt: iso(now),
    });
  }
  if (untested.length > 0) {
    alerts.push({
      id: `cred-untested-${untested.map((c) => c.key).join("_")}`,
      severity: "warning",
      title: `${untested.length} credencial(is) não validada(s)`,
      description: untested.map((c) => c.key).join(", "),
      href: "/integracoes",
      cta: "Validar",
      category: "credenciais",
      createdAt: iso(now),
    });
  }

  // 2. Recent errors in activity (last 24h)
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const { data: errLogs } = await supabaseAdmin
    .from("activity_logs")
    .select("id, description, created_at, status")
    .eq("status", "error")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(20);

  if (errLogs && errLogs.length > 0) {
    alerts.push({
      id: `errors-24h-${errLogs.length}`,
      severity: errLogs.length >= 5 ? "critical" : "warning",
      title: `${errLogs.length} erro(s) nas últimas 24h`,
      description: errLogs[0].description?.slice(0, 120) || "Verifique o histórico",
      href: "/execucoes",
      cta: "Ver histórico",
      category: "atividade",
      createdAt: iso(now),
    });
  }

  // 3. Calendar items scheduled but still rascunho and overdue
  const { data: cal } = await supabaseAdmin
    .from("content_calendar")
    .select("id, title, scheduled_at, status")
    .lt("scheduled_at", iso(now))
    .eq("status", "rascunho")
    .limit(10);

  if (cal && cal.length > 0) {
    alerts.push({
      id: `cal-overdue-${cal.length}`,
      severity: "warning",
      title: `${cal.length} post(s) atrasado(s) no calendário`,
      description: cal.slice(0, 3).map((c) => c.title).join(" · "),
      href: "/calendario",
      cta: "Abrir calendário",
      category: "agenda",
      createdAt: iso(now),
    });
  }

  // 4. Upcoming posts in next 24h
  const next24 = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const { data: upcoming } = await supabaseAdmin
    .from("content_calendar")
    .select("id, title, scheduled_at")
    .gte("scheduled_at", iso(now))
    .lte("scheduled_at", next24)
    .neq("status", "publicado")
    .limit(10);

  if (upcoming && upcoming.length > 0) {
    alerts.push({
      id: `cal-upcoming-${upcoming.length}`,
      severity: "info",
      title: `${upcoming.length} post(s) nas próximas 24h`,
      description: upcoming.slice(0, 3).map((c) => c.title).join(" · "),
      href: "/calendario",
      cta: "Revisar",
      category: "agenda",
      createdAt: iso(now),
    });
  }

  // 5. Reel transcriptions with error/pending > 10min
  const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
  const { data: reels } = await supabaseAdmin
    .from("reel_transcriptions")
    .select("id, status, error, created_at, reel_url")
    .or(`status.eq.error,and(status.eq.pending,created_at.lt.${tenMinAgo})`)
    .order("created_at", { ascending: false })
    .limit(10);

  if (reels && reels.length > 0) {
    const errored = reels.filter((r) => r.status === "error");
    if (errored.length > 0) {
      alerts.push({
        id: `reel-error-${errored.length}`,
        severity: "warning",
        title: `${errored.length} transcrição(ões) com erro`,
        description: errored[0].error?.slice(0, 120) || "Reprocesse o link",
        href: "/transcricao",
        cta: "Abrir",
        category: "conteudo",
        createdAt: iso(now),
      });
    }
    const stuck = reels.filter((r) => r.status === "pending");
    if (stuck.length > 0) {
      alerts.push({
        id: `reel-stuck-${stuck.length}`,
        severity: "warning",
        title: `${stuck.length} transcrição(ões) travada(s)`,
        description: "Processamento acima de 10 minutos",
        href: "/transcricao",
        cta: "Abrir",
        category: "conteudo",
        createdAt: iso(now),
      });
    }
  }

  // 6. Empty hooks library hint
  const { count: hookCount } = await supabaseAdmin
    .from("viral_hooks")
    .select("id", { count: "exact", head: true });
  if ((hookCount ?? 0) === 0) {
    alerts.push({
      id: `hooks-empty`,
      severity: "info",
      title: "Biblioteca de ganchos vazia",
      description: "Adicione seus primeiros ganchos para acelerar a criação.",
      href: "/ganchos",
      cta: "Adicionar",
      category: "conteudo",
      createdAt: iso(now),
    });
  }

  // Sort: critical > warning > info > success
  const rank: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2, success: 3 };
  alerts.sort((a, b) => rank[a.severity] - rank[b.severity]);

  return {
    alerts,
    counts: {
      total: alerts.length,
      critical: alerts.filter((a) => a.severity === "critical").length,
      warning: alerts.filter((a) => a.severity === "warning").length,
      info: alerts.filter((a) => a.severity === "info").length,
    },
  };
});
