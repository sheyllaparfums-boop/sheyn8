import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { LayoutGrid, Sparkles, Mic, Users, TrendingUp, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/auth-store";

type Kpi = {
  label: string;
  value: number;
  delta7d: number;
  icon: typeof LayoutGrid;
  to: string;
  color: string;
};

async function countTable(table: string, userId: string, since?: string) {
  let q = supabase
    .from(table as any)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (since) q = q.gte("created_at", since);
  const { count } = await q;
  return count ?? 0;
}

export function ClientKpiBar() {
  const { user } = useAuthStore();
  const [kpis, setKpis] = useState<Kpi[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [sparkline, setSparkline] = useState<number[]>([]);

  const load = async () => {
    if (!user?.id) return;
    setLoading(true);
    const since = new Date(Date.now() - 7 * 86400_000).toISOString();
    const [carT, carD, hookT, hookD, scribeT, scribeD, compT, compD] = await Promise.all([
      countTable("carousels", user.id),
      countTable("carousels", user.id, since),
      countTable("viral_hooks", user.id),
      countTable("viral_hooks", user.id, since),
      countTable("reel_transcriptions", user.id),
      countTable("reel_transcriptions", user.id, since),
      countTable("competitor_analyses", user.id),
      countTable("competitor_analyses", user.id, since),
    ]);

    setKpis([
      { label: "Carrosséis", value: carT, delta7d: carD, icon: LayoutGrid, to: "/carrossel", color: "text-purple-400" },
      { label: "Ganchos", value: hookT, delta7d: hookD, icon: Sparkles, to: "/ganchos", color: "text-amber-400" },
      { label: "Transcrições", value: scribeT, delta7d: scribeD, icon: Mic, to: "/transcricao", color: "text-cyan-400" },
      { label: "Concorrentes", value: compT, delta7d: compD, icon: Users, to: "/concorrente", color: "text-emerald-400" },
    ]);

    // 7-day activity sparkline (count per day)
    const sinceWeek = new Date(Date.now() - 7 * 86400_000).toISOString();
    const { data: logs } = await supabase
      .from("activity_logs")
      .select("created_at")
      .or(`auth_user_id.eq.${user.id},user_id.eq.${user.id}`)
      .gte("created_at", sinceWeek)
      .limit(1000);
    const buckets = Array(7).fill(0);
    (logs ?? []).forEach((l: any) => {
      const day = Math.floor((Date.now() - new Date(l.created_at).getTime()) / 86400_000);
      if (day >= 0 && day < 7) buckets[6 - day]++;
    });
    setSparkline(buckets);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const max = Math.max(1, ...sparkline);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(kpis ?? Array(4).fill(null)).map((k, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            {k ? (
              <Link
                to={k.to}
                className="block rounded-xl border border-border bg-card p-4 hover:border-primary/50 transition-all hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between mb-2">
                  <k.icon className={`h-4 w-4 ${k.color}`} />
                  {k.delta7d > 0 && (
                    <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      +{k.delta7d} 7d
                    </span>
                  )}
                </div>
                <div className="text-2xl font-display font-bold text-foreground">{k.value}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k.label}</div>
              </Link>
            ) : (
              <div className="rounded-xl border border-border bg-card p-4 h-[92px] animate-pulse" />
            )}
          </motion.div>
        ))}
      </div>

      {/* Sparkline 7d */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            Atividade · últimos 7 dias
          </h4>
          <button
            onClick={load}
            disabled={loading}
            aria-label="Atualizar"
            className="text-muted-foreground hover:text-foreground transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
        <div className="flex items-end gap-1.5 h-16">
          {sparkline.map((v, i) => (
            <div key={i} className="flex-1 flex flex-col justify-end">
              <div
                className="w-full rounded-t bg-gradient-to-t from-primary/60 to-primary transition-all"
                style={{ height: `${(v / max) * 100}%`, minHeight: v > 0 ? "4px" : "2px", opacity: v > 0 ? 1 : 0.2 }}
                title={`${v} ações`}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-[9px] text-muted-foreground">
          <span>-6d</span><span>-5d</span><span>-4d</span><span>-3d</span><span>-2d</span><span>ontem</span><span>hoje</span>
        </div>
      </div>
    </div>
  );
}
