# Rediseño Actuaria DS — cómo publicarlo en el link compartido

Son **12 archivos** que reemplazan a los que ya existen. Ninguno cambia la lógica,
las consultas a Supabase ni las rutas: solo el aspecto.

## 1. Copiar los archivos

Descomprime esta carpeta y copia su contenido **encima** de tu proyecto
`cartera-vencida-supabase`, respetando las rutas. Quedan reemplazados:

```
tailwind.config.js
src/index.css
src/pages/Login.tsx
src/pages/Dashboard.tsx
src/components/ui/Card.tsx
src/components/ui/Badge.tsx
src/components/ui/ModalShell.tsx
src/components/ui/MultiSelectDropdown.tsx
src/components/dashboard/KpiCard.tsx
src/components/dashboard/Charts.tsx
src/components/layout/Sidebar.tsx
src/components/layout/Topbar.tsx
```

Las demás pantallas (ClientsList, ClientDetail, TeamPerformance, ExcelImport,
ClientNew) **no se tocan**: heredan el estilo nuevo automáticamente.

## 2. Probarlo en tu computadora (recomendado)

```bash
npm run dev
```

Abre `http://localhost:5173`. Si algo se ve raro, avísame antes de publicar.

## 3. Publicarlo en el link compartido

```bash
git add .
git commit -m "Rediseño con Actuaria DS"
git push
```

Vercel/Netlify detecta el push y vuelve a desplegar solo, en 1–2 minutos.
La URL que ya compartiste con tu equipo es la misma — no cambia.

## Notas

- **Tipografías**: Jost, Nunito y Prompt se cargan desde Google Fonts dentro de
  `src/index.css`. Cuando tengas los archivos de Lemon Milk Pro, se cambia Jost
  por la tipografía oficial de marca en una sola línea.
- **Iconos**: se mantiene `lucide-react`, que ya usabas. El brandbook pide la
  librería propia de 770 iconos de trazo; cuando la tengas se sustituye.
- **Los colores viejos siguen existiendo** (`corporate-blue`, `status-red`…) para
  que las pantallas no editadas compilen; ahora apuntan a la paleta Actuaria.
