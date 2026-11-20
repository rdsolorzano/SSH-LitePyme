-- =====================================================================
-- LitePyme · Costeo de cotizaciones (herramienta interna)
-- Calcula cuánto cuesta realmente un trabajo para cotizar sin perder.
-- NO es información fiscal: no crea gastos, no toca compras, inventario
-- ni reportes, y el cliente nunca la ve (no sale en PDF ni impresión).
--
-- Crea:
--   * parametros_costeo    -> tus valores de costeo (uno por empresa)
--   * costeos_cotizacion   -> la hoja de costos de cada cotización
--   * costeo_lineas        -> los renglones de cada hoja
--   * lista_verificacion   -> tu lista de "¿ya consideraste...?" por rubro
--   * costeo_verificacion  -> lo que marcaste en cada hoja
--   * facturas.cotizacion_id -> de qué cotización salió cada factura
--
-- Cómo aplicarla: Supabase > SQL Editor > New query > pega todo > Run.
-- Se puede ejecutar más de una vez sin problema.
-- =====================================================================

-- 1. Parámetros de costeo (una fila por empresa)
create table if not exists public.parametros_costeo (
  empresa_id uuid primary key references public.empresas(id) on delete cascade,
  gastos_fijos_mensuales numeric(14,2) not null default 0,
  horas_facturables_mes numeric(8,2) not null default 0,
  tarifa_hora numeric(14,2) not null default 0,
  costo_km numeric(14,2) not null default 0,
  pct_consumibles numeric(5,2) not null default 5,
  pct_imprevistos numeric(5,2) not null default 5,
  margen_objetivo numeric(5,2) not null default 25 check (margen_objetivo >= 0 and margen_objetivo < 100),
  actualizado_en timestamptz not null default now()
);

-- 2. Hoja de costos de cada cotización (los parámetros quedan congelados aquí)
create table if not exists public.costeos_cotizacion (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  cotizacion_id uuid not null unique references public.cotizaciones(id) on delete cascade,
  rubro text not null default 'general',              -- seguridad | redes | refrigeracion | general
  indirecto_hora numeric(14,2) not null default 0,     -- gastos fijos / horas facturables (congelado)
  tarifa_hora numeric(14,2) not null default 0,
  costo_km numeric(14,2) not null default 0,
  pct_consumibles numeric(5,2) not null default 0,
  pct_imprevistos numeric(5,2) not null default 0,
  margen_objetivo numeric(5,2) not null default 0 check (margen_objetivo >= 0 and margen_objetivo < 100),
  costo_estimado numeric(14,2) not null default 0,     -- calculado al guardar (para el listado)
  precio_sugerido numeric(14,2) not null default 0,
  costo_real numeric(14,2),                            -- se llena al anotar el costo real
  estimado_cerrado boolean not null default false,     -- true al convertir a factura (solo lectura)
  notas text,
  notas_real text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists idx_costeos_empresa on public.costeos_cotizacion (empresa_id, creado_en desc);

-- 3. Renglones de la hoja
create table if not exists public.costeo_lineas (
  id uuid primary key default gen_random_uuid(),
  costeo_id uuid not null references public.costeos_cotizacion(id) on delete cascade,
  tipo text not null check (tipo in ('material', 'mano_obra', 'traslado', 'tercero', 'otro')),
  descripcion text not null default '',
  producto_id uuid references public.productos_servicios(id) on delete set null,
  unidad text,                                          -- und, h, km, viaje...
  tecnicos numeric(6,2) not null default 1,             -- solo mano de obra: horas-hombre = técnicos x horas
  cantidad numeric(12,2) not null default 0,
  costo_unitario numeric(14,2) not null default 0,
  cantidad_real numeric(12,2),
  costo_unitario_real numeric(14,2),
  solo_real boolean not null default false,             -- renglón que apareció en el trabajo, no estaba previsto
  orden integer not null default 0
);

create index if not exists idx_costeo_lineas_costeo on public.costeo_lineas (costeo_id, orden);

-- 4. Catálogo editable de "¿ya consideraste...?"
create table if not exists public.lista_verificacion (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  rubro text not null,
  punto text not null,
  orden integer not null default 0,
  activo boolean not null default true
);

create index if not exists idx_lista_verificacion_empresa on public.lista_verificacion (empresa_id, rubro, orden);

-- 5. Lo marcado en cada hoja (se copia el texto para que editar el catálogo no cambie el historial)
create table if not exists public.costeo_verificacion (
  id uuid primary key default gen_random_uuid(),
  costeo_id uuid not null references public.costeos_cotizacion(id) on delete cascade,
  punto text not null,
  estado text not null check (estado in ('incluido', 'no_aplica'))
);

create index if not exists idx_costeo_verificacion_costeo on public.costeo_verificacion (costeo_id);

-- 6. Factura -> cotización de origen
alter table public.facturas
  add column if not exists cotizacion_id uuid references public.cotizaciones(id) on delete set null;

create index if not exists idx_facturas_cotizacion on public.facturas (cotizacion_id);

-- 7. Seguridad (RLS): cada usuario solo ve el costeo de las empresas que ya puede ver.
alter table public.parametros_costeo enable row level security;
alter table public.costeos_cotizacion enable row level security;
alter table public.costeo_lineas enable row level security;
alter table public.lista_verificacion enable row level security;
alter table public.costeo_verificacion enable row level security;

drop policy if exists "parametros costeo por empresa" on public.parametros_costeo;
create policy "parametros costeo por empresa"
  on public.parametros_costeo for all to authenticated
  using (empresa_id in (select id from public.empresas))
  with check (empresa_id in (select id from public.empresas));

drop policy if exists "costeos por empresa" on public.costeos_cotizacion;
create policy "costeos por empresa"
  on public.costeos_cotizacion for all to authenticated
  using (empresa_id in (select id from public.empresas))
  with check (empresa_id in (select id from public.empresas));

drop policy if exists "lista verificacion por empresa" on public.lista_verificacion;
create policy "lista verificacion por empresa"
  on public.lista_verificacion for all to authenticated
  using (empresa_id in (select id from public.empresas))
  with check (empresa_id in (select id from public.empresas));

-- Las tablas hijas heredan la regla de su hoja de costos
drop policy if exists "lineas segun su costeo" on public.costeo_lineas;
create policy "lineas segun su costeo"
  on public.costeo_lineas for all to authenticated
  using (costeo_id in (select id from public.costeos_cotizacion))
  with check (costeo_id in (select id from public.costeos_cotizacion));

drop policy if exists "verificacion segun su costeo" on public.costeo_verificacion;
create policy "verificacion segun su costeo"
  on public.costeo_verificacion for all to authenticated
  using (costeo_id in (select id from public.costeos_cotizacion))
  with check (costeo_id in (select id from public.costeos_cotizacion));
