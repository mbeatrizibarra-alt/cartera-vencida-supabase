# Dashboard Recuperación de Cartera Vencida — Actuaria Consultores S.A.

Aplicación web completa en **React + TypeScript**, con **Supabase** como backend
(base de datos, autenticación y almacenamiento de documentos). No hay servidor
propio que mantener: Supabase aloja la base de datos PostgreSQL, el login de
usuarios y los archivos adjuntos; esta app es un frontend que se conecta a eso.

## ⚠️ Léeme primero: qué significa "un solo clic" aquí

Vercel y Netlify no ofrecen un botón que despliegue un ZIP suelto sin pasar por
un repositorio Git — **eso lo exigen ellos, no esta app**. El código ya está
100% listo y no necesitas tocar ni una línea, pero el camino real es:

1. Sube esta carpeta a un repositorio de **GitHub** (2 minutos, ver abajo).
2. En Vercel o Netlify, clic en "Import Project" / "Add new site" y eliges ese repositorio.
3. Pegas 2 variables de entorno (las que te da Supabase) en la pantalla del propio Vercel/Netlify.
4. Clic en "Deploy". Eso sí es un solo clic, y no vuelves a tocarlo — cada vez
   que subas un cambio a GitHub, se re-despliega solo.

Ninguna de estas variables ni pasos requieren editar código.

## 1. Crear el proyecto en Supabase (gratis)

1. Ve a [supabase.com](https://supabase.com) → "New Project".
2. Elige un nombre, contraseña de base de datos, y región (elige una cercana, ej. `sa-east-1`).
3. Espera ~2 minutos a que se aprovisione.

## 2. Cargar el esquema y los datos

1. En el panel de Supabase, ve a **SQL Editor → New query**.
2. Abre `supabase/schema.sql` de este proyecto, copia todo su contenido, pégalo y dale **Run**.
3. Repite el mismo paso con `supabase/seed.sql` (carga los 177 clientes reales de
   "Cartera_al_24_de_julio_120dias.xlsx", ya validados y agrupados por RUC/Cédula).

## 3. Obtener tus llaves de conexión

En Supabase: **Project Settings → API**. Copia:
- **Project URL** → será tu `VITE_SUPABASE_URL`
- **anon public key** → será tu `VITE_SUPABASE_ANON_KEY`

(La "anon key" es segura de exponer en el frontend; el acceso real está
controlado por las políticas de seguridad — Row Level Security — que ya vienen
en `schema.sql`: solo usuarios autenticados pueden leer/escribir.)

## 4. Crear los usuarios que van a iniciar sesión

En Supabase: **Authentication → Users → Add user**. Crea uno por cada
colaborador (ej. Cristina, Patricia), con su correo y una contraseña temporal
que luego pueden cambiar. No hace falta tocar código para esto.

## 5. Probarlo en tu computadora (opcional, antes de desplegar)

```bash
npm install
cp .env.example .env
```
Edita `.env` y pega tus 2 valores del paso 3. Luego:
```bash
npm run dev
```
Abre `http://localhost:5173` e inicia sesión con un usuario del paso 4.

## 6. Subir el código a GitHub

```bash
git init
git add .
git commit -m "Dashboard cartera vencida"
```
Crea un repositorio vacío en [github.com/new](https://github.com/new) y sigue las
instrucciones que te da GitHub para conectar tu carpeta local (`git remote add origin ...` y `git push`).

## 7. Desplegar en Vercel (recomendado)

1. Ve a [vercel.com/new](https://vercel.com/new) → conecta tu cuenta de GitHub → elige este repositorio.
2. Vercel detecta automáticamente que es un proyecto Vite (usa `vercel.json` ya incluido).
3. En **Environment Variables**, agrega:
   - `VITE_SUPABASE_URL` = (tu Project URL de Supabase)
   - `VITE_SUPABASE_ANON_KEY` = (tu anon key de Supabase)
4. Clic en **Deploy**. Listo — te da una URL pública (ej. `tuapp.vercel.app`).

## 7b. O desplegar en Netlify

1. Ve a [app.netlify.com](https://app.netlify.com) → "Add new site" → "Import an existing project" → GitHub → elige el repositorio.
2. Netlify detecta la configuración de `netlify.toml` automáticamente.
3. En **Site settings → Environment variables**, agrega las mismas 2 variables del paso anterior.
4. Clic en **Deploy site**.

## 8. Enviar el link a tu equipo

Una vez desplegado, comparte la URL que te dio Vercel/Netlify. Cada persona:
- Inicia sesión con el usuario que le creaste en el paso 4
- Ve y edita **la misma información en tiempo real** — a diferencia de la
  versión anterior en un solo HTML, aquí sí hay una base de datos real
  detrás, sin límites de tamaño para los documentos adjuntos (usa Supabase
  Storage, no está limitado a 5MB compartidos entre todos)

## Qué incluye

- **Autenticación real** por correo/contraseña (Supabase Auth)
- **Dashboard** con KPIs, gráfico de antigüedad y de severidad, ranking de mayores deudores
- **Cartera de clientes**: búsqueda, filtro por estado / severidad / responsable,
  orden por cualquier columna (por defecto: fecha de factura, más reciente primero),
  columna de numeración (#)
- **Ficha de cliente**: datos generales, facturas editables, actividades
  realizadas (con tipo, descripción, próxima acción) y documentos adjuntos
- **Adjuntar comprobantes de pago** — se guardan en Supabase Storage (bucket
  `comprobantes`), sin el límite de 5MB que tenía la versión anterior
- **Responsables** editables desde una tabla de base de datos (`responsables`),
  sin tocar código — hoy son Cristina Porras y Patricia Reyes, se agregan más
  con una fila nueva en Supabase (Table Editor → responsables → Insert row)

## Estructura del proyecto

```
├── supabase/
│   ├── schema.sql     ← tablas, seguridad (RLS), bucket de almacenamiento
│   └── seed.sql        ← los 177 clientes reales ya cargados y validados
├── src/
│   ├── lib/             ← cliente de Supabase y funciones de acceso a datos
│   ├── context/         ← sesión de autenticación
│   ├── components/      ← layout, gráficos, modales
│   ├── pages/            ← Login, Dashboard, Cartera de clientes, Ficha de cliente
│   └── types.ts          ← estados, severidad, tipos de actividad
├── vercel.json
├── netlify.toml
└── .env.example
```

## Extender más adelante (sin ayuda técnica)

- **Agregar un responsable nuevo**: Supabase → Table Editor → `responsables` → Insert row.
- **Agregar un usuario nuevo**: Supabase → Authentication → Users → Add user.
- **Ver/editar datos directamente**: Supabase → Table Editor → cualquier tabla.
- **Ver los archivos subidos**: Supabase → Storage → bucket `comprobantes`.
