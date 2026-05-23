import * as React from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Home, Workflow, Settings, User, Bot, LifeBuoy } from "lucide-react";

const items = [
  { to: "/", label: "Início", icon: Home },
  { to: "/automacoes-ia", label: "SHEY AI", icon: Bot },
  { to: "/workflows", label: "Fluxos", icon: Workflow },
  { to: "/user", label: "Perfil", icon: User },
  { to: "/configuracoes", label: "Ajustes", icon: Settings },
  { to: "/suporte", label: "Suporte", icon: LifeBuoy },
];

export function MobileBottomNav() {
  const location = useLocation();
  const pathname = location.pathname;
  
  // Only show for authenticated pages (not login, plans, etc.)
  const publicPages = ["/login", "/planos", "/quem-somos", "/ecosistema", "/suporte"];
  if (publicPages.includes(pathname)) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] border-t border-white/5 bg-black/95 md:hidden pb-safe">
      <ul className="flex items-center justify-around px-2 py-2">
        {items.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                className={`flex flex-col items-center gap-1 py-1 text-[10px] font-bold uppercase tracking-tighter transition-all duration-300 ${
                  active ? "text-primary scale-110" : "text-gray-500 hover:text-white"
                }`}
              >
                <div className={`p-1.5 rounded-xl transition-all ${active ? "bg-primary/10 shadow-[0_0_10px_rgba(var(--primary-rgb),0.2)]" : ""}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="truncate max-w-full">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}