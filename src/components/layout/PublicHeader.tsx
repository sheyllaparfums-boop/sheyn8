import React, { useState, useEffect } from 'react';
import { useLocation, Link } from '@tanstack/react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { Infinity as InfinityIcon, Github, Globe, Menu, X } from 'lucide-react';
import { useSiteSettings } from '@/lib/site-settings-store';

export const PublicHeader = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { navLinks, showGithub, showGlobe, ctaLabel, brandName, brandAccent, logoUrl, primaryColor } = useSiteSettings();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Aplica cor primária custom como CSS variable no documento
  useEffect(() => {
    if (primaryColor) {
      document.documentElement.style.setProperty('--brand-primary', primaryColor);
    }
  }, [primaryColor]);

  const isActive = (href: string) => {
    if (href === '/login') {
      return location.pathname === '/login' && !new URLSearchParams(location.search).has('action');
    }
    return location.pathname === href;
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${isScrolled ? 'bg-[#050505] border-b border-white/5 py-3' : 'bg-transparent py-5'}`}>
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <Link to="/login" className="flex items-center gap-2">
          {logoUrl ? (
            <img src={logoUrl} alt={brandName} className="w-8 h-8 rounded-lg object-cover" />
          ) : (
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
              <InfinityIcon className="w-5 h-5 text-white" />
            </div>
          )}
          <span className="text-lg font-bold tracking-tighter text-white">{brandName} <span className="text-primary">{brandAccent}</span></span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => {
            const isInternal = link.href.startsWith('/') && !link.newTab;
            const cls = `text-sm font-medium transition-colors ${isActive(link.href) ? 'text-white' : 'text-gray-400 hover:text-white'}`;
            return isInternal ? (
              <Link key={link.name + link.href} to={link.href} className={cls}>
                {link.name}
              </Link>
            ) : (
              <a
                key={link.name + link.href}
                href={link.href}
                target={link.newTab ? '_blank' : undefined}
                rel={link.newTab ? 'noreferrer' : undefined}
                className={cls}
              >
                {link.name}
              </a>
            );
          })}
        </nav>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-4 mr-4">
            {showGithub && <Github className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />}
            {showGlobe && <Globe className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />}
          </div>
          <Link 
            to="/login"
            search={{ action: 'login' }}
            className={`px-5 py-2 rounded-xl border text-xs font-bold transition-all hidden sm:block ${
              new URLSearchParams(location.search).get('action') === 'login'
                ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                : 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20'
            }`}
          >
            {ctaLabel}
          </Link>
          <button className="md:hidden text-white" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-[#050505] border-b border-white/5 overflow-hidden"
          >
            <nav className="flex flex-col p-6 gap-4">
              {navLinks.map((link) => {
                const isInternal = link.href.startsWith('/') && !link.newTab;
                const cls = `text-base font-bold transition-colors ${isActive(link.href) ? 'text-primary' : 'text-gray-400'}`;
                const close = () => setIsMobileMenuOpen(false);
                return isInternal ? (
                  <Link key={link.name + link.href} to={link.href} onClick={close} className={cls}>
                    {link.name}
                  </Link>
                ) : (
                  <a
                    key={link.name + link.href}
                    href={link.href}
                    target={link.newTab ? '_blank' : undefined}
                    rel={link.newTab ? 'noreferrer' : undefined}
                    onClick={close}
                    className={cls}
                  >
                    {link.name}
                  </a>
                );
              })}
              <div className="pt-4 border-t border-white/5 flex gap-6">
                {showGithub && <Github className="w-6 h-6 text-gray-400" />}
                {showGlobe && <Globe className="w-6 h-6 text-gray-400" />}
              </div>
              <Link 
                to="/login"
                search={{ action: 'login' }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="mt-4 w-full py-4 rounded-xl bg-primary text-white text-center font-bold"
              >
                {ctaLabel}
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
