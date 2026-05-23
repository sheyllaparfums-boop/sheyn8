// Mock data realista para os 5 workflows da plataforma SHEY VIRAL.
// Estrutura preparada para futura troca por API real (Apify / RapidAPI).

export type ViralVideo = {
  id: string;
  title: string;
  thumbnail: string;
  author: string;
  views: number;
  likes: number;
  comments: number;
  growth: number; // % crescimento 24h
  viralScore: number; // 0-100
  format: "Reels" | "Carrossel" | "Story";
  duration: string;
};

export type ViralHook = {
  id: string;
  text: string;
  retentionScore: number;
  emotion: "Curiosidade" | "Urgência" | "Surpresa" | "Medo" | "Desejo";
  triggers: string[];
  examples: string[];
};

export type ReelIdea = {
  id: string;
  category: string;
  title: string;
  hook: string;
  script: string;
  cta: string;
  caption: string;
  hashtags: string[];
  shotList: string[];
};

export type TrendItem = {
  id: string;
  kind: "Hashtag" | "Áudio" | "Formato";
  name: string;
  growth: number; // % 7d
  reach: string;
  peakIn: string; // prev pico
};

const seededRand = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
};

const thumbColors = ["var(--primary)", "var(--primary-glow)", "#1A1A1A", "#2A2A2A", "#FFA94D"];

