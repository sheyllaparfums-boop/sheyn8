import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { generateText, Output } from "ai";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createLovableAiGatewayProvider } from "./ai-gateway";

const ChecklistItem = z.object({
  text: z.string().min(1).max(200),
  done: z.boolean().default(false),
});
const Attachment = z.object({
  label: z.string().min(1).max(120),
  url: z.string().url().max(1000),
});

const EntrySchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  content_type: z.enum(["reel", "post", "carrossel", "story", "short"]).default("reel"),
  platform: z.enum(["instagram", "tiktok", "youtube", "twitter", "linkedin"]).default("instagram"),
  scheduled_at: z.string(),
  status: z.enum(["rascunho", "agendado", "publicado", "atrasado"]).default("rascunho"),
  notes: z.string().max(2000).optional().nullable(),
  color: z.string().max(20).optional().nullable(),
  recurrence: z.enum(["none", "daily", "weekly", "monthly"]).default("none"),
  recurrence_until: z.string().optional().nullable(),
  checklist: z.array(ChecklistItem).max(30).default([]),
  attachments: z.array(Attachment).max(20).default([]),
  reminder_minutes: z.number().int().min(0).max(10080).optional().nullable(),
  hook: z.string().max(500).optional().nullable(),
  source: z.string().max(40).optional().nullable(),
});

export const listCalendarEntries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth]).handler(async () => {
  // auto-mark atrasado: agendado + scheduled_at < now()
  await supabaseAdmin
    .from("content_calendar")
    .update({ status: "atrasado" })
    .eq("status", "agendado")
    .lt("scheduled_at", new Date().toISOString());

  const { data, error } = await supabaseAdmin
    .from("content_calendar")
    .select("*")
    .order("scheduled_at", { ascending: true });
  if (error) return { ok: false as const, error: error.message, entries: [] };
  return { ok: true as const, entries: data ?? [] };
});

export const upsertCalendarEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => EntrySchema.parse(input))
  .handler(async ({ data }) => {
    const payload = {
      title: data.title,
      content_type: data.content_type,
      platform: data.platform,
      scheduled_at: data.scheduled_at,
      status: data.status,
      notes: data.notes ?? null,
      color: data.color ?? "#8b5cf6",
      recurrence: data.recurrence,
      recurrence_until: data.recurrence_until ?? null,
      checklist: data.checklist,
      attachments: data.attachments,
      reminder_minutes: data.reminder_minutes ?? null,
      hook: data.hook ?? null,
      source: data.source ?? null,
    };

    if (data.id) {
      const { error } = await supabaseAdmin
        .from("content_calendar")
        .update(payload)
        .eq("id", data.id);
      if (error) return { ok: false as const, error: error.message };
      return { ok: true as const };
    }

    // Expand recurrence on insert
    const rows: typeof payload[] = [payload];
    if (data.recurrence !== "none" && data.recurrence_until) {
      const start = new Date(data.scheduled_at);
      const until = new Date(data.recurrence_until);
      const cur = new Date(start);
      while (true) {
        if (data.recurrence === "daily") cur.setDate(cur.getDate() + 1);
        else if (data.recurrence === "weekly") cur.setDate(cur.getDate() + 7);
        else if (data.recurrence === "monthly") cur.setMonth(cur.getMonth() + 1);
        if (cur > until || rows.length > 120) break;
        rows.push({ ...payload, scheduled_at: cur.toISOString() });
      }
    }
    const { error } = await supabaseAdmin.from("content_calendar").insert(rows);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, count: rows.length };
  });

export const deleteCalendarEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("content_calendar").delete().eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const rescheduleCalendarEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), scheduled_at: z.string() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("content_calendar")
      .update({ scheduled_at: data.scheduled_at, status: "agendado" })
      .eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

// ============ AI: sugerir melhor horário ============
export const suggestBestTime = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      platform: z.string().max(40),
      content_type: z.string().max(40),
      niche: z.string().max(80).default("geral"),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { ok: false as const, error: "LOVABLE_API_KEY ausente" };
    try {
      const model = createLovableAiGatewayProvider(key)("google/gemini-3-flash-preview");
      const { experimental_output } = await generateText({
        model,
        prompt: `Sugira os 3 MELHORES horários (BR, fuso UTC-3) para postar ${data.content_type} no ${data.platform} para o nicho "${data.niche}".
Use dados públicos de engajamento. Explique brevemente cada um.`,
        experimental_output: Output.object({
          schema: z.object({
            suggestions: z.array(z.object({
              weekday: z.enum(["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"]),
              time: z.string().regex(/^\d{2}:\d{2}$/),
              reason: z.string().max(140),
            })).min(1).max(3),
          }),
        }),
      });
      return { ok: true as const, ...experimental_output };
    } catch (e: any) {
      return { ok: false as const, error: e?.message || "Erro IA" };
    }
  });

// ============ AI: planejar semana ============
export const planWeekAI = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      niche: z.string().max(80).default("geral"),
      platform: z.enum(["instagram", "tiktok", "youtube", "twitter", "linkedin"]).default("instagram"),
      start_date: z.string(),
      save: z.boolean().default(false),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { ok: false as const, error: "LOVABLE_API_KEY ausente", plan: [] };
    try {
      const model = createLovableAiGatewayProvider(key)("google/gemini-3-flash-preview");
      const { experimental_output } = await generateText({
        model,
        prompt: `Monte um plano de conteúdo de 7 dias (segunda a domingo) para ${data.platform}, nicho "${data.niche}".
Variar: educativo, viral/gancho forte, bastidor, prova social, polêmica, lista, CTA.
Cada dia: título curto, tipo (reel/post/carrossel/story/short), horário sugerido HH:MM (BR), e 1 gancho.`,
        experimental_output: Output.object({
          schema: z.object({
            days: z.array(z.object({
              dayOffset: z.number().int().min(0).max(6),
              title: z.string().max(120),
              content_type: z.enum(["reel", "post", "carrossel", "story", "short"]),
              time: z.string().regex(/^\d{2}:\d{2}$/),
              hook: z.string().max(200),
            })).length(7),
          }),
        }),
      });

      const start = new Date(data.start_date);
      const rows = experimental_output.days.map((d) => {
        const when = new Date(start);
        when.setDate(when.getDate() + d.dayOffset);
        const [h, m] = d.time.split(":").map(Number);
        when.setHours(h, m, 0, 0);
        return {
          title: d.title,
          content_type: d.content_type,
          platform: data.platform,
          scheduled_at: when.toISOString(),
          status: "agendado",
          color: "#8b5cf6",
          hook: d.hook,
          source: "ai-plan",
          checklist: [
            { text: "Roteiro", done: false },
            { text: "Gravar", done: false },
            { text: "Editar", done: false },
            { text: "Legenda + hashtags", done: false },
          ],
        };
      });

      if (data.save) {
        const { error } = await supabaseAdmin.from("content_calendar").insert(rows);
        if (error) return { ok: false as const, error: error.message, plan: [] };
      }
      return { ok: true as const, plan: rows };
    } catch (e: any) {
      return { ok: false as const, error: e?.message || "Erro IA", plan: [] };
    }
  });
