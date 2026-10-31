-- =====================================================================
-- LitePyme · Cotizaciones de proveedor
-- Registra cotizaciones de proveedores para crear productos o actualizar
-- costo y precio de venta SIN sumar existencias y SIN afectar los
-- reportes de compras ni el crédito fiscal de ISV.
--
-- Cómo aplicarla: Supabase > SQL Editor > New query > pega todo > Run.
-- Se puede ejecutar más de una vez sin problema.
-- =====================================================================

-- 1. Encabezado de la cotización
create table if not exists public.cotizaciones_proveedor (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  proveedor_id uuid references public.proveedores(id),
  numero_cotizacion text not null,
  fecha date not null default current_date,
  actualizo_precios boolean not null default true,
  creado_en timestamptz not null default now()
);

-- 2. Líneas de la cotización (guarda el costo/precio anterior para el control de cambios)
create table if not exists public.detalle_cotizaciones_proveedor (
  id uuid primary key default gen_random_uuid(),
  cotizacion_id uuid not null references public.cotizaciones_proveedor(id) on delete cascade,
  producto_id uuid not null references public.productos_servicios(id),
  costo_unitario numeric(14,2) not null,
  tasa_isv numeric(5,2) not null default 15,
  precio_venta numeric(14,2),
  costo_anterior numeric(14,2),
  precio_anterior numeric(14,2)
);

create index if not exists idx_cot_prov_empresa on public.cotizaciones_proveedor (empresa_id, fecha desc);
create index if not exists idx_det_cot_prov_producto on public.detalle_cotizaciones_proveedor (producto_id);
create index if not exists idx_det_cot_prov_cotizacion on public.detalle_cotizaciones_proveedor (cotizacion_id);

-- 3. Seguridad (RLS): cada usuario solo ve las cotizaciones de las empresas que ya puede ver.
--    Se apoya en las reglas que ya tiene la tabla "empresas".
alter table public.cotizaciones_proveedor enable row level security;
alter table public.detalle_cotizaciones_proveedor enable row level security;

drop policy if exists "cotizaciones_proveedor por empresa" on public.cotizaciones_proveedor;
create policy "cotizaciones_proveedor por empresa"
  on public.cotizaciones_proveedor
  for all
  to authenticated
  using (empresa_id in (select id from public.empresas))
  with check (empresa_id in (select id from public.empresas));

drop policy if exists "detalle_cotizaciones_proveedor por empresa" on public.detalle_cotizaciones_proveedor;
create policy "detalle_cotizaciones_proveedor por empresa"
  on public.detalle_cotizaciones_proveedor
  for all
  to authenticated
  using (cotizacion_id in (select id from public.cotizaciones_proveedor))
  with check (cotizacion_id in (select id from public.cotizaciones_proveedor));
