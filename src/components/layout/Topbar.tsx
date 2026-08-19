import { LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export function Topbar({ title }: { title: string }) {
  const { session, signOut } = useAuth();
  const email = session?.user.email ?? "";
  const iniciales = email.slice(0, 2).toUpperCase();

  return (
    <header
      className="h-[68px] flex items-center justify-between px-6 sticky top-0 z-10"
      style={{ background: "var(--neu)", borderBottom: "1px solid var(--line)" }}
    >
      <h1 className="ac-display m-0" style={{ fontSize: 19, textTransform: "uppercase", letterSpacing: ".04em" }}>
        {title}
      </h1>
      <div className="flex items-center gap-3">
        <div
          className="flex items-center gap-2.5 pl-1.5 pr-3.5 py-1.5"
          style={{ background: "var(--neu)", borderRadius: 999, boxShadow: "var(--neu-raised-sm)" }}
        >
          <span
            className="flex items-center justify-center text-white"
            style={{
              width: 32, height: 32, borderRadius: 999,
              background: "linear-gradient(135deg,var(--ac-blue) 0%,var(--ac-navy) 100%)",
              fontFamily: "var(--font-heading)", fontSize: 11, fontWeight: 800,
            }}
          >
            {iniciales}
          </span>
          <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{email}</span>
        </div>
        <button onClick={signOut} className="ac-icon-btn" title="Cerrar sesión">
          <LogOut size={17} />
        </button>
      </div>
    </header>
  );
}
