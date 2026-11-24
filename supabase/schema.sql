-- Esquema de Finanzas Personales (basado en plan-financiero-mexico.xlsx)
-- Ejecutar una vez en Supabase: SQL Editor > New query > pegar > Run

-- 1. Categorías (equivalen a los renglones de la hoja "Presupuesto Mensual")
create table if not exists public.categorias (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  grupo       text not null check (grupo in ('ingresos','esenciales','deudas_emergencia','estilo_vida','ahorro_inversion')),
  nombre      text not null,
  proyectado  numeric(12,2) not null default 0,   -- "Monto Proyectado" mensual
  sinonimos   text[] not null default '{}',       -- palabras que dices por voz para esta categoría
  orden       int not null default 0,
  activo      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- 2. Movimientos (cada registro por voz). La suma por mes = "Monto Real"
create table if not exists public.movimientos (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  fecha           date not null default (now() at time zone 'America/Mexico_City')::date,
  tipo            text not null check (tipo in ('ingreso','gasto')),
  categoria_id    uuid not null references public.categorias (id) on delete restrict,
  monto           numeric(12,2) not null check (monto > 0),
  descripcion     text,
  texto_original  text,                             -- lo que dictaste, para auditoría
  created_at      timestamptz not null default now()
);

create index if not exists movimientos_user_fecha_idx on public.movimientos (user_id, fecha desc);
create index if not exists categorias_user_idx on public.categorias (user_id, orden);

-- 3. Seguridad: cada usuario solo ve y modifica sus propios datos
alter table public.categorias  enable row level security;
alter table public.movimientos enable row level security;

drop policy if exists "categorias propias" on public.categorias;
create policy "categorias propias" on public.categorias
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "movimientos propios" on public.movimientos;
create policy "movimientos propios" on public.movimientos
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
