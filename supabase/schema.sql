-- =============================================================================
-- ESQUEMA — Dashboard Recuperación de Cartera Vencida (Actuaria Consultores S.A.)
-- Ejecutar completo en: Supabase Dashboard > SQL Editor > New query > Run
-- =============================================================================

-- ---------------------------------------------------------------------------
-- EXTENSIONES
-- ---------------------------------------------------------------------------
create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- PERFILES (se crea automáticamente cuando alguien se registra en Supabase Auth)
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  role text not null default 'gestor' check (role in ('admin','gestor','consulta')),
  created_at timestamptz not null default now()
);

-- Crea el perfil automáticamente al registrarse un usuario nuevo
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email), 'gestor');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- RESPONSABLES (lista editable de gestores de cobranza asignables a cuentas,
-- sin necesidad de tocar código — solo agregar/quitar filas en esta tabla)
-- ---------------------------------------------------------------------------
create table if not exists responsables (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  activo boolean not null default true
);

insert into responsables (name) values ('Cristina Porras'), ('Patricia Reyes')
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- CLIENTES
-- ---------------------------------------------------------------------------
create table if not exists clients (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  tax_id text not null,
  email text,
  phone text,
  observaciones text default '',
  estado text not null default 'Sin gestión',
  responsable_id uuid references responsables(id),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_clients_tax_id on clients(tax_id);
create index if not exists idx_clients_estado on clients(estado);

-- ---------------------------------------------------------------------------
-- FACTURAS
-- ---------------------------------------------------------------------------
create table if not exists invoices (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references clients(id) on delete cascade,
  numero text not null default '',
  fecha date,
  saldo numeric(14,2) not null default 0,
  dias_mora integer not null default 0,
  condicion text default '',
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_invoices_client on invoices(client_id);

-- ---------------------------------------------------------------------------
-- ACTIVIDADES REALIZADAS (historial de gestión de cobranza por cliente)
-- ---------------------------------------------------------------------------
create table if not exists activities (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references clients(id) on delete cascade,
  user_id uuid references auth.users(id),
  tipo text not null default 'Otro',
  descripcion text not null,
  proxima_accion text,
  proxima_fecha date,
  created_at timestamptz not null default now()
);

create index if not exists idx_activities_client on activities(client_id, created_at desc);

-- ---------------------------------------------------------------------------
-- DOCUMENTOS (metadatos; el archivo real vive en Supabase Storage)
-- ---------------------------------------------------------------------------
create table if not exists documents (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references clients(id) on delete cascade,
  activity_id uuid references activities(id) on delete set null,
  storage_path text not null,
  file_name text not null,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_documents_client on documents(client_id);

-- ---------------------------------------------------------------------------
-- STORAGE: bucket para comprobantes de pago y otros documentos
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('comprobantes', 'comprobantes', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- Regla simple para un equipo interno: cualquier usuario autenticado (que haya
-- iniciado sesión con su cuenta de Supabase Auth) puede leer y escribir.
-- Si luego quieres roles más finos (ej. "consulta" solo lectura), se ajusta
-- aquí sin tocar el código de la aplicación.
-- ---------------------------------------------------------------------------
alter table profiles enable row level security;
alter table responsables enable row level security;
alter table clients enable row level security;
alter table invoices enable row level security;
alter table activities enable row level security;
alter table documents enable row level security;

create policy "profiles: lectura autenticados" on profiles for select using (auth.role() = 'authenticated');
create policy "profiles: el usuario edita su propio perfil" on profiles for update using (auth.uid() = id);

create policy "responsables: todo autenticados" on responsables for all using (auth.role() = 'authenticated');
create policy "clients: todo autenticados" on clients for all using (auth.role() = 'authenticated');
create policy "invoices: todo autenticados" on invoices for all using (auth.role() = 'authenticated');
create policy "activities: todo autenticados" on activities for all using (auth.role() = 'authenticated');
create policy "documents: todo autenticados" on documents for all using (auth.role() = 'authenticated');

create policy "storage: lectura autenticados"
  on storage.objects for select
  using (bucket_id = 'comprobantes' and auth.role() = 'authenticated');

create policy "storage: subida autenticados"
  on storage.objects for insert
  with check (bucket_id = 'comprobantes' and auth.role() = 'authenticated');

create policy "storage: borrado autenticados"
  on storage.objects for delete
  using (bucket_id = 'comprobantes' and auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- updated_at automático en clients
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_clients_updated_at on clients;
create trigger trg_clients_updated_at
  before update on clients
  for each row execute function set_updated_at();
