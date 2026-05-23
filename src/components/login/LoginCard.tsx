import React, { useId, useState } from 'react';
import { Mail, Lock, Eye, EyeOff, Zap, Shield, Loader2, AlertCircle, LifeBuoy, Star } from 'lucide-react';
import { toast } from "sonner";
import { Link, useNavigate } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { useSiteSettings } from '@/lib/site-settings-store';
import { refreshProfile } from '@/lib/use-supabase-session';

interface LoginCardProps {
  onOpenRecover: () => void;
  onOpenRegister: () => void;
  initialEmail?: string;
  initialPassword?: string;
  loginMode?: 'cliente' | 'admin' | 'administrador';
  setLoginMode?: (mode: 'cliente' | 'admin' | 'administrador') => void;
}

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

export const LoginCard: React.FC<LoginCardProps> = ({
  onOpenRecover,
  onOpenRegister,
  initialEmail = '',
  initialPassword = '',
  loginMode = 'cliente',
  setLoginMode,
}) => {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState(initialPassword);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [resendingConfirm, setResendingConfirm] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState<number>(0);
  const [stayLoggedIn, setStayLoggedIn] = useState(true);
  const [remainingCooldown, setRemainingCooldown] = useState(0);
  const anyLoading = loading || googleLoading || appleLoading;
  const inCooldown = remainingCooldown > 0;
  const navigate = useNavigate();
  const { loginTitle, loginSubtitle } = useSiteSettings();
  const emailId = useId();
  const passwordId = useId();
  const stayId = useId();
  const tablistRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
    if (initialPassword) setPassword(initialPassword);
  }, [initialEmail, initialPassword]);

  // Cooldown ticker
  React.useEffect(() => {
    if (cooldownUntil <= Date.now()) { setRemainingCooldown(0); return; }
    const i = setInterval(() => {
      const left = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
      setRemainingCooldown(left);
      if (left === 0) clearInterval(i);
    }, 500);
    return () => clearInterval(i);
  }, [cooldownUntil]);

  const validateEmail = (v: string) => v.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);

  const setErr = (msg: string) => { setErrorMsg(msg); toast.error(msg); };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (anyLoading) return;
    if (cooldownUntil > Date.now()) {
      setErr(`Aguarde ${remainingCooldown}s antes de tentar novamente.`);
      return;
    }
    setErrorMsg(null);
    setNeedsConfirmation(false);
    if (!email || !password) { setErr('Preencha todos os campos.'); return; }
    if (!validateEmail(email)) { setErr('Formato de e-mail inválido.'); return; }
    if (password.length < 8) { setErr('Senha deve ter pelo menos 8 caracteres.'); return; }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        const next = attempts + 1;
        setAttempts(next);
        // E-mail não confirmado
        if (/email.*not.*confirmed|not.*verified/i.test(error.message)) {
          setNeedsConfirmation(true);
          setErr('Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.');
          return;
        }
        if (next >= 5) {
          setCooldownUntil(Date.now() + 30_000);
          setErr('Muitas tentativas. Aguarde 30 segundos.');
        } else {
          // Mensagem padronizada — não vaza se conta existe
          setErr('Email ou senha incorretos.');
        }
        return;
      }

      setAttempts(0);
      try { await refreshProfile(); } catch { /* perfil opcional */ }
      toast.success('Login realizado com sucesso! ✓');
      navigate({ to: loginMode === 'administrador' || loginMode === 'admin' ? '/admin' : '/' });
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email || resendingConfirm) return;
    setResendingConfirm(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim() });
    setResendingConfirm(false);
    if (error) { toast.error('Não foi possível reenviar agora. Tente novamente.'); return; }
    toast.success('E-mail de confirmação reenviado! ✓');
  };

  const handleGoogleLogin = async () => {
    if (anyLoading) return;
    setErrorMsg(null);
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        const msg = /not enabled|unsupported/i.test(String(result.error?.message || result.error))
          ? 'Login com Google indisponível no momento. Tente por e-mail.'
          : 'Falha ao conectar com Google. Verifique sua conexão.';
        setErr(msg);
        return;
      }
      if (result.redirected) return;
      toast.success('Login com Google realizado! ✓');
      navigate({ to: '/' });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    if (anyLoading) return;
    setErrorMsg(null);
    setAppleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth('apple', {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        setErr('Falha ao conectar com Apple. Tente novamente.');
        return;
      }
      if (result.redirected) return;
      toast.success('Login com Apple realizado! ✓');
      navigate({ to: '/' });
    } finally {
      setAppleLoading(false);
    }
  };

  const handlePasswordKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === 'function') {
      setCapsLock(e.getModifierState('CapsLock'));
    }
  };

  const handleTabKeyNav = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    setLoginMode?.(loginMode === 'cliente' ? 'administrador' : 'cliente');
  };



  return (
    <div className="w-full max-w-[440px] relative">
      <div className="bg-[#111111] border border-white/5 rounded-[24px] sm:rounded-[28px] p-5 sm:p-7 md:p-10 shadow-xl shadow-black/40">
        {/* Switcher Cliente / Admin */}
        <div
          ref={tablistRef}
          className="flex p-1.5 sm:p-1 bg-black/40 rounded-2xl mb-6 sm:mb-8 border border-white/5"
          role="tablist"
          aria-label="Tipo de acesso"
          onKeyDown={handleTabKeyNav}
        >
          <button
            type="button"
            role="tab"
            aria-selected={loginMode === 'cliente'}
            tabIndex={loginMode === 'cliente' ? 0 : -1}
            onClick={() => setLoginMode?.('cliente')}
            disabled={loading}
            className={`flex-1 min-h-12 flex items-center justify-center gap-2 py-3 sm:py-3 rounded-xl text-sm sm:text-xs font-bold transition-all disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${loginMode === 'cliente' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-400 hover:text-gray-300'}`}
          >
            <Zap className="w-4 h-4" />
            CLIENTE
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={loginMode === 'administrador'}
            tabIndex={loginMode === 'administrador' ? 0 : -1}
            onClick={() => setLoginMode?.('administrador')}
            disabled={loading}
            className={`flex-1 min-h-12 flex items-center justify-center gap-2 py-3 sm:py-3 rounded-xl text-sm sm:text-xs font-bold transition-all disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${loginMode === 'administrador' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-400 hover:text-gray-300'}`}
          >
            <Shield className="w-4 h-4" />
            ADMIN
          </button>
        </div>

        <div className="mb-7 sm:mb-8">
          <h1 className="text-[28px] sm:text-2xl font-bold text-white mb-2 tracking-normal font-outfit leading-tight">{loginTitle}</h1>
          <p className="text-gray-300 text-base sm:text-sm leading-relaxed">
            {loginMode === 'administrador' ? 'Acesso restrito ao painel administrativo.' : loginSubtitle}
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5 sm:space-y-6" noValidate>
          <div className="space-y-2">
            <label htmlFor={emailId} className="flex items-center gap-2 text-xs sm:text-[10px] font-bold text-primary tracking-wider sm:tracking-widest uppercase ml-1">
              <Mail className="w-3.5 h-3.5 sm:w-3 sm:h-3" /> Email
            </label>
            <input
              id={emailId}
              name={loginMode === 'administrador' ? 'admin-email' : 'email'}
              type="email"
              autoComplete="email"
              autoFocus
              required
              disabled={loading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="exemplo@empresa.com"
              className="w-full min-h-14 bg-black/40 border border-white/5 rounded-2xl py-4 sm:py-4 px-5 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all text-base disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor={passwordId} className="flex items-center gap-2 text-xs sm:text-[10px] font-bold text-primary tracking-wider sm:tracking-widest uppercase ml-1">
              <Lock className="w-3.5 h-3.5 sm:w-3 sm:h-3" /> Senha
            </label>
            <div className="relative">
              <input
                id={passwordId}
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                minLength={8}
                disabled={loading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handlePasswordKey}
                onKeyUp={handlePasswordKey}
                placeholder="Mínimo 8 caracteres"
                  className="w-full min-h-14 bg-black/40 border border-white/5 rounded-2xl py-4 sm:py-4 px-5 pr-12 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all text-base disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                aria-pressed={showPassword}
                className="absolute right-3 top-1/2 -translate-y-1/2 min-h-11 min-w-11 inline-flex items-center justify-center text-gray-500 hover:text-gray-300 transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {capsLock && (
              <p className="flex items-center gap-1.5 text-amber-400 text-[11px] font-medium ml-1" role="status">
                <AlertCircle className="w-3 h-3" /> Caps Lock está ativado
              </p>
            )}
            {password && /^\s|\s$/.test(password) && (
              <p className="flex items-center gap-1.5 text-amber-400 text-[11px] font-medium ml-1" role="status">
                <AlertCircle className="w-3 h-3" /> Sua senha contém espaços no início/fim
              </p>
            )}
          </div>

          {/* Região de erro acessível */}
          <div role="alert" aria-live="assertive" className="min-h-0">
            {errorMsg && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">{errorMsg}</p>
                  {needsConfirmation && (
                    <button
                      type="button"
                      onClick={handleResendConfirmation}
                      disabled={resendingConfirm}
                      className="mt-1 underline underline-offset-2 hover:text-red-300 font-bold disabled:opacity-60"
                    >
                      {resendingConfirm ? 'Reenviando…' : 'Reenviar e-mail de confirmação'}
                    </button>
                  )}
                  {!needsConfirmation && /incorret|credentials/i.test(errorMsg) && (
                    <button
                      type="button"
                      onClick={onOpenRecover}
                      className="mt-1 underline underline-offset-2 hover:text-red-300 font-bold"
                    >
                      Esqueceu a senha?
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <label htmlFor={stayId} className="flex items-center gap-2 cursor-pointer select-none">
              <input
                id={stayId}
                type="checkbox"
                checked={stayLoggedIn}
                onChange={(e) => setStayLoggedIn(e.target.checked)}
                disabled={anyLoading}
                className="w-5 h-5 sm:w-4 sm:h-4 rounded border-white/10 bg-black/40 accent-primary cursor-pointer"
              />
              <span className="text-sm sm:text-[11px] font-medium text-gray-300 leading-tight">Permanecer conectado</span>
            </label>
            <button
              type="button"
              onClick={onOpenRecover}
              disabled={anyLoading}
              className="shrink-0 min-h-11 inline-flex items-center text-sm sm:text-[11px] font-bold text-primary tracking-wide sm:tracking-widest uppercase hover:text-primary-glow transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded"
            >
              Recuperar senha
            </button>
          </div>

          <button
            type="submit"
            disabled={anyLoading || inCooldown}
            aria-busy={loading}
            className="w-full min-h-14 bg-primary text-white font-bold text-base sm:text-sm tracking-wider sm:tracking-widest py-4 rounded-2xl shadow-lg shadow-primary/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> ENTRANDO...</>
            ) : inCooldown ? (
              <>AGUARDE {remainingCooldown}s</>
            ) : (
              <>ENTRAR NO SISTEMA <Zap size={16} /></>
            )}
          </button>


          <div className="flex items-center gap-4 pt-2">
            <div className="h-px flex-1 bg-white/5" />
            <span className="text-gray-500 text-xs sm:text-[10px] font-bold uppercase tracking-widest">ou</span>
            <div className="h-px flex-1 bg-white/5" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={anyLoading}
              className="w-full min-h-12 rounded-2xl bg-black/40 border border-white/5 text-white font-bold text-xs sm:text-[10px] uppercase tracking-wider sm:tracking-[0.15em] flex items-center justify-center gap-2 hover:bg-black/60 transition-all disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              {googleLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GoogleIcon />}
              Google
            </button>
            <button
              type="button"
              onClick={handleAppleLogin}
              disabled={anyLoading}
              className="w-full min-h-12 rounded-2xl bg-black/40 border border-white/5 text-white font-bold text-xs sm:text-[10px] uppercase tracking-wider sm:tracking-[0.15em] flex items-center justify-center gap-2 hover:bg-black/60 transition-all disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              {appleLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
              )}
              Apple
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenRegister}
            disabled={anyLoading}
            className="w-full min-h-11 text-gray-400 hover:text-white font-bold text-xs sm:text-[10px] uppercase tracking-wider sm:tracking-[0.2em] transition-all disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-lg"
          >
            Não tem conta? <span className="text-primary ml-1">Cadastre-se grátis</span>
          </button>

          {/* Prova social + Suporte */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/5">
            <div className="flex items-center gap-1.5 text-xs sm:text-[10px] text-gray-400">
              <div className="flex">
                {[0,1,2,3,4].map(i => <Star key={i} className="w-3.5 h-3.5 sm:w-3 sm:h-3 fill-yellow-400 text-yellow-400" />)}
              </div>
              <span className="font-bold">+2.500 criadores</span>
            </div>
            <a
              href="https://wa.me/5511999999999"
              target="_blank"
              rel="noreferrer"
              className="min-h-11 flex items-center gap-1 text-xs sm:text-[10px] font-bold text-gray-400 hover:text-primary transition-colors"
            >
              <LifeBuoy className="w-3.5 h-3.5 sm:w-3 sm:h-3" /> Suporte
            </a>
          </div>

          <p className="text-center text-xs sm:text-[10px] text-gray-500 leading-relaxed">
            Ao continuar, você concorda com nossos{' '}
            <Link to="/termos" className="text-gray-400 hover:text-primary underline underline-offset-2">Termos</Link>
            {' '}e{' '}
            <Link to="/privacidade" className="text-gray-400 hover:text-primary underline underline-offset-2">Privacidade</Link>.
          </p>

        </form>
      </div>
    </div>
  );
};
