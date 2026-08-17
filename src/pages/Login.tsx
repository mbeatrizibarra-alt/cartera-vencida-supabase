import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const REMEMBERED_EMAIL_KEY = "cartera_remembered_email";

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(() => localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? "");
  const [password, setPassword] = useState("");
  const [recordar, setRecordar] = useState(() => !!localStorage.getItem(REMEMBERED_EMAIL_KEY));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
      if (recordar) localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
      else localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-corporate-blue flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="p-3 bg-blue-50 rounded-xl mb-3">
            <ShieldCheck size={28} className="text-corporate-blue" />
          </div>
          <h1 className="text-lg font-bold text-slate-800 text-center">Dashboard Recuperación de Cartera Vencida</h1>
          <p className="text-xs text-slate-500 text-center mt-1">Actuaria Consultores S.A.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Correo</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input type="checkbox" checked={recordar} onChange={(e) => setRecordar(e.target.checked)} className="rounded border-slate-300" />
            Recordar mi correo en este dispositivo
          </label>
          {error && <p className="text-sm text-status-red">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-corporate-blue text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-corporate-blueLight disabled:opacity-60 flex items-center justify-center gap-2">
            {loading && <Loader2 size={16} className="animate-spin" />}
            Ingresar
          </button>
        </form>
        <p className="text-xs text-slate-400 text-center mt-6">
          Acceso restringido a colaboradores autorizados. Los usuarios se crean desde el panel de Supabase (Authentication → Users).
        </p>
        <p className="text-xs text-slate-300 text-center mt-2">
          Tip: tu navegador puede ofrecerte guardar la contraseña de forma segura y autocompletarla la próxima vez.
        </p>
      </div>
    </div>
  );
}