const svgThumb = (label: string, c1: string, c2: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 600'>
      <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0' stop-color='${c1}'/><stop offset='1' stop-color='${c2}'/>
      </linearGradient></defs>
      <rect width='400' height='600' fill='${c2}'/>
      <rect width='400' height='600' fill='url(#g)' opacity='0.55'/>
      <circle cx='200' cy='260' r='52' fill='#000' opacity='0.35'/>
      <polygon points='185,235 185,285 230,260' fill='#fff'/>
      <text x='20' y='560' font-family='Inter,Arial' font-weight='800' font-size='28' fill='#fff'>${label}</text>
    </svg>`
  )}`;

export function getViralVideos(niche: string): ViralVideo[] {
  const rng = seededRand(niche.length * 17 + 3);
  const formats = niche.includes("Perfume") 
    ? ["A fragrância de [nicho] que parou o aeroporto", "O segredo das sheikas: [nicho]", "Unboxing do [nicho] mais raro do mundo", "POV: você cheira a [nicho]", "Antes vs depois: fixação do [nicho]", "Onde encontrar [nicho] original"]
    : ["Como [nicho] mudou minha vida", "3 erros em [nicho]", "Ninguém te conta isso de [nicho]", "POV: trabalhando com [nicho]", "Antes vs depois — [nicho]", "O segredo de [nicho] que viralizou"];
  const query = encodeURIComponent(niche || "viral");
  return Array.from({ length: 8 }).map((_, i) => {
    const v = Math.round(50_000 + rng() * 4_500_000);
    const sig = Math.floor(rng() * 100000);
    return {
      id: `vv-${i}`,
      title: formats[i % formats.length].replace("[nicho]", niche),
      thumbnail: niche.includes("Perfume") 
        ? `https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&h=600&fit=crop&q=80&sig=${sig}` 
        : `https://source.unsplash.com/400x600/?${query},instagram,reel&sig=${sig}`,
      author: `@${niche.toLowerCase().replace(/\s+/g, "")}_${i + 1}`,
      views: v,
      likes: Math.round(v * (0.08 + rng() * 0.08)),
      comments: Math.round(v * (0.005 + rng() * 0.01)),
      growth: Math.round(20 + rng() * 380),
      viralScore: Math.round(60 + rng() * 39),
      format: (["Reels", "Reels", "Reels", "Carrossel", "Story"] as const)[i % 5],
      duration: `${Math.round(7 + rng() * 53)}s`,
    };
  });
}

export function getViralHooks(niche: string): ViralHook[] {
  return [
    {
      id: "h1",
      text: `Se você está em ${niche}, PARA o que está fazendo agora.`,
      retentionScore: 94,
      emotion: "Urgência",
      triggers: ["Pausa padrão", "Comando direto", "Especificidade"],
      examples: [`POV: você acaba de descobrir o atalho em ${niche}`, "Eu errei isso por 2 anos — não faça igual"],
    },
    {
      id: "h2",
      text: `Ninguém em ${niche} te conta isso (e eu vou mostrar).`,
      retentionScore: 91,
      emotion: "Curiosidade",
      triggers: ["Loop aberto", "Promessa", "Exclusividade"],
      examples: ["O segredo dos top 1%", "A verdade incômoda sobre o nicho"],
    },
    {
      id: "h3",
      text: `Eu testei por 30 dias em ${niche} e o resultado me chocou.`,
      retentionScore: 88,
      emotion: "Surpresa",
      triggers: ["Prova", "Tempo", "Reação"],
      examples: ["O que aconteceu foi inesperado", "Não imaginava ver isso"],
    },
    {
      id: "h4",
      text: `Você está perdendo dinheiro em ${niche} sem perceber.`,
      retentionScore: 86,
      emotion: "Medo",
      triggers: ["Perda", "Inconsciência", "Identidade"],
      examples: ["Erro silencioso", "Custo invisível"],
    },
    {
      id: "h5",
      text: `Como sair do zero em ${niche} (em 3 passos).`,
      retentionScore: 82,
      emotion: "Desejo",
      triggers: ["Transformação", "Passo a passo", "Promessa"],
      examples: ["Plano de 3 etapas", "Roteiro replicável"],
    },
  ];
}

export function getReelIdeas(niche: string): ReelIdea[] {
  const categories = ["Educativo", "Bastidor", "Storytelling", "Polêmico", "POV"];
  return categories.map((cat, i) => ({
    id: `ri-${i}`,
    category: cat,
    title: `${cat}: o lado oculto de ${niche}`,
    hook: `Ninguém em ${niche} te fala isso na cara, mas eu vou.`,
    script: `0-3s: Hook visual (close no rosto, fala direta).\n3-8s: Apresente o problema com 1 número impactante.\n8-20s: Mostre 3 erros comuns em ${niche} (texto na tela).\n20-35s: Vire a chave — revele a solução em 1 frase forte.\n35-45s: CTA com escassez.`,
    cta: "Comenta 'EU QUERO' que eu mando o roteiro completo.",
    caption: `Salva esse pra quando precisar lembrar disso em ${niche}. 🔥\n\nCompartilha com alguém do nicho.`,
    hashtags: [`#${niche.toLowerCase().replace(/\s+/g, "")}`, "#viral", "#reels", "#marketingdigital", "#crescimentoinstagram", "#estrategia"],
    shotList: ["Close rosto falando", "Texto animado overlay", "B-roll do produto/processo", "Cut rápido a cada 1.5s", "CTA final tela cheia"],
  }));
}

export function getTrends(niche: string): TrendItem[] {
  return [
    { id: "t1", kind: "Hashtag", name: `#${niche.toLowerCase().replace(/\s+/g, "")}viral`, growth: 312, reach: "4.2M", peakIn: "3 dias" },
    { id: "t2", kind: "Hashtag", name: "#pov", growth: 178, reach: "12M", peakIn: "agora" },
    { id: "t3", kind: "Áudio", name: "Espresso Macchiato — Tommy Cash", growth: 540, reach: "8.7M", peakIn: "5 dias" },
    { id: "t4", kind: "Áudio", name: "Anxiety — Doechii", growth: 220, reach: "6.1M", peakIn: "agora" },
    { id: "t5", kind: "Formato", name: "Carrossel de 'antes vs depois'", growth: 145, reach: "2.8M", peakIn: "7 dias" },
    { id: "t6", kind: "Formato", name: "Reels com texto longo overlay", growth: 98, reach: "3.4M", peakIn: "agora" },
    { id: "t7", kind: "Hashtag", name: "#dicaderapida", growth: 65, reach: "1.9M", peakIn: "14 dias" },
  ];
}

export function getTrendSeries(): { day: string; value: number }[] {
  const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const rng = seededRand(42);
  let v = 40;
  return days.map((d) => {
    v += Math.round(rng() * 30 - 5);
    return { day: d, value: Math.max(10, v) };
  });
}

export function getViralScoreReport(handle: string, niche: string) {
  const rng = seededRand(handle.length * 31 + niche.length);
  const score = Math.round(55 + rng() * 40);
  return {
    score,
    level:
      score >= 85 ? "ELITE" : score >= 70 ? "AVANÇADO" : score >= 55 ? "INTERMEDIÁRIO" : "INICIANTE",
    breakdown: [
      { label: "Nicho definido", value: Math.round(60 + rng() * 40) },
      { label: "Frequência", value: Math.round(40 + rng() * 60) },
      { label: "Formato", value: Math.round(50 + rng() * 50) },
      { label: "Padrão visual", value: Math.round(45 + rng() * 55) },
      { label: "Engajamento estimado", value: Math.round(35 + rng() * 65) },
    ],
    weeklyProgress: [42, 48, 53, 60, 67, 71, score],
    suggestions: [
      "Poste 2 Reels educativos por semana com hook nos 3s.",
      "Padronize capa de Reels (mesma fonte, mesma cor neon).",
      "Use 1 áudio em tendência por semana — não mais que isso.",
      "Responda comentários nos primeiros 30 min após postar.",
    ],
  };
}
