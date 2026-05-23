import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User, Zap, Loader2 } from 'lucide-react';
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RecoverPasswordModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const [email, setEmail] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => { document.removeEventListener('keydown', onKey); clearTimeout(t); };
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      toast.error('Por favor, insira um e-mail válido.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Link enviado para ${email} ✓`);
    onClose();
  };


  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/75-[4px]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-[440px] bg-[#141414] border border-[var(--primary)] rounded-[20px] p-8 md:p-9 shadow-[0_0_40px_rgb(var(--primary-rgb) / 0.25)]"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-[#888888] hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
            <h2 className="text-2xl font-semibold text-white mb-2 font-outfit">Recuperar senha</h2>
            <p className="text-[#888888] text-sm mb-6 font-outfit">
              Digite seu e-mail e enviaremos um link para redefinir sua senha.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-white text-[13px] font-medium font-outfit">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#888888]" size={18} />
                  <input
                    ref={inputRef}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Digite seu e-mail"
                    className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl py-3.5 pl-11 pr-4 text-white placeholder:text-[#888888] focus:border-[var(--primary)] focus:ring-3 focus:ring-[var(--primary)]/15 outline-none transition-all font-outfit"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                aria-busy={loading}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-[#FF4500] via-[var(--primary)] to-[var(--primary-glow)] text-white font-semibold flex items-center justify-center gap-2 shadow-[0_4px_24px_rgb(var(--primary-rgb) / 0.45)] hover:-translate-y-0.5 active:scale-[0.98] transition-all font-outfit disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {loading ? <><Loader2 size={18} className="animate-spin" /> Enviando...</> : <><Mail size={18} /> Enviar link de recuperação</>}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export const RegisterModal: React.FC<ModalProps & { onRegisterSuccess: (name: string, email: string) => void }> = ({ 
  isOpen, 
  onClose,
  onRegisterSuccess
}) => {
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    password: '',
    confirm: '',
  });

  const [loading, setLoading] = React.useState(false);
  const firstInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const t = setTimeout(() => firstInputRef.current?.focus(), 50);
    return () => { document.removeEventListener('keydown', onKey); clearTimeout(t); };
  }, [isOpen, onClose]);

  const pwdStrength = React.useMemo(() => {
    const p = formData.password;
    let s = 0;
    if (p.length >= 8) s++;
    if (p.length >= 12) s++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
    if (/\d/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    const labels = ['Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Forte', 'Muito forte'];
    const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500', 'bg-emerald-500'];
    return { score: s, label: labels[s], color: colors[s] };
  }, [formData.password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || formData.password.length < 8) {
      toast.error('Preencha todos os campos corretamente (senha mín. 8 caracteres).');
      return;
    }
    if (formData.password !== formData.confirm) {
      toast.error('As senhas não coincidem.');
      return;
    }
    if (!formData.email.includes('@')) {
      toast.error('Por favor, insira um e-mail válido.');
      return;
    }



    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: formData.email.trim(),
      password: formData.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { name: formData.name },
      },
    });
    setLoading(false);

    if (error) {
      toast.error(error.message.includes('already') ? 'Este e-mail já está cadastrado.' : error.message);
      return;
    }

    toast.success(`Conta criada! Verifique seu e-mail para confirmar. ✓`);
    onRegisterSuccess(formData.name, formData.email);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/75-[4px]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-[440px] bg-[#141414] border border-[var(--primary)] rounded-[20px] p-8 md:p-9 shadow-[0_0_40px_rgb(var(--primary-rgb) / 0.25)]"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-[#888888] hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
            <h2 className="text-2xl font-semibold text-white mb-6 font-outfit">Criar conta</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-white text-[13px] font-medium font-outfit">Nome completo</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#888888]" size={18} />
                  <input
                    ref={firstInputRef}
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Seu nome completo"
                    className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl py-3.5 pl-11 pr-4 text-white placeholder:text-[#888888] focus:border-[var(--primary)] focus:ring-3 focus:ring-[var(--primary)]/15 outline-none transition-all font-outfit"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-white text-[13px] font-medium font-outfit">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#888888]" size={18} />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Seu melhor e-mail"
                    className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl py-3.5 pl-11 pr-4 text-white placeholder:text-[#888888] focus:border-[var(--primary)] focus:ring-3 focus:ring-[var(--primary)]/15 outline-none transition-all font-outfit"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-white text-[13px] font-medium font-outfit">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#888888]" size={18} />
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Mínimo 8 caracteres"
                    minLength={8}
                    className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl py-3.5 pl-11 pr-4 text-white placeholder:text-[#888888] focus:border-[var(--primary)] focus:ring-3 focus:ring-[var(--primary)]/15 outline-none transition-all font-outfit"
                  />
                </div>
                {formData.password && (
                  <div className="space-y-1 pt-1">
                    <div className="flex gap-1">
                      {[0,1,2,3,4].map((i) => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < pwdStrength.score ? pwdStrength.color : 'bg-white/5'}`} />
                      ))}
                    </div>
                    <p className="text-[10px] text-[#888888]">Força: <span className="text-white">{pwdStrength.label}</span></p>
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-white text-[13px] font-medium font-outfit">Confirmar senha</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#888888]" size={18} />
                  <input
                    type="password"
                    value={formData.confirm}
                    onChange={(e) => setFormData({ ...formData, confirm: e.target.value })}
                    placeholder="Repita a senha"
                    className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl py-3.5 pl-11 pr-4 text-white placeholder:text-[#888888] focus:border-[var(--primary)] focus:ring-3 focus:ring-[var(--primary)]/15 outline-none transition-all font-outfit"
                  />
                </div>
                {formData.confirm && formData.password !== formData.confirm && (
                  <p className="text-amber-400 text-[11px]">As senhas não coincidem</p>
                )}
              </div>
              <button
                type="submit"
                disabled={loading}
                aria-busy={loading}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-[#FF4500] via-[var(--primary)] to-[var(--primary-glow)] text-white font-semibold flex items-center justify-center gap-2 shadow-[0_4px_24px_rgb(var(--primary-rgb) / 0.45)] hover:-translate-y-0.5 active:scale-[0.98] transition-all mt-4 font-outfit disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? <><Loader2 size={18} className="animate-spin" /> Criando…</> : <><Zap size={18} /> Criar minha conta</>}
              </button>

            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
