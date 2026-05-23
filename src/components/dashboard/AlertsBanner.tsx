import { useEffect, useState } from "react";
import { AlertTriangle, XCircle } from "lucide-react";
import { getDashboardStats } from "@/lib/dashboard.functions";

type Stats = Awaited<ReturnType<typeof getDashboardStats>>;

export function AlertsBanner() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const load = async () => {
      try { setStats(await getDashboardStats()); } catch {}
    };
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  if (!stats) return null;
  const { error: errored, untested, items } = stats.apis;
  if (errored === 0 && untested === 0) return null;

  const erroredKeys = items.filter((i) => i.status === "invalid").map((i) => i.key);
  const untestedKeys = items.filter((i) => i.status !== "valid" && i.status !== "invalid").map((i) => i.key);

  const isCritical = errored > 0;
  const Icon = isCritical ? XCircle : AlertTriangle;
  const tone = isCritical
    ? "border-red-500/40 bg-red-500/5 text-red-300"
    : "border-yellow-500/40 bg-yellow-500/5 text-yellow-200";

  return (
    <div className={`rounded-xl border ${tone} px-4 py-3 flex items-start gap-3`}>
      <Icon className="w-5 h-5 mt-0.5 shrink-0" />
      <div className="flex-1 text-sm">
        {isCritical && (
          <p>
            <strong className="font-semibold">{errored} credencial(is) com erro:</strong>{" "}
            {erroredKeys.join(", ")}.{" "}
            <a href="/integracoes" className="underline underline-offset-2 hover:text-white">Resolver →</a>
          </p>
        )}
        {!isCritical && untested > 0 && (
          <p>
            <strong className="font-semibold">{untested} credencial(is) não testada(s):</strong>{" "}
            {untestedKeys.join(", ")}.{" "}
            <a href="/integracoes" className="underline underline-offset-2 hover:text-white">Validar agora →</a>
          </p>
        )}
      </div>
    </div>
  );
}
