import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.error(
    "Faltan VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY. Configúralas como variables de entorno " +
      "en Vercel/Netlify (o en tu archivo .env local) — ver README.md."
  );
}

export const supabase = createClient(url ?? "", anonKey ?? "");
