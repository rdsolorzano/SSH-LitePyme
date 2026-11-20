-- =====================================================================
-- LitePyme · Seguridad de facturación (versión 6.6.0)
--
--  1. Fechas en hora de Honduras: los documentos ya no quedan con fecha
--     del día siguiente cuando se emiten después de las 6:00 p. m.
--  2. Numeración sin duplicados: cotizaciones y recibos toman su número
--     de un contador seguro; no se permiten números repetidos.
--  3. Facturas "todo o nada": encabezado, líneas, inventario y correlativo
--     del CAI se guardan juntos en una sola operación (función crear_factura).
--  4. Roles: "Solo lectura" no puede modificar nada y "Vendedor" solo puede
--     trabajar en ventas (clientes, cotizaciones, costeo, facturas, recibos,
--     órdenes). Los usuarios sin rol restringido conservan acceso completo.
--
-- REQUISITO: haber ejecutado antes 2026-11-20_costeo.sql.
-- Cómo aplicarla: Supabase > SQL Editor > New query > pega todo > Run.
-- Se puede ejecutar más de una vez sin problema.
-- Al final muestra una tabla con cada usuario, su empresa y su rol: revísala.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. FECHAS EN HORA DE HONDURAS
-- La base de datos trabaja en hora UTC (6 horas adelante). Las columnas
-- "fecha" que se llenan solas ahora usan la fecha de Honduras.
-- ---------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['facturas', 'cotizaciones', 'recibos', 'compras', 'gastos', 'ordenes_trabajo', 'cotizaciones_proveedor']
  loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t and column_name = 'fecha' and data_type = 'date'
    ) then
      execute format(
        'alter table public.%I alter column fecha set default ((now() at time zone ''America/Tegucigalpa'')::date)', t
      );
    end if;
  end loop;
end $$;


-- ---------------------------------------------------------------------
-- 4a. ROLES: ¿el usuario actual puede modificar esta área de esta empresa?
--   'ventas' -> Administrador y Vendedor
--   'admin'  -> solo Administrador
-- Solo se restringe a quien tiene rol 'vendedor' o 'solo_lectura';
-- cualquier otro (administrador o sin vínculo, como el súper administrador)
-- conserva el acceso que ya tenía.
-- ---------------------------------------------------------------------
create or replace function public.rol_permite(p_empresa_id uuid, p_area text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1
    from public.usuarios_empresas ue
    where ue.usuario_id = auth.uid()
      and ue.empresa_id = p_empresa_id
      and (ue.rol = 'solo_lectura' or (ue.rol = 'vendedor' and p_area <> 'ventas'))
  )
$$;


-- ---------------------------------------------------------------------
-- 2. NUMERACIÓN INTERNA SIN DUPLICADOS (cotizaciones y recibos)
-- ---------------------------------------------------------------------
create table if not exists public.correlativos_internos (
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  tipo text not null check (tipo in ('cotizacion', 'recibo')),
  ultimo integer not null default 0,
  primary key (empresa_id, tipo)
);

alter table public.correlativos_internos enable row level security;
grant select, insert, update on public.correlativos_internos to authenticated;

drop policy if exists "correlativos por empresa" on public.correlativos_internos;
create policy "correlativos por empresa"
  on public.correlativos_internos for all to authenticated
  using (empresa_id in (select id from public.empresas))
  with check (empresa_id in (select id from public.empresas) and public.rol_permite(empresa_id, 'ventas'));

-- Devuelve el siguiente número. Si alguien numeró a mano más alto, continúa desde ahí.
-- Dos personas al mismo tiempo nunca reciben el mismo número.
create or replace function public.siguiente_correlativo(p_empresa_id uuid, p_tipo text)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_max integer;
  v_siguiente integer;
begin
  if p_tipo = 'cotizacion' then
    select coalesce(max(nullif(regexp_replace(numero, '\D', '', 'g'), '')::integer), 0)
      into v_max from public.cotizaciones where empresa_id = p_empresa_id;
  elsif p_tipo = 'recibo' then
    select coalesce(max(nullif(regexp_replace(numero, '\D', '', 'g'), '')::integer), 0)
      into v_max from public.recibos where empresa_id = p_empresa_id;
  else
    raise exception 'TIPO_INVALIDO';
  end if;

  insert into public.correlativos_internos as c (empresa_id, tipo, ultimo)
  values (p_empresa_id, p_tipo, v_max + 1)
  on conflict (empresa_id, tipo)
  do update set ultimo = greatest(c.ultimo, v_max) + 1
  returning ultimo into v_siguiente;

  return v_siguiente;
