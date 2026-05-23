import React from 'react';
import { Link } from '@tanstack/react-router';
import { Infinity as InfinityIcon, MessageSquare, Github, Instagram, Youtube, Twitter, Facebook, Linkedin, Globe as GlobeIcon, Music2 } from 'lucide-react';
import { useSiteSettings, type SocialLink } from '@/lib/site-settings-store';

const ICONS: Record<SocialLink['platform'], any> = {
  instagram: Instagram,
  youtube: Youtube,
  tiktok: Music2,
  twitter: Twitter,
  facebook: Facebook,
  linkedin: Linkedin,
  github: Github,
  website: GlobeIcon,
};

export const PublicFooter = () => {
  const { brandName, brandAccent, logoUrl, socials, whatsappNumber } = useSiteSettings();
  const activeSocials = socials.filter((s) => s.url.trim().length > 0);

  return (
    <footer className="border-t border-white/5 bg-black py-16 px-6 relative z-20">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-12 mb-16">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-6">
              {logoUrl ? (
                <img src={logoUrl} alt={brandName} className="w-8 h-8 rounded-lg object-cover" />
              ) : (
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <InfinityIcon className="w-5 h-5 text-white" />
                </div>
              )}
              <span className="text-lg font-bold tracking-tighter text-white">{brandName} <span className="text-primary">{brandAccent}</span></span>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">
              A plataforma definitiva para criadores que buscam escala e inteligência em seus fluxos de trabalho.
            </p>
            {activeSocials.length > 0 && (
              <div className="flex items-center gap-3 flex-wrap">
                {activeSocials.map((s, i) => {
                  const Icon = ICONS[s.platform];
                  return (
                    <a
                      key={i}
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={s.platform}
                      className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary/20 transition-colors text-gray-300 hover:text-primary"
                    >
                      <Icon className="w-5 h-5" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4 md:contents">
            <div>
              <h4 className="text-white font-bold text-xs md:text-sm mb-4 md:mb-6">Plataforma</h4>
              <ul className="space-y-3 md:space-y-4">
                <li><Link to="/login" className="text-gray-500 text-xs md:text-sm hover:text-white transition-colors">Início</Link></li>
                <li><Link to="/planos" className="text-gray-500 text-xs md:text-sm hover:text-white transition-colors">Preços</Link></li>
                <li><Link to="/ecosistema" className="text-gray-500 text-xs md:text-sm hover:text-white transition-colors">Ecossistema</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold text-xs md:text-sm mb-4 md:mb-6">Empresa</h4>
              <ul className="space-y-3 md:space-y-4">
                <li><Link to="/quem-somos" className="text-gray-500 text-xs md:text-sm hover:text-white transition-colors">Sobre Nós</Link></li>
                <li><Link to="/suporte" className="text-gray-500 text-xs md:text-sm hover:text-white transition-colors">Contato</Link></li>
                <li><Link to="/blog" className="text-gray-500 text-xs md:text-sm hover:text-white transition-colors">Blog</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold text-xs md:text-sm mb-4 md:mb-6">Suporte</h4>
              <ul className="space-y-3 md:space-y-4">
                <li><Link to="/documentacao" className="text-gray-500 text-xs md:text-sm hover:text-white transition-colors">Documentação</Link></li>
                <li><Link to="/central-ajuda" className="text-gray-500 text-xs md:text-sm hover:text-white transition-colors">Central de Ajuda</Link></li>
                <li><a href={`https://wa.me/${whatsappNumber.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-gray-500 text-xs md:text-sm hover:text-white transition-colors">WhatsApp</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-600 text-xs">© {new Date().getFullYear()} {brandName} {brandAccent}. Todos os direitos reservados.</p>
          <div className="flex items-center gap-6">
            <Link to="/termos" className="text-gray-600 text-xs hover:text-white">Termos de Uso</Link>
            <Link to="/privacidade" className="text-gray-600 text-xs hover:text-white">Privacidade</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
