import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AtSign, Sparkles, Lock, ArrowRight, ArrowLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Step {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {
    icon: AtSign,
    title: "Por que precisamos do seu @?",
    description:
      "O @ do seu Instagram é a chave da sua conta. É a partir dele que o SHEY VIRAL analisa seu perfil, identifica seu nicho e personaliza tudo dentro do app só para você.",
  },
  {
    icon: Sparkles,
    title: "Tudo é personalizado a partir do seu @",
    description:
      "Workflows, Análise, Concorrente e SHEY AI usam o seu @ como base. Sem ele, nenhum dado é carregado e nenhuma automação roda.",
  },
  {
    icon: Lock,
    title: "Configure uma vez, use em todo o app",
    description:
      "Você só precisa salvar o seu @ aqui. Depois, todas as páginas do aplicativo vão puxar automaticamente. Vamos lá?",
  },
];

interface Props {
  onFinish: () => void;
}

export const OnboardingTour: React.FC<Props> = ({ onFinish }) => {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;
  const Current = STEPS[step].icon;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-[#161616] border border-[#2A2A2A] rounded-3xl overflow-hidden shadow-2xl relative"
      >
        <button
          onClick={onFinish}
          aria-label="Pular tour"
          className="absolute top-4 right-4 text-[#888] hover:text-white transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="h-1 w-full bg-[#1f1f1f]">
          <motion.div
            initial={false}
            animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            transition={{ type: "spring", stiffness: 200, damping: 26 }}
            className="h-full bg-gradient-to-r from-primary to-primary-glow"
          />
        </div>

        <div className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary-glow/10 border border-primary/30 flex items-center justify-center mb-5 shadow-[0_0_30px_rgba(255,107,0,0.25)]">
                <Current className="w-7 h-7 text-primary" />
              </div>
              <h2 className="font-rajdhani text-2xl font-bold text-white uppercase tracking-wider mb-3">
                {STEPS[step].title}
              </h2>
              <p className="text-[#B0B0B0] text-sm leading-relaxed">
                {STEPS[step].description}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-center gap-2 mt-6">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-6 bg-primary" : "w-1.5 bg-[#333]"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="border-[#2A2A2A] bg-transparent text-white hover:bg-white/5 gap-2 disabled:opacity-30"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
            <Button
              onClick={() => (isLast ? onFinish() : setStep((s) => s + 1))}
              className="bg-gradient-to-r from-primary to-primary-glow text-black font-bold gap-2"
            >
              {isLast ? "Configurar meu @" : "Próximo"}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
