-- =====================================================================
-- LitePyme · Gastos operativos (no inventario)
-- Combustible, alquiler, servicios, honorarios, etc.
-- No suman existencias. Sí aparecen en el reporte:
--   * ISV mensual: compras gravadas (crédito fiscal), exentas y exoneradas
--   * Renta anual: resumen de gastos deducibles por categoría
--
-- Cómo aplicarla: Supabase > SQL Editor > New query > pega todo > Run.
-- Se puede ejecutar más de una vez sin problema.
-- =====================================================================

create table if not exists public.gastos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  fecha date not null default current_date,
  tipo_documento text not null default 'factura',   -- factura | recibo | planilla | otro
  numero_documento text,
  nombre_proveedor text not null,
  rtn_proveedor text,
  categoria text not null,                          -- ver lib/gastos.ts
  descripcion text,
  subtotal_gravado_15 numeric(14,2) not null default 0,
  subtotal_gravado_18 numeric(14,2) not null default 0,
  subtotal_exento numeric(14,2) not null default 0,
  subtotal_exonerado numeric(14,2) not null default 0,
  isv_15 numeric(14,2) not null default 0,
  isv_18 numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  deducible_isr boolean not null default true,       -- false = uso personal / no deducible
  creado_en timestamptz not null default now()
);

create index if not exists idx_gastos_empresa_fecha on public.gastos (empresa_id, fecha desc);

-- Seguridad (RLS): cada usuario solo ve los gastos de las empresas que ya puede ver.
alter table public.gastos enable row level security;

drop policy if exists "gastos por empresa" on public.gastos;
create policy "gastos por empresa"
  on public.gastos
  for all
  to authenticated
  using (empresa_id in (select id from public.empresas))
  with check (empresa_id in (select id from public.empresas));
