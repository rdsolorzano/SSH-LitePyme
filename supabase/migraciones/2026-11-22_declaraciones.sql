-- =====================================================================
-- LitePyme · Registro de declaraciones presentadas al SAR
-- Permite marcar cada mes como "declarado": fecha de presentación,
-- número de constancia, monto pagado y el ISV que el sistema calculaba
-- en ese momento (para avisar si después cambian los documentos del mes).
--
-- REQUISITO: haber ejecutado antes 2026-11-21_seguridad_facturacion.sql
-- (usa la función rol_permite: solo un Administrador registra declaraciones).
-- Cómo aplicarla: Supabase > SQL Editor > New query > pega todo > Run.
-- Se puede ejecutar más de una vez sin problema.
-- =====================================================================

create table if not exists public.declaraciones (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  tipo text not null default 'isv_mensual' check (tipo in ('isv_mensual', 'renta_anual')),
  periodo text not null,                            -- 'YYYY-MM' para ISV mensual, 'YYYY' para renta
  fecha_presentacion date not null,
  numero_constancia text,                           -- número de declaración o constancia del SAR
  monto_calculado numeric(14,2) not null default 0, -- ISV neto según el sistema al registrar
  monto_pagado numeric(14,2) not null default 0,
  notas text,
  registrado_por uuid default auth.uid(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (empresa_id, tipo, periodo)
);

create index if not exists idx_declaraciones_empresa on public.declaraciones (empresa_id, tipo, periodo desc);

alter table public.declaraciones enable row level security;
grant select, insert, update, delete on public.declaraciones to authenticated;

-- Todos los usuarios de la empresa la consultan
drop policy if exists "declaraciones por empresa" on public.declaraciones;
create policy "declaraciones por empresa"
  on public.declaraciones for all to authenticated
  using (empresa_id in (select id from public.empresas))
  with check (empresa_id in (select id from public.empresas));

-- Solo un Administrador registra, cambia o quita declaraciones
drop policy if exists "rol: insertar" on public.declaraciones;
drop policy if exists "rol: modificar" on public.declaraciones;
drop policy if exists "rol: borrar" on public.declaraciones;
create policy "rol: insertar" on public.declaraciones as restrictive for insert to authenticated
  with check (public.rol_permite(empresa_id, 'admin'));
create policy "rol: modificar" on public.declaraciones as restrictive for update to authenticated
  using (public.rol_permite(empresa_id, 'admin')) with check (public.rol_permite(empresa_id, 'admin'));
create policy "rol: borrar" on public.declaraciones as restrictive for delete to authenticated
  using (public.rol_permite(empresa_id, 'admin'));
