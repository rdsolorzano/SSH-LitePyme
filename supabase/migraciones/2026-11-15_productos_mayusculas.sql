-- =====================================================================
-- LitePyme · Productos siempre en MAYÚSCULAS
-- Convierte automáticamente la descripción y la serie de los productos
-- a mayúsculas, sin importar desde dónde se ingresen (la app, el editor
-- de Supabase, una importación, etc.). También convierte los existentes.
--
-- Cómo aplicarla: Supabase > SQL Editor > New query > pega todo > Run.
-- Se puede ejecutar más de una vez sin problema.
-- =====================================================================

-- 1. Función que convierte (quita espacios sobrantes; serie vacía -> null)
create or replace function public.productos_a_mayusculas()
returns trigger
language plpgsql
as $$
begin
  new.descripcion := upper(btrim(regexp_replace(new.descripcion, '\s+', ' ', 'g')));
  new.serie := nullif(upper(btrim(regexp_replace(coalesce(new.serie, ''), '\s+', ' ', 'g'))), '');
  return new;
end;
$$;

-- 2. Se ejecuta antes de guardar cualquier producto nuevo o modificado
drop trigger if exists trg_productos_a_mayusculas on public.productos_servicios;
create trigger trg_productos_a_mayusculas
  before insert or update of descripcion, serie on public.productos_servicios
  for each row execute function public.productos_a_mayusculas();

-- 3. Convierte los productos que ya existen
update public.productos_servicios
set descripcion = descripcion, serie = serie   -- el trigger hace la conversión
where descripcion is distinct from upper(btrim(regexp_replace(descripcion, '\s+', ' ', 'g')))
   or serie is distinct from nullif(upper(btrim(regexp_replace(coalesce(serie, ''), '\s+', ' ', 'g'))), '');
