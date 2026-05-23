import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Tipos base para o framework
export interface ViralMindProfile {
  handle: string;
  profileUrl?: string;
  niche: string;
  followers: number;
  following: number;
  posts: number;
  bio: string;
  overallScore: number;
  locked: boolean;
  avatarUrl?: string;
  status: "real" | "manual" | "none";
}

// Mock de dados
let mockProfile: ViralMindProfile | null = null;

export const getViralMind = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    return mockProfile;
  });

export const connectInstagram = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    handle: z.string(),
    profileUrl: z.string().optional(),
    niche: z.string()
  }).parse(input))
  .handler(async ({ data }) => {
    const handle = data.handle.replace("@", "").trim();
    
    // Simulação de carregamento para efeito visual
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    try {
      // Importamos a função de busca real da biblioteca correta
      const { fetchInstagramProfile } = await import("../lib/instagram.functions");
      const realProfile = await fetchInstagramProfile({ data: { handle } });

      const avatarUrl = realProfile.profilePic || `https://unavatar.io/instagram/${handle}?fallback=https://github.com/identicons/${handle}.png`;
      
      mockProfile = {
        handle: handle,
        profileUrl: `https://www.instagram.com/${handle}/`,
        niche: data.niche,
        followers: realProfile.followers || 0,
        following: realProfile.following || 0,
        posts: realProfile.posts || 0,
        bio: realProfile.bio || `${data.niche} Strategy | Mentoria e Conteúdo de Alto Valor`,
        avatarUrl: avatarUrl,
        overallScore: 75 + (handle.length % 20),
        locked: false,
        status: realProfile.source === "fallback" ? "manual" : "real"
      };

      return mockProfile;
    } catch (error) {
      console.error("Erro ao conectar perfil:", error);
      throw new Error("Erro de conexão com o servidor de dados.");
    }
  });

export const getXpStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    return {
      xp: 1250,
      level: 5,
      streak: 3,
      conquistas: ["Primeira Conexão", "Analista Aprendiz"]
    };
  });

export const refreshAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    if (!mockProfile) return null;
    
    // Simula uma nova coleta ao atualizar
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Incrementa levemente os dados para mostrar que houve atualização "real"
    mockProfile = {
      ...mockProfile,
      followers: mockProfile.followers + Math.floor(Math.random() * 10),
      overallScore: Math.min(100, mockProfile.overallScore + (Math.random() > 0.5 ? 1 : 0))
    };
    
    return mockProfile;
  });
export const deleteInstagramProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).handler(async () => { mockProfile = null; });
export const getTrendingReels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ niche: z.string() }).parse(i))
  .handler(async () => []);
export const getDailyActions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth]).handler(async () => []);
export const generateMissionPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).handler(async () => ({}));
