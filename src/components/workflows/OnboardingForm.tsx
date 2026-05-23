
import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Link as LinkIcon, Target, Flame, ShoppingCart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface OnboardingFormProps {
  onComplete: (data: OnboardingData) => void;
  initialData?: OnboardingData | null;
  autoFocusHandle?: boolean;
}

export interface OnboardingData {
  handle: string;
  niche: string;
  goal: string;
}

const NICHES = [
  "Perfumes Árabes 💎",
  "Perfumaria & Cosméticos",
  "Moda & Estilo",
  "Alimentação & Gastronomia",
  "Fitness & Saúde",
  "Beleza & Estética",
  "Educação & Cursos",
  "Tecnologia & Negócios",
  "Casa & Decoração",
  "Pet & Animais",
  "Artesanato & Handmade",
  "Outro"
];

const GOALS = [
  { id: "followers", icon: Target, label: "CAPTAR SEGUIDORES", description: "Crescer sua audiência organicamente" },
  { id: "viral", icon: Flame, label: "VIRALIZAR CONTEÚDO", description: "Alcançar máximo de pessoas" },
  { id: "sales", icon: ShoppingCart, label: "VENDER MAIS", description: "Converter seguidores em clientes" },
];

export const OnboardingForm: React.FC<OnboardingFormProps> = ({ onComplete, initialData, autoFocusHandle }) => {
  const [handle, setHandle] = useState(initialData?.handle ?? "");
  const [niche, setNiche] = useState(initialData?.niche ?? "");
  const [goal, setGoal] = useState(initialData?.goal ?? "");
  const [isLoading, setIsLoading] = useState(false);
  const handleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHandle(initialData?.handle ?? "");
    setNiche(initialData?.niche ?? "");
    setGoal(initialData?.goal ?? "");
  }, [initialData]);

  useEffect(() => {
    if (autoFocusHandle && handleInputRef.current) {
      handleInputRef.current.focus();
    }
  }, [autoFocusHandle]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!handle || !niche || !goal) return;

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onComplete({ handle, niche, goal });
    }, 2000);
  };

  const handleHandleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Aceita apenas caracteres válidos de @ do Instagram (letras, números, ponto, sublinhado)
    const val = e.target.value.replace(/^@+/, "").replace(/[^a-zA-Z0-9._]/g, "").toLowerCase();
    setHandle(val);
  };

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-width-[480px] w-full bg-[#111111] border border-[var(--primary)] rounded-[24px] p-10 shadow-[0_0_20px_rgb(var(--primary-rgb) / 0.15)]"
      >
        <div className="mb-8">
          <h1 className="font-rajdhani text-2xl font-bold text-white mb-1">
            Configure seu Agente de Crescimento
          </h1>
          <p className="text-[#888888] text-sm">
            Preencha os dados para ativar a análise do seu perfil
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label className="text-white">Seu @ do Instagram</Label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16Z" stroke="url(#paint0_linear)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M17.5 6.5H17.51" stroke="url(#paint1_linear)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M7 2H17C19.7614 2 22 4.23858 22 7V17C22 19.7614 19.7614 22 17 22H7C4.23858 22 2 19.7614 2 17V7C2 4.23858 4.23858 2 7 2Z" stroke="url(#paint2_linear)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <defs>
                    <linearGradient id="paint0_linear" x1="8" y1="8" x2="16" y2="16" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#833AB4"/>
                      <stop offset="0.5" stopColor="#FD1D1D"/>
                      <stop offset="1" stopColor="#FCAF45"/>
                    </linearGradient>
                    <linearGradient id="paint1_linear" x1="17.5" y1="6.5" x2="17.51" y2="6.5" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#833AB4"/>
                      <stop offset="0.5" stopColor="#FD1D1D"/>
                      <stop offset="1" stopColor="#FCAF45"/>
                    </linearGradient>
                    <linearGradient id="paint2_linear" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#833AB4"/>
                      <stop offset="0.5" stopColor="#FD1D1D"/>
                      <stop offset="1" stopColor="#FCAF45"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <span className="absolute left-10 top-1/2 -translate-y-1/2 text-white/70 pointer-events-none select-none">@</span>
              <Input
                ref={handleInputRef}
                value={handle}
                onChange={handleHandleChange}
                placeholder="seuperfil"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                className="bg-[#1A1A1A] border-[#2A2A2A] text-white pl-14 focus:border-[var(--primary)] transition-colors"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-white">Link do seu perfil</Label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888888]" />
              <Input
                value={handle ? `https://instagram.com/${handle}` : ""}
                readOnly
                placeholder="https://instagram.com/seuperfil"
                className="bg-[#1A1A1A] border-[#2A2A2A] text-white pl-10 opacity-70 cursor-not-allowed"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-white">Seu nicho de atuação</Label>
            <select
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              className="w-full bg-[#1A1A1A] border-[#2A2A2A] text-white rounded-md p-2 h-10 outline-none focus:border-[var(--primary)] transition-colors"
              required
            >
              <option value="" disabled>Selecione um nicho</option>
              {NICHES.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <Label className="text-white">Qual é seu objetivo principal?</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {GOALS.map((g) => {
                const Icon = g.icon;
                const isSelected = goal === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setGoal(g.id)}
                    className={cn(
                      "flex flex-col items-center p-4 rounded-xl border transition-all duration-300 text-center group",
                      isSelected 
                        ? "border-[var(--primary)] bg-[rgb(var(--primary-rgb) / 0.1)]" 
                        : "border-[#2A2A2A] bg-transparent hover:border-[var(--primary)]/50"
                    )}
                  >
                    <Icon className={cn("w-6 h-6 mb-2 transition-colors", isSelected ? "text-[var(--primary)]" : "text-[#888888] group-hover:text-[var(--primary)]/70")} />
                    <span className="text-[10px] font-bold text-[var(--primary)] mb-1">{g.label}</span>
                    <span className="text-[11px] text-[#888888] leading-tight">{g.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading || !handle || !niche || !goal}
            className="w-full h-12 bg-gradient-to-r from-[var(--primary)] to-[var(--primary-glow)] text-white font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "⚡ Ativar Agente de IA"
            )}
          </Button>

          <p className="text-[12px] text-[#666666] text-center">
            🔒 Seus dados são usados exclusivamente para análise de crescimento. Não armazenamos sua senha.
          </p>
        </form>
      </motion.div>
    </div>
  );
};
