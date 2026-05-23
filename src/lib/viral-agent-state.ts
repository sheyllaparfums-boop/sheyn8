// Estado central do "Agente SHEY VIRAL" — máquina de 3 estados
// (ESTADO 1: tentando coletar / 2: simulação pós-coleta 7 dias / 3: nova tentativa)
//
// Toda a lógica roda client-side, persistida em localStorage.
// Quando online, tenta uma coleta real via fetchInstagramProfile.
// Em caso de falha → entra em modo SIMULAÇÃO (invisível ao usuário) e segue tentando.
import { useEffect, useRef, useState, useCallback } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { fetchInstagramProfile } from "@/lib/instagram.functions";

export type AgentInternalState = "COLETANDO" | "SIMULACAO" | "RETRY";
export type AgentLogMode = "[REAL]" | "[SIM]" | "[RETRY]" | "[WAITING]";

export interface ViralAgentSnapshot {
  plataforma: "SHEY VIRAL";
  usuario_monitorado: string;
  nicho: string;
  estado_interno: AgentInternalState;
  status_exibido: "Monitorando";
  modo_log: AgentLogMode;
  mensagem_bolha: string;
  ultima_execucao: string;
  ultima_coleta_real: string | null;
  proxima_tentativa_real: string | null;
  dados_exibidos_de: string | null;
  execucoes: number;
  isCollecting: boolean;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const STORAGE_KEY = "shey:agent:state";

interface PersistedState {
  lastRealFetch: number | null;
  nextRealAttempt: number | null;
  executions: number;
  lastExecAt: number | null;
  handle: string;
  niche: string;
}

const loadPersisted = (): PersistedState => {
  if (typeof window === "undefined") {
    return { lastRealFetch: null, nextRealAttempt: null, executions: 0, lastExecAt: null, handle: "", niche: "" };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as PersistedState;
  } catch {}
  return { lastRealFetch: null, nextRealAttempt: null, executions: 0, lastExecAt: null, handle: "", niche: "" };
};

const savePersisted = (s: PersistedState) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
};

const relativeTime = (ts: number | null): string => {
  if (!ts) return "agora mesmo";
  const diff = Math.max(0, Date.now() - ts);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora mesmo";
  if (m < 60) return `${m} min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  return `${d}d atrás`;
};

const isoOrNull = (ts: number | null) => (ts ? new Date(ts).toISOString() : null);

export function useViralAgentState(): ViralAgentSnapshot {
  const { user, onboardingByUser } = useAuthStore();
  const uid = user?.id ?? "anon";
  const onboarding = onboardingByUser[uid];
  const handle = (onboarding?.handle || "").replace(/^@/, "") || "usuario";
  const niche = onboarding?.niche || "geral";

  const messages = [
    `Radar Viral ativo: monitorando @${handle}...`,
    `Analisando hooks do nicho ${niche}...`,
    `Tendência detectada: processando dados...`,
    `Score Viral sendo atualizado para @${handle}...`,
    `IA mapeando padrões de crescimento...`,
  ];

  const [persisted, setPersisted] = useState<PersistedState>(loadPersisted);
  const [msgIndex, setMsgIndex] = useState(0);
  const [tick, setTick] = useState(0); // força re-render para tempo relativo
  const [isCollecting, setIsCollecting] = useState(false);
  const inFlight = useRef(false);

  // Rotação de mensagem da bolha (4s)
  useEffect(() => {
    const id = setInterval(() => setMsgIndex((i) => (i + 1) % messages.length), 4000);
    return () => clearInterval(id);
  }, [messages.length]);

  // Tick a cada 30s: atualiza "ultima_execucao" + incrementa execuções (modo SIM)
  useEffect(() => {
    const id = setInterval(() => {
      setTick((t) => t + 1);
      setPersisted((p) => {
        const next = { ...p, executions: p.executions + 1, lastExecAt: Date.now() };
        savePersisted(next);
        return next;
      });
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  // Tenta coleta real
  const tryRealFetch = useCallback(async () => {
    if (inFlight.current || !handle || handle === "usuario") return;
    inFlight.current = true;
    setIsCollecting(true);
    try {
      const res = await fetchInstagramProfile({ data: { handle } });
      const ok = res && (res as any).source !== "fallback";
      const now = Date.now();
      setPersisted((p) => {
        const next: PersistedState = {
          ...p,
          handle,
          niche,
          lastRealFetch: ok ? now : p.lastRealFetch,
          nextRealAttempt: ok ? now + SEVEN_DAYS_MS : now + 30 * 60 * 1000, // retry em 30min se falhou
          lastExecAt: now,
          executions: p.executions + 1,
        };
        savePersisted(next);
        return next;
      });
      console.log(ok ? "[REAL] coleta efetiva" : "[RETRY] falhou, simulando", { handle, niche });
    } catch (e) {
      console.log("[RETRY] erro silencioso", e);
      setPersisted((p) => {
        const next = { ...p, nextRealAttempt: Date.now() + 30 * 60 * 1000 };
        savePersisted(next);
        return next;
      });
    } finally {
      inFlight.current = false;
      // bolha "trava" só por ~800ms durante a coleta
      setTimeout(() => setIsCollecting(false), 800);
    }
  }, [handle, niche]);

  // Agendador: ao montar e a cada 5min verifica se está na hora de tentar real
  useEffect(() => {
    const check = () => {
      const now = Date.now();
      if (!persisted.lastRealFetch || (persisted.nextRealAttempt && now >= persisted.nextRealAttempt)) {
        tryRealFetch();
      }
    };
    check();
    const id = setInterval(check, 5 * 60 * 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle, niche]);

  // Determina estado interno
  const now = Date.now();
  let estado_interno: AgentInternalState = "SIMULACAO";
  let modo_log: AgentLogMode = "[SIM]";

  if (isCollecting) {
    estado_interno = "COLETANDO";
    modo_log = "[REAL]";
  } else if (!persisted.lastRealFetch) {
    estado_interno = "RETRY";
    modo_log = "[RETRY]";
  } else if (persisted.nextRealAttempt && now >= persisted.nextRealAttempt) {
    estado_interno = "RETRY";
    modo_log = "[RETRY]";
  } else {
    estado_interno = "SIMULACAO";
    modo_log = "[SIM]";
  }
  // tick é só para refresh — referenciado pra não dar warning
  void tick;

  return {
    plataforma: "SHEY VIRAL",
    usuario_monitorado: `@${handle}`,
    nicho: niche,
    estado_interno,
    status_exibido: "Monitorando",
    modo_log,
    mensagem_bolha: messages[msgIndex],
    ultima_execucao: relativeTime(persisted.lastExecAt ?? persisted.lastRealFetch),
    ultima_coleta_real: isoOrNull(persisted.lastRealFetch),
    proxima_tentativa_real: isoOrNull(persisted.nextRealAttempt),
    dados_exibidos_de: isoOrNull(persisted.lastRealFetch),
    execucoes: persisted.executions,
    isCollecting,
  };
}
