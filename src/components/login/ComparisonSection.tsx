import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

export const ComparisonSection: React.FC = () => {
  return (
    <div className="w-full max-w-[1200px] mt-24 px-4 pb-24 animate-fade-in">
      <div className="flex flex-col items-center mb-16">
        <div className="px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full mb-4">
          <span className="text-primary text-[10px] font-bold tracking-[0.2em] uppercase">Nosso Diferencial</span>
        </div>
        <h2 className="text-4xl font-bold text-white font-outfit mb-3 text-center">Por que escolher a SHEY N8N?</h2>
        <p className="text-gray-500 text-sm font-medium">Compare e veja a diferença na sua produtividade</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Sem SHEY N8N */}
        <div className="bg-white/[0.02] border border-white/5 rounded-[32px] p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500">
              <XCircle size={24} />
            </div>
            <h3 className="text-xl font-semibold text-white/50 font-outfit uppercase tracking-wider">SEM SHEY N8N</h3>
          </div>
          
          <ul className="space-y-4">
            {[
              "Processos Manuais e Lentos",
              "Custos Elevados com Equipe",
              "Dificuldade em Escalar Operações",
              "Erros Humanos Constantes",
              "Falta de Integração entre Apps"
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 group">
                <XCircle size={16} className="text-red-500/50 mt-1 flex-shrink-0" />
                <span className="text-[#666666] text-sm font-outfit leading-tight group-hover:text-red-400/70 transition-colors">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Com SHEY N8N */}
        <div className="bg-primary/5 border border-primary/20 rounded-[32px] p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <CheckCircle2 size={100} className="text-primary" />
          </div>
          
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-xl font-bold text-white font-outfit uppercase tracking-wider">COM SHEY N8N</h3>
          </div>
          
          <ul className="space-y-4">
            {[
              "Automação 100% Inteligente",
              "Redução Drástica de Custos",
              "Escalabilidade Infinita",
              "Precisão e Eficiência Total",
              "Ecossistema Totalmente Conectado"
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-4 group">
                <CheckCircle2 size={18} className="text-primary mt-1 flex-shrink-0" />
                <span className="text-white/90 text-sm font-outfit leading-tight group-hover:text-primary-glow transition-colors">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
