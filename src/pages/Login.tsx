import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import actuariaLogo from "../assets/actuaria-logo.png";

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
    <div className="ac-login">
      <div className="ac-login-card">
        <div className="text-center mb-7">
          <img src={actuariaLogo} alt="Actuaria Consultores S.A." className="h-7 w-auto mx-auto mb-5" />
          <span className="ac-eyebrow block mb-2.5">Recuperación de cartera</span>
          <h1 className="ac-display m-0" style={{ fontSize: 26, textTransform: "uppercase", letterSpacing: ".05em" }}>
            Cartera Vencida
          </h1>
          <div
            className="mx-auto mt-4"
            style={{ width: 56, height: 3, borderRadius: 2, background: "linear-gradient(90deg,var(--ac-navy) 0%,var(--ac-blue) 55%,var(--ac-orange) 100%)" }}
          />
        </div>

        <form onSubmit={handleSubmit} autoComplete="on" className="flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="ac-label block mb-2">Correo</label>
            <input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="ac-field" />
          </div>
          <div>
            <label htmlFor="password" className="ac-label block mb-2">Contraseña</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="ac-field" />
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer" style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
            <input type="checkbox" checked={recordar} onChange={(e) => setRecordar(e.target.checked)} style={{ accentColor: "var(--ac-blue)" }} />
            Recordar mi correo en este dispositivo
          </label>
          {error && <p style={{ fontSize: 13, color: "var(--ac-red)", margin: 0 }}>{error}</p>}
          <button type="submit" disabled={loading} className="ac-btn ac-btn-primary justify-center mt-1" style={{ width: "100%", padding: "13px", fontSize: 13.5 }}>
            {loading && <Loader2 size={16} className="animate-spin" />}
            Ingresar
          </button>
        </form>

        <p className="text-center mt-7 pt-5" style={{ fontSize: 11.5, color: "var(--ink-soft)", borderTop: "1px solid var(--line)", lineHeight: 1.65 }}>
          Acceso restringido a colaboradores autorizados. Los usuarios se crean desde el panel de Supabase (Authentication → Users).
        </p>
      </div>
    </div>
  );
}