end $$;

-- Candados: no se permiten números repetidos dentro de una empresa.
-- Si ya existieran repetidos, NO se crea el candado y se avisa (no se borra nada).
do $$
begin
  begin
    create unique index if not exists uq_cotizaciones_numero on public.cotizaciones (empresa_id, numero);
  exception when unique_violation then
    raise notice 'AVISO: hay cotizaciones con número repetido; no se creó el candado de cotizaciones.';
  end;
  begin
    create unique index if not exists uq_recibos_numero on public.recibos (empresa_id, numero);
  exception when unique_violation then
    raise notice 'AVISO: hay recibos con número repetido; no se creó el candado de recibos.';
  end;
  begin
    create unique index if not exists uq_facturas_numero on public.facturas (empresa_id, numero_correlativo);
  exception when unique_violation then
    raise notice 'AVISO: hay facturas con número repetido; no se creó el candado de facturas. Revísalas con tu contador.';
  end;
end $$;


-- ---------------------------------------------------------------------
-- 3. FACTURA "TODO O NADA"
-- Guarda encabezado, líneas, inventario y correlativo en una sola operación.
-- Si algo falla, no queda nada a medias. Bloquea el CAI mientras numera,
-- así dos facturas simultáneas nunca reciben el mismo número.
-- Los totales se calculan aquí con la misma fórmula de la app.
-- ---------------------------------------------------------------------
create or replace function public.crear_factura(
  p_empresa_id uuid,
  p_cliente_id uuid,
  p_cai_rango_id uuid,
  p_items jsonb,                     -- [{producto_id, descripcion, cantidad, precio_unitario, tasa_isv}]
  p_exoneracion jsonb default null,  -- {no_constancia, no_registro_sag, no_orden_compra}
  p_cotizacion_id uuid default null  -- si viene de una cotización
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_hoy date := (now() at time zone 'America/Tegucigalpa')::date;
  v_cai record;
  v_siguiente bigint;
  v_numero text;
  v_exonerado boolean;
  v_estado text;
  v_factura uuid;
  v_item jsonb;
  v_cantidad numeric;
  v_precio numeric;
  v_tasa numeric;
  v_sub numeric;
  v_g15 numeric := 0;
  v_g18 numeric := 0;
  v_exento numeric := 0;
  v_exo numeric := 0;
  v_isv15 numeric;
  v_isv18 numeric;
begin
  -- Acceso y rol
  if v_uid is null then raise exception 'NO_AUTENTICADO'; end if;
  if not (
    exists (select 1 from usuarios_empresas where usuario_id = v_uid and empresa_id = p_empresa_id)
    or exists (select 1 from super_admins where user_id = v_uid)
  ) then
    raise exception 'SIN_ACCESO';
  end if;
  if not rol_permite(p_empresa_id, 'ventas') then raise exception 'SIN_PERMISO'; end if;

  -- Datos básicos
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'SIN_ITEMS';
  end if;
  select coalesce(exonerado, false) into v_exonerado
    from clientes where id = p_cliente_id and empresa_id = p_empresa_id;
  if not found then raise exception 'CLIENTE_INVALIDO'; end if;
  if v_exonerado and (
    coalesce(btrim(p_exoneracion->>'no_constancia'), '') = '' or coalesce(btrim(p_exoneracion->>'no_orden_compra'), '') = ''
  ) then
    raise exception 'FALTAN_DATOS_EXONERACION';
  end if;

  -- Cotización de origen: se bloquea para que no se convierta dos veces
  if p_cotizacion_id is not null then
    select estado into v_estado from cotizaciones
      where id = p_cotizacion_id and empresa_id = p_empresa_id for update;
    if not found then raise exception 'COTIZACION_NO_ENCONTRADA'; end if;
    if v_estado = 'convertida' then raise exception 'COTIZACION_YA_CONVERTIDA'; end if;
  end if;

  -- CAI: se bloquea mientras se numera
  select * into v_cai from cai_rangos
    where id = p_cai_rango_id and empresa_id = p_empresa_id for update;
  if not found then raise exception 'CAI_NO_ENCONTRADO'; end if;
  if not v_cai.activo then raise exception 'CAI_INACTIVO'; end if;
  if v_cai.fecha_limite_emision < v_hoy then raise exception 'CAI_VENCIDO'; end if;
  v_siguiente := v_cai.correlativo_actual + 1;
  if v_siguiente > v_cai.rango_final then raise exception 'CAI_AGOTADO'; end if;
  v_numero := coalesce(nullif(v_cai.punto_emision, ''), '000-001-01') || '-' || lpad(v_siguiente::text, 8, '0');

  -- Totales (misma fórmula que lib/exoneracion.ts)
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_cantidad := coalesce((v_item->>'cantidad')::numeric, 0);
    v_precio := coalesce((v_item->>'precio_unitario')::numeric, 0);
    v_tasa := coalesce((v_item->>'tasa_isv')::numeric, 0);
    if v_cantidad <= 0 then raise exception 'CANTIDAD_INVALIDA'; end if;
    if v_precio < 0 then raise exception 'PRECIO_INVALIDO'; end if;
    if not exists (
      select 1 from productos_servicios where id = (v_item->>'producto_id')::uuid and empresa_id = p_empresa_id
    ) then
      raise exception 'PRODUCTO_INVALIDO';
    end if;
    v_sub := v_precio * v_cantidad;
    if v_exonerado then v_exo := v_exo + v_sub;
    elsif v_tasa = 15 then v_g15 := v_g15 + v_sub;
    elsif v_tasa = 18 then v_g18 := v_g18 + v_sub;
    else v_exento := v_exento + v_sub;
    end if;
  end loop;
  v_isv15 := v_g15 * 0.15;
  v_isv18 := v_g18 * 0.18;

  -- Encabezado
  insert into facturas (
    empresa_id, cliente_id, cai_rango_id, numero_correlativo, fecha,
    subtotal_gravado_15, subtotal_gravado_18, subtotal_exento, isv_15, isv_18, total,
    exonerado, subtotal_exonerado, no_constancia_exonerado, no_registro_sag, no_orden_compra_exenta,
    cotizacion_id
  ) values (
    p_empresa_id, p_cliente_id, p_cai_rango_id, v_numero, v_hoy,
    v_g15, v_g18, v_exento, v_isv15, v_isv18, v_g15 + v_g18 + v_exento + v_exo + v_isv15 + v_isv18,
    v_exonerado, v_exo,
    case when v_exonerado then nullif(btrim(p_exoneracion->>'no_constancia'), '') end,
    case when v_exonerado then nullif(btrim(p_exoneracion->>'no_registro_sag'), '') end,
    case when v_exonerado then nullif(btrim(p_exoneracion->>'no_orden_compra'), '') end,
    p_cotizacion_id
  )
  returning id into v_factura;

  -- Líneas e inventario (resta directa, sin leer-y-escribir)
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_cantidad := (v_item->>'cantidad')::numeric;
    v_precio := (v_item->>'precio_unitario')::numeric;
    insert into detalle_facturas (factura_id, producto_id, descripcion, cantidad, precio_unitario, tasa_isv, subtotal)
    values (
      v_factura, (v_item->>'producto_id')::uuid, nullif(btrim(v_item->>'descripcion'), ''),
      v_cantidad, v_precio, coalesce((v_item->>'tasa_isv')::numeric, 0), v_precio * v_cantidad
    );
    update productos_servicios
      set existencia = coalesce(existencia, 0) - v_cantidad
      where id = (v_item->>'producto_id')::uuid and tipo = 'producto';
  end loop;

  -- Correlativo del CAI
  update cai_rangos set correlativo_actual = v_siguiente where id = p_cai_rango_id;

  -- Cotización convertida y su costeo en solo lectura
  if p_cotizacion_id is not null then
    update cotizaciones set estado = 'convertida' where id = p_cotizacion_id;
    update costeos_cotizacion set estimado_cerrado = true where cotizacion_id = p_cotizacion_id;
  end if;

  return v_factura;
end $$;

revoke all on function public.crear_factura(uuid, uuid, uuid, jsonb, jsonb, uuid) from public, anon;
grant execute on function public.crear_factura(uuid, uuid, uuid, jsonb, jsonb, uuid) to authenticated;

-- Las facturas solo se crean con crear_factura (nunca a medias ni con número a mano)
revoke insert on public.facturas from anon, authenticated;
revoke insert on public.detalle_facturas from anon, authenticated;


-- ---------------------------------------------------------------------
-- 4b. ROLES EN LA BASE DE DATOS
-- Reglas "restrictivas": se suman a las que ya existen (no las reemplazan).
-- Solo afectan crear, modificar y borrar; consultar sigue igual.
-- ---------------------------------------------------------------------
do $$
declare
  r record;
  v_pol text;
begin
  -- Tablas con empresa_id
  for r in
    select * from (values
      ('clientes', 'ventas'),
      ('cotizaciones', 'ventas'),
      ('recibos', 'ventas'),
      ('ordenes_trabajo', 'ventas'),
      ('costeos_cotizacion', 'ventas'),
      ('facturas', 'admin'),
      ('productos_servicios', 'admin'),
      ('proveedores', 'admin'),
      ('compras', 'admin'),
      ('gastos', 'admin'),
      ('cai_rangos', 'admin'),
      ('cotizaciones_proveedor', 'admin'),
      ('parametros_costeo', 'admin'),
      ('lista_verificacion', 'admin')
    ) as t(tabla, area)
  loop
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = r.tabla and column_name = 'empresa_id'
    ) then
      raise notice 'Se omite % (no existe o no tiene empresa_id)', r.tabla;
      continue;
    end if;
    foreach v_pol in array array['insertar', 'modificar', 'borrar'] loop
      execute format('drop policy if exists %I on public.%I', 'rol: ' || v_pol, r.tabla);
    end loop;
    execute format('create policy %I on public.%I as restrictive for insert to authenticated with check (public.rol_permite(empresa_id, %L))', 'rol: insertar', r.tabla, r.area);
    execute format('create policy %I on public.%I as restrictive for update to authenticated using (public.rol_permite(empresa_id, %L)) with check (public.rol_permite(empresa_id, %L))', 'rol: modificar', r.tabla, r.area, r.area);
    execute format('create policy %I on public.%I as restrictive for delete to authenticated using (public.rol_permite(empresa_id, %L))', 'rol: borrar', r.tabla, r.area);
  end loop;

  -- Tablas de detalle: siguen la regla de su documento
  for r in
    select * from (values
      ('detalle_cotizaciones', 'cotizacion_id', 'cotizaciones', 'ventas'),
      ('detalle_recibos', 'recibo_id', 'recibos', 'ventas'),
      ('detalle_ordenes_trabajo', 'orden_id', 'ordenes_trabajo', 'ventas'),
      ('costeo_lineas', 'costeo_id', 'costeos_cotizacion', 'ventas'),
      ('costeo_verificacion', 'costeo_id', 'costeos_cotizacion', 'ventas'),
      ('detalle_facturas', 'factura_id', 'facturas', 'admin'),
      ('detalle_compras', 'compra_id', 'compras', 'admin'),
      ('detalle_cotizaciones_proveedor', 'cotizacion_id', 'cotizaciones_proveedor', 'admin')
    ) as t(tabla, columna, padre, area)
  loop
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = r.tabla and column_name = r.columna
    ) then
      raise notice 'Se omite % (no existe o no tiene %)', r.tabla, r.columna;
      continue;
    end if;
    foreach v_pol in array array['insertar', 'modificar', 'borrar'] loop
      execute format('drop policy if exists %I on public.%I', 'rol: ' || v_pol, r.tabla);
    end loop;
    execute format(
      'create policy %I on public.%I as restrictive for insert to authenticated with check (exists (select 1 from public.%I p where p.id = %I and public.rol_permite(p.empresa_id, %L)))',
      'rol: insertar', r.tabla, r.padre, r.columna, r.area);
    execute format(
      'create policy %I on public.%I as restrictive for update to authenticated using (exists (select 1 from public.%I p where p.id = %I and public.rol_permite(p.empresa_id, %L)))',
      'rol: modificar', r.tabla, r.padre, r.columna, r.area);
    execute format(
      'create policy %I on public.%I as restrictive for delete to authenticated using (exists (select 1 from public.%I p where p.id = %I and public.rol_permite(p.empresa_id, %L)))',
      'rol: borrar', r.tabla, r.padre, r.columna, r.area);
  end loop;

  -- Datos de la empresa (logo, RTN, etc.): solo administradores
  drop policy if exists "rol: modificar" on public.empresas;
  create policy "rol: modificar" on public.empresas as restrictive for update to authenticated
    using (public.rol_permite(id, 'admin')) with check (public.rol_permite(id, 'admin'));
end $$;


-- ---------------------------------------------------------------------
-- REVISIÓN FINAL: usuarios, empresas y roles.
-- Confirma que tu usuario aparezca como "admin". Si un usuario aparece como
-- "vendedor" o "solo_lectura", desde hoy tendrá esas restricciones.
-- ---------------------------------------------------------------------
select u.email, e.razon_social as empresa, ue.rol
from public.usuarios_empresas ue
join auth.users u on u.id = ue.usuario_id
join public.empresas e on e.id = ue.empresa_id
order by u.email, e.razon_social;
