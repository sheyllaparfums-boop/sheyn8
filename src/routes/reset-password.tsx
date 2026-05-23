import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';
import { LoginBackground } from '@/components/login/LoginBackground';

export const Route = createFileRoute('/reset-password')({
  head: () => ({
    meta: [
      { title: 'Redefinir senha — SHEY VIRAL' },
      { name: 'description', content: 'Defina uma nova senha para sua conta.' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: ResetPasswordPage,
});

function strength(p: string): { score: number; label: string; color: string } {
  let s = 0;
  if (p.length >= 8) s++;
  if (p.length >= 12) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  const map = [
    { label: 'Muito fraca', color: 'bg-red-500' },
    { label: 'Fraca', color: 'bg-orange-500' },
    { label: 'Razoável', color: 'bg-yellow-500' },
    { label: 'Boa', color: 'bg-lime-500' },
    { label: 'Forte', color: 'bg-green-500' },
    { label: 'Muito forte', color: 'bg-emerald-500' },
  ];
  return { score: s, ...map[s] };
}

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [validSession, setValidSession] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase coloca o token no hash; o cliente já processa automaticamente.
    // Verificamos se há sessão de recovery válida.
    const hash = window.location.hash;
    const isRecovery = hash.includes('type=recovery') || hash.includes('access_token');
    supabase.auth.getSession().then(({ data }) => {
      setValidSession(isRecovery && !!data.session);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error('Senha deve ter pelo menos 8 caracteres.'); return; }
    if (password !== confirm) { toast.error('As senhas não coincidem.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setDone(true);
    toast.success('Senha redefinida com sucesso! ✓');
    setTimeout(() => navigate({ to: '/login', search: { action: 'login' } }), 1500);
  };

  const st = strength(password);

  return (
    <div className="relative min-h-dvh w-full flex flex-col items-center justify-center bg-[#020202] text-white px-4 py-8 font-outfit">
      <LoginBackground />
      <main className="relative z-10 w-full max-w-[440px]">
        <div className="bg-[#111111]/80 border border-white/5 rounded-[32px] p-7 sm:p-10 shadow-2xl shadow-black/50">
          <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">Redefinir senha</h1>
          <p className="text-gray-400 text-sm mb-8">Escolha uma senha forte para proteger sua conta.</p>

          {validSession === false && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs mb-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>Link inválido ou expirado. Solicite um novo link de recuperação.</p>
            </div>
          )}

          {done ? (
            <div className="flex flex-col items-center text-center py-6">
              <CheckCircle2 className="w-12 h-12 text-green-400 mb-3" />
              <p className="text-white font-bold">Senha alterada!</p>
              <p className="text-gray-400 text-sm mt-1">Redirecionando…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[10px] font-bold text-primary tracking-widest uppercase ml-1">
                  <Lock className="w-3 h-3" /> Nova senha
                </label>
                <div className="relative">
                  <input
                    type={show ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={!validSession || loading}
                    minLength={8}
                    required
                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 px-5 pr-12 text-white focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm disabled:opacity-60"
                    placeholder="Mínimo 8 caracteres"
                  />
                  <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Ocultar' : 'Mostrar'} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {password && (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {[0,1,2,3,4].map((i) => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < st.score ? st.color : 'bg-white/5'}`} />
                      ))}
                    </div>
                    <p className="text-[10px] text-gray-500">Força: <span className="text-white">{st.label}</span></p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[10px] font-bold text-primary tracking-widest uppercase ml-1">
                  <Lock className="w-3 h-3" /> Confirmar senha
                </label>
                <input
                  type={show ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  disabled={!validSession || loading}
                  required
                  className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 px-5 text-white focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm disabled:opacity-60"
                  placeholder="Repita a senha"
                />
                {confirm && password !== confirm && (
                  <p className="text-amber-400 text-[11px] ml-1">As senhas não coincidem</p>
                )}
              </div>

              <button
                type="submit"
                disabled={!validSession || loading}
                className="w-full bg-gradient-to-r from-primary to-primary-glow text-white font-bold text-sm tracking-widest py-4 rounded-2xl shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> SALVANDO…</> : 'REDEFINIR SENHA'}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
