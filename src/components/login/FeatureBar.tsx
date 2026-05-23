import React from 'react';
import { Infinity, Zap, Shield, Clock } from 'lucide-react';

const features = [
  {
    icon: <Infinity size={20} />,
    title: 'Ilimitado',
    subtitle: 'Automatize sem limites',
  },
  {
    icon: <Zap size={20} />,
    title: 'Inteligente',
    subtitle: 'IA integrada',
  },
  {
    icon: <Shield size={20} />,
    title: 'Seguro',
    subtitle: 'Seus dados protegidos',
  },
  {
    icon: <Clock size={20} />,
    title: 'Rápido',
    subtitle: 'Execuções em tempo real',
  },
];

export const FeatureBar: React.FC = () => {
  return (
    <div className="w-full max-w-[480px] mt-10 grid grid-cols-2 md:grid-cols-4 gap-6 px-4">
      {features.map((feature, i) => (
        <div key={i} className="flex flex-col items-center text-center space-y-2">
          <div className="w-11 h-11 flex items-center justify-center bg-[var(--primary)]/10 border border-[var(--primary)]/30 rounded-xl text-[var(--primary)] shadow-[0_0_15px_rgb(var(--primary-rgb) / 0.1)]">
            {feature.icon}
          </div>
          <div>
            <h3 className="text-white text-[13px] font-semibold font-outfit">{feature.title}</h3>
            <p className="text-[#888888] text-[11px] font-outfit">{feature.subtitle}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
