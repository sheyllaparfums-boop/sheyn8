import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

// Dynamic table access — supabase typed client rejects arbitrary string table names.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseAdmin = _supabaseAdmin as any;

const BACKUP_TABLES = [
  "carousels",
  "viral_hooks",
  "content_calendar",
  "competitor_analyses",
  "reel_transcriptions",
  "activity_logs",
  "api_credentials",
] as const;

export type BackupTable = (typeof BACKUP_TABLES)[number];

export interface BackupBundle {
  version: 1;
  exportedAt: string;
  tables: Record<string, unknown[]>;
  counts: Record<string, number>;
}

export const getBackupOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).handler(async () => {
  const counts: Record<string, number> = {};
  for (const t of BACKUP_TABLES) {
    const { count } = await supabaseAdmin.from(t).select("*", { count: "exact", head: true });
    counts[t] = count ?? 0;
  }
  return { tables: BACKUP_TABLES as unknown as string[], counts };
});

export const exportBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tables?: string[] }) => input ?? {})
  .handler(async ({ data }) => {
    const wanted = (data.tables && data.tables.length
      ? data.tables.filter((t) => (BACKUP_TABLES as readonly string[]).includes(t))
      : (BACKUP_TABLES as unknown as string[]));

    const bundle: BackupBundle = {
      version: 1,
      exportedAt: new Date().toISOString(),
      tables: {},
      counts: {},
    };

    for (const t of wanted) {
      const { data: rows, error } = await supabaseAdmin.from(t).select("*").limit(10000);
      if (error) throw new Error(`${t}: ${error.message}`);
      bundle.tables[t] = rows ?? [];
      bundle.counts[t] = (rows ?? []).length;
    }

    return { json: JSON.stringify(bundle) };
  });

const importSchema = z.object({
  payload: z.string().min(2).max(20_000_000),
  mode: z.enum(["merge", "replace"]).default("merge"),
  tables: z.array(z.string()).optional(),
});

export const importBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => importSchema.parse(input))
  .handler(async ({ data }) => {
    let parsed: BackupBundle;
    try {
      parsed = JSON.parse(data.payload);
    } catch {
      throw new Error("Arquivo inválido: não é JSON.");
    }
    if (!parsed || typeof parsed !== "object" || !parsed.tables) {
      throw new Error("Backup inválido: formato inesperado.");
    }

    const wantedTables = (data.tables && data.tables.length
      ? data.tables
      : Object.keys(parsed.tables)
    ).filter((t) => (BACKUP_TABLES as readonly string[]).includes(t));

    const summary: Record<string, { imported: number; replaced: boolean }> = {};

    for (const t of wantedTables) {
      const rows = (parsed.tables[t] ?? []) as Record<string, unknown>[];
      if (!Array.isArray(rows)) continue;

      if (data.mode === "replace") {
        // Use a no-op-safe predicate to delete all rows
        const { error: delErr } = await supabaseAdmin.from(t).delete().not("id", "is", null);
        if (delErr) throw new Error(`${t} (limpeza): ${delErr.message}`);
      }

      if (rows.length === 0) {
        summary[t] = { imported: 0, replaced: data.mode === "replace" };
        continue;
      }

      // upsert in chunks
      let imported = 0;
      const CHUNK = 500;
      for (let i = 0; i < rows.length; i += CHUNK) {
        const slice = rows.slice(i, i + CHUNK);
        const { error } = await supabaseAdmin
          .from(t)
          .upsert(slice as never, { onConflict: t === "api_credentials" ? "key" : "id" });
        if (error) throw new Error(`${t}: ${error.message}`);
        imported += slice.length;
      }

      summary[t] = { imported, replaced: data.mode === "replace" };
    }

    return { summary };
  });
