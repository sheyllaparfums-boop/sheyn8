import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface NavLinkItem {
  name: string;
  href: string;
  newTab?: boolean;
}

export interface SocialLink {
  platform: 'instagram' | 'youtube' | 'tiktok' | 'twitter' | 'facebook' | 'linkedin' | 'github' | 'website';
  url: string;
}

export interface SiteSettings {
  // Branding
  brandName: string;
  brandAccent: string; // ex.: "N8N"
  logoUrl: string; // base64 ou URL
  primaryColor: string; // hex
  accentColor: string; // hex

  // Header / navegação
  navLinks: NavLinkItem[];
  showGithub: boolean;
  showGlobe: boolean;
  ctaLabel: string;

  // Hero
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  heroCtaPrimary: string;
  heroCtaSecondary: string;
  heroBgImage: string; // base64 ou URL (opcional)

  // Card de login
  loginTitle: string;
  loginSubtitle: string;

  // WhatsApp
  whatsappNumber: string;
  whatsappLabel: string;
  showWhatsappBubble: boolean;

  // Redes sociais (rodapé)
  socials: SocialLink[];

  // SEO
  seoTitle: string;
  seoDescription: string;
  seoOgImage: string;

  // Metadata
  lastSavedAt: number | null;
}

interface SiteSettingsStore extends SiteSettings {
  update: (patch: Partial<SiteSettings>) => void;
  setNavLink: (index: number, patch: Partial<NavLinkItem>) => void;
  addNavLink: () => void;
  removeNavLink: (index: number) => void;
  moveNavLink: (from: number, to: number) => void;
  setSocial: (index: number, patch: Partial<SocialLink>) => void;
  addSocial: () => void;
  removeSocial: (index: number) => void;
  markSaved: () => void;
  reset: () => void;
}

const DEFAULTS: SiteSettings = {
  brandName: 'SHEY',
  brandAccent: 'N8N',
  logoUrl: '',
  primaryColor: '#8b5cf6',
  accentColor: '#a78bfa',
  navLinks: [
    { name: 'Início', href: '/login', newTab: false },
    { name: 'Planos', href: '/planos', newTab: false },
    { name: 'Sobre', href: '/quem-somos', newTab: false },
    { name: 'Ecossistema', href: '/ecosistema', newTab: false },
    { name: 'Suporte', href: '/suporte', newTab: false },
  ],
  showGithub: true,
  showGlobe: true,
  ctaLabel: 'Entrar',
  heroBadge: 'Nova Versão 3.0 disponível',
  heroTitle: 'O ecossistema que conecta canais, automação e IA em um só lugar',
  heroSubtitle:
    'A SHEY N8N unifica seus canais, fluxos, agentes inteligentes e integrações em uma plataforma completa e simples, acessível e pronta para escalar.',
  heroCtaPrimary: 'Em Breve',
  heroCtaSecondary: 'Conhecer a Plataforma',
  heroBgImage: '',
  loginTitle: 'Bem-vindo de volta',
  loginSubtitle:
    'Entre com suas credenciais para acessar o painel de controle e automações.',
  whatsappNumber: '5582996961448',
  whatsappLabel: 'Fale com a gente',
  showWhatsappBubble: true,
  socials: [
    { platform: 'instagram', url: '' },
    { platform: 'youtube', url: '' },
  ],
  seoTitle: 'SHEY N8N — Ecossistema de Automação & IA',
  seoDescription: 'Unifique canais, fluxos, agentes inteligentes e integrações em uma plataforma simples, acessível e pronta para escalar.',
  seoOgImage: '',
  lastSavedAt: null,
};

export const useSiteSettings = create<SiteSettingsStore>()(
  persist(
    (set, get) => ({
      ...DEFAULTS,
      update: (patch) => set({ ...patch, lastSavedAt: Date.now() }),
      setNavLink: (index, patch) => {
        const navLinks = [...get().navLinks];
        navLinks[index] = { ...navLinks[index], ...patch };
        set({ navLinks, lastSavedAt: Date.now() });
      },
      addNavLink: () =>
        set({
          navLinks: [...get().navLinks, { name: 'Novo', href: '/', newTab: false }],
          lastSavedAt: Date.now(),
        }),
      removeNavLink: (index) =>
        set({
          navLinks: get().navLinks.filter((_, i) => i !== index),
          lastSavedAt: Date.now(),
        }),
      moveNavLink: (from, to) => {
        const navLinks = [...get().navLinks];
        if (to < 0 || to >= navLinks.length) return;
        const [item] = navLinks.splice(from, 1);
        navLinks.splice(to, 0, item);
        set({ navLinks, lastSavedAt: Date.now() });
      },
      setSocial: (index, patch) => {
        const socials = [...get().socials];
        socials[index] = { ...socials[index], ...patch };
        set({ socials, lastSavedAt: Date.now() });
      },
      addSocial: () =>
        set({
          socials: [...get().socials, { platform: 'website', url: '' }],
          lastSavedAt: Date.now(),
        }),
      removeSocial: (index) =>
        set({
          socials: get().socials.filter((_, i) => i !== index),
          lastSavedAt: Date.now(),
        }),
      markSaved: () => set({ lastSavedAt: Date.now() }),
      reset: () => set({ ...DEFAULTS, lastSavedAt: Date.now() }),
    }),
    {
      name: 'sheyn8n.site-settings',
      version: 2,
      migrate: (persisted) => persisted as SiteSettingsStore,
    }
  )
);
