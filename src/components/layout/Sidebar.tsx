import { NavLink, Link } from "react-router-dom";
import { LayoutDashboard, Landmark, Trophy, FileSpreadsheet } from "lucide-react";
import actuariaLogo from "../../assets/actuaria-logo.png";
import anklaLogo from "../../assets/ankla-logo.png";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/clients", label: "Cartera de clientes", icon: Landmark },
  { to: "/team", label: "Desempeño", icon: Trophy },
  { to: "/import", label: "Cargar Excel", icon: FileSpreadsheet },
];

export function Sidebar() {
  return (
    <aside className="w-64 shrink-0 bg-corporate-blue text-white flex flex-col h-screen sticky top-0">
      <Link to="/" className="block px-5 py-5 border-b border-white/10 hover:opacity-90 transition-opacity">
        <div className="bg-white rounded-xl p-3.5 flex flex-col items-center gap-3 shadow-sm">
          <img src={actuariaLogo} alt="Actuaria Consultores S.A." className="h-6 w-auto" />
          <div className="w-full h-px bg-slate-200" />
          <img src={anklaLogo} alt="ANKLA Soluciones Corporativas" className="h-14 w-auto" />
        </div>
        <p className="text-xs text-blue-200 mt-3 text-center">Recuperación de Cartera Vencida</p>
      </Link>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? "bg-white/15 text-white" : "text-blue-100 hover:bg-white/10 hover:text-white"
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="px-6 py-4 border-t border-white/10 text-xs text-blue-200">ACTUARIA CONSULTORES S.A.</div>
    </aside>
  );
}
