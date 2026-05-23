import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Instagram, Sparkles, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { connectInstagram } from "@/services/viralmind.functions";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/auth-store";

export function ConnectCard() {
  const profileData = useAuthStore((s) => s.user ? s.onboardingByUser[s.user.id] ?? null : null);
  const profileHandle = profileData?.handle?.trim() ?? "";
  const [niche, setNiche] = useState(profileData?.niche ?? "Moda");
  const queryClient = useQueryClient();

  useEffect(() => {
    if (profileData?.niche) setNiche(profileData.niche);
  }, [profileData?.niche]);

  const connect = useMutation({
    mutationFn: (data: { handle: string; profileUrl: string; niche: string }) => 
      connectInstagram({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["viralmind-profile"] });
      toast.success("Perfil conectado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao conectar perfil.");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileHandle) {
      toast.error("Configure seu @ em User antes de conectar.");
      return;
    }
    const profileUrl = `https://www.instagram.com/${profileHandle}/`;
    connect.mutate({ handle: profileHandle, profileUrl, niche });
  };

  if (!profileHandle) {
    return (
      <Card className="glass max-w-xl mx-auto border-white/5 overflow-hidden">
        <CardContent className="p-8 space-y-5 text-center">
          <Instagram className="w-10 h-10 text-[var(--primary)] mx-auto" />
          <h2 className="font-rajdhani text-2xl font-black italic uppercase tracking-widest text-white">Configure seu User</h2>
          <p className="text-white/60 text-sm">Salve o @ da conta em User para liberar as análises e conexões automáticas.</p>
          <Button asChild className="w-full bg-[var(--primary)] text-black hover:bg-[var(--primary-glow)]">
            <Link to="/user">Ir para User</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass max-w-xl mx-auto border-white/5 overflow-hidden">
      <CardContent className="p-8 space-y-8">
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#feda75] via-[#fa7e1e] to-[#d62976] flex items-center justify-center shadow-lg">
            <Instagram className="w-8 h-8 text-white" />
          </div>
          <h2 className="font-rajdhani text-3xl font-black italic uppercase tracking-widest text-white">
            SHEY <span className="text-[var(--primary)]">X</span>
          </h2>
          <p className="text-white/60 text-sm">Transforme tendências em conteúdo que vende...</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="handle" className="text-white/70">@ do perfil</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">@</span>
              <Input
                id="handle"
                value={profileHandle}
                readOnly
                placeholder="seuusuario"
                className="pl-8 bg-white/5 border-white/10 text-white placeholder:text-white/20 opacity-70 cursor-not-allowed"
                maxLength={40}
              />
            </div>
          </div>

          <div className="space-y-2 opacity-50 grayscale pointer-events-none">
            <Label htmlFor="url" className="text-white/70">Link de compartilhamento (Automático)</Label>
            <Input
              id="url"
              value={`https://www.instagram.com/${profileHandle}/`}
              readOnly
              placeholder="Gerado automaticamente..."
              className="bg-white/5 border-white/10 text-white placeholder:text-white/20"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-white/70">Nicho</Label>
            <select 
              value={niche} 
              onChange={(e) => setNiche(e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="Moda" className="bg-[#121212]">Moda</option>
              <option value="Perfumaria" className="bg-[#121212]">Perfumaria</option>
              <option value="Beleza e Cuidados Pessoais" className="bg-[#121212]">Beleza e Cuidados Pessoais</option>
              <option value="Saúde e Bem-Estar" className="bg-[#121212]">Saúde e Bem-Estar</option>
              <option value="Fitness" className="bg-[#121212]">Fitness</option>
              <option value="Marketing Digital" className="bg-[#121212]">Marketing Digital</option>
              <option value="Tecnologia" className="bg-[#121212]">Tecnologia</option>
              <option value="Negócios e Carreira" className="bg-[#121212]">Negócios e Carreira</option>
              <option value="Educação" className="bg-[#121212]">Educação</option>
              <option value="Gastronomia e Receitas" className="bg-[#121212]">Gastronomia e Receitas</option>
              <option value="Viagens e Estilo de Vida" className="bg-[#121212]">Viagens e Estilo de Vida</option>
              <option value="Finanças e Investimentos" className="bg-[#121212]">Finanças e Investimentos</option>
              <option value="Artes e Entretenimento" className="bg-[#121212]">Artes e Entretenimento</option>
              <option value="Desenvolvimento Pessoal" className="bg-[#121212]">Desenvolvimento Pessoal</option>
              <option value="Games" className="bg-[#121212]">Games</option>
              <option value="Pet Shop e Animais" className="bg-[#121212]">Pet Shop e Animais</option>
              <option value="Decoração e Casa" className="bg-[#121212]">Decoração e Casa</option>
              <option value="Maternidade e Família" className="bg-[#121212]">Maternidade e Família</option>
              <option value="Outro" className="bg-[#121212]">Outro</option>
            </select>
          </div>

          <Button 
            type="submit" 
            className={`w-full h-12 font-rajdhani font-bold italic uppercase tracking-wider transition-all duration-300 shadow-lg glow-primary-sm ${
              profileHandle
                ? "bg-[var(--primary)] hover:bg-[var(--primary-glow)] text-black opacity-100 cursor-pointer" 
                : "bg-[var(--primary)] text-black opacity-50 cursor-not-allowed"
            }`}
            disabled={connect.isPending || !profileHandle}
          >
            {connect.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Conectar e analisar
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
