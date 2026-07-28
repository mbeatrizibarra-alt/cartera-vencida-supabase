import { LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export function Topbar({ title }: { title: string }) {
  const { session, signOut } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10">
      <h1 className="text-lg font-semibold text-slate-800">{title}</h1>
      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-600">{session?.user.email}</span>
        <button onClick={signOut} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-corporate-blue" title="Cerrar sesión">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
