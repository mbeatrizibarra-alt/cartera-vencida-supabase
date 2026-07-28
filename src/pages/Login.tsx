import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Correo</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </div>
          {error && <p className="text-sm text-status-red">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-corporate-blue text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-corporate-blueLight disabled:opacity-60 flex items-center justify-center gap-2">
            {loading && <Loader2 size={16} className="animate-spin" />}
            Ingresar
          </button>
        </form>
        <p className="text-xs text-slate-400 text-center mt-6">
          Acceso restringido a colaboradores autorizados. Los usuarios se crean desde el panel de Supabase (Authentication → Users).
        </p>
      </div>
    </div>
  );
}
