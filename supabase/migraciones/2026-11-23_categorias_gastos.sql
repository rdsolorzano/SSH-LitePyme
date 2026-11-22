-- =====================================================================
-- LitePyme · Categorías de gastos simplificadas (versión 7.3.0)
--   * "Combustible" y "Lubricantes y aceites" se unen en
--     "Combustibles y lubricantes": los gastos guardados como lubricantes
--     pasan a esa categoría.
--   * La categoría nueva "Repuestos, reparaciones y mantenimiento de
--     vehículos" no requiere cambios en la base de datos.
--
-- Cómo aplicarla: Supabase > SQL Editor > New query > pega todo > Run.
-- Se puede ejecutar más de una vez sin problema. No borra nada.
-- =====================================================================

update public.gastos
set categoria = 'combustible'
where categoria = 'lubricantes';
