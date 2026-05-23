import React, { useMemo } from 'react';

// Deterministic PRNG so positions are stable across re-renders
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const LoginBackground: React.FC = () => {
  const sparks = useMemo(() => {
    const rand = mulberry32(42);
    return Array.from({ length: 6 }, () => ({
      left: rand() * 100,
      top: rand() * 100,
      opacity: 0.28 + rand() * 0.32,
    }));
  }, []);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-[#050505] pointer-events-none">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] bg-primary/5 rounded-full opacity-40" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] bg-primary/5 rounded-full opacity-25" />

      {/* Grade de linhas tipo circuito eletrônico */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(to right, var(--primary) 1px, transparent 1px),
            linear-gradient(to bottom, var(--primary) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(circle at center, transparent 0%, black 80%)',
          WebkitMaskImage: 'radial-gradient(circle at center, transparent 0%, black 80%)',
        }}
      />

      {/* Faíscas e linhas estáticas para evitar repaints contínuos no mobile */}
      {sparks.map((s, i) => (
        <div
          key={i}
          className="absolute w-1.5 h-1.5 bg-primary rounded-full"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            opacity: s.opacity,
            boxShadow: '0 0 10px var(--primary)',
          }}
        />
      ))}

      <div className="absolute top-[20%] left-0 w-full h-px opacity-15" style={{ background: 'linear-gradient(90deg, transparent, var(--primary), transparent)' }} />
      <div className="absolute top-[50%] left-0 w-full h-px opacity-10" style={{ background: 'linear-gradient(90deg, transparent, var(--primary), transparent)' }} />
      <div className="absolute top-[80%] left-0 w-full h-px opacity-15" style={{ background: 'linear-gradient(90deg, transparent, var(--primary), transparent)' }} />
    </div>
  );
};
