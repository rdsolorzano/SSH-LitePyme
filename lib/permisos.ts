import { createClient } from '@/lib/supabase/server'
import { obtenerEmpresaActiva } from '@/lib/empresa'

export async function esSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data } = await supabase
    .from('super_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  return !!data
}

// ---------------------------------------------------------------------------
// Roles por empresa (tabla usuarios_empresas)
//   admin        -> todo
//   vendedor     -> solo ventas: clientes, cotizaciones, costeo, facturas, recibos, órdenes
//   solo_lectura -> consulta, no modifica nada
// Igual que en la base de datos (función rol_permite): cualquier otro valor, o no
// tener vínculo (súper administrador), cuenta como administrador.
// ---------------------------------------------------------------------------

export type Rol = 'admin' | 'vendedor' | 'solo_lectura'
export type Area = 'ventas' | 'admin'

export function normalizarRol(rol: string | null | undefined): Rol {
  return rol === 'vendedor' || rol === 'solo_lectura' ? rol : 'admin'
}

export function rolPermite(rol: Rol, area: Area) {
  return rol === 'admin' || (rol === 'vendedor' && area === 'ventas')
}

export async function obtenerRol(empresaId: string): Promise<Rol> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'solo_lectura'

  const { data } = await supabase
    .from('usuarios_empresas')
    .select('rol')
    .eq('usuario_id', user.id)
    .eq('empresa_id', empresaId)
    .maybeSingle()

  return normalizarRol(data?.rol)
}

const MENSAJE_SIN_PERMISO: Record<Exclude<Rol, 'admin'>, string> = {
  solo_lectura: 'Tu usuario es de solo lectura: puedes consultar, pero no modificar.',
  vendedor: 'Tu usuario es Vendedor: esta sección solo la puede modificar un administrador.',
}

// Devuelve null si puede; si no, el mensaje para mostrar. Usa la empresa activa.
// La base de datos aplica la misma regla, así que esta es la primera barrera, no la única.
export async function exigirPermiso(area: Area): Promise<string | null> {
  const { empresaActiva } = await obtenerEmpresaActiva()
  if (!empresaActiva) return 'No hay empresa activa'
  const rol = await obtenerRol(empresaActiva.id)
  return rolPermite(rol, area) ? null : MENSAJE_SIN_PERMISO[rol as Exclude<Rol, 'admin'>]
}
