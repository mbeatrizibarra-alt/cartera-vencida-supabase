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
    <aside
      className="w-[264px] shrink-0 text-white flex flex-col h-screen sticky top-0 relative overflow-hidden"
      style={{ background: "linear-gradient(180deg,var(--ac-navy) 0%,var(--ac-navy-900) 100%)" }}
    >
      {/* textura de marca: retícula de carta de navegación */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.07) 1px,transparent 1.1px)", backgroundSize: "26px 26px" }}
      />
      <Link to="/" className="relative block px-5 py-5 hover:opacity-95 transition-opacity" style={{ borderBottom: "1px solid rgba(255,255,255,.10)" }}>
        <div className="bg-white rounded-2xl p-4 flex flex-col items-center gap-3" style={{ boxShadow: "0 8px 20px rgba(0,0,0,.22)" }}>
          <img src={actuariaLogo} alt="Actuaria Consultores S.A." className="h-6 w-auto" />
          <div className="w-full h-px" style={{ background: "var(--line)" }} />
          <img src={anklaLogo} alt="ANKLA Soluciones Corporativas" className="h-14 w-auto" />
        </div>
        <p
          className="mt-3 text-center"
          style={{ fontFamily: "var(--font-heading)", fontSize: 10, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--ac-sky)" }}
        >
          Recuperación de Cartera Vencida
        </p>
      </Link>

      <nav className="relative flex-1 px-3 py-4 flex flex-col gap-[3px]">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => `ac-nav-item ${isActive ? "is-active" : ""}`}>
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div
        className="relative px-6 py-4"
        style={{
          borderTop: "1px solid rgba(255,255,255,.10)",
          fontFamily: "var(--font-heading)",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: ".08em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,.34)",
        }}
      >
        Actuaria Consultores S.A.
      </div>
    </aside>
  );
}
