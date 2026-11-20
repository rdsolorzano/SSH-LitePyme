'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { esSuperAdmin, normalizarRol } from '@/lib/permisos'

const ROLES_VALIDOS = ['admin', 'vendedor', 'solo_lectura']

// Solo un administrador de la empresa (o el súper administrador) maneja sus accesos
async function esAdministradorDe(empresaId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  if (await esSuperAdmin()) return true
  const { data: miAcceso } = await supabase
    .from('usuarios_empresas')
    .select('rol')
    .eq('usuario_id', user.id)
    .eq('empresa_id', empresaId)
    .maybeSingle()
  return !!miAcceso && normalizarRol(miAcceso.rol) === 'admin'
}


export async function listarAccesos(empresaId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: miAcceso } = await supabase
    .from('usuarios_empresas')
    .select('rol')
    .eq('usuario_id', user.id)
    .eq('empresa_id', empresaId)
    .single()
  if (!miAcceso) return []

  const admin = createAdminClient()
  const { data: accesos } = await admin
    .from('usuarios_empresas')
    .select('id, usuario_id, rol')
    .eq('empresa_id', empresaId)

  if (!accesos) return []

  const { data: listado } = await admin.auth.admin.listUsers()

  return accesos.map((a) => ({
    id: a.id,
    rol: a.rol,
    email: listado?.users.find((u) => u.id === a.usuario_id)?.email || 'Desconocido',
  }))
}

export async function invitarUsuario(empresaId: string, email: string, rol: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  if (!(await esAdministradorDe(empresaId))) {
    return { error: 'Solo un administrador de la empresa puede invitar usuarios.' }
  }
  if (!ROLES_VALIDOS.includes(rol)) return { error: 'Rol no válido.' }

  const admin = createAdminClient()

  const { data: listado } = await admin.auth.admin.listUsers()
  const existente = listado?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())

  let usuarioId: string

  if (existente) {
    usuarioId = existente.id
  } else {
        const { data: invitado, error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/actualizar-password`,
    })
    if (error || !invitado.user) return { error: 'No se pudo invitar: ' + error?.message }
    usuarioId = invitado.user.id
  }

  const { error: errorVinculo } = await admin
    .from('usuarios_empresas')
    .insert({ usuario_id: usuarioId, empresa_id: empresaId, rol })

  if (errorVinculo) return { error: 'Ese usuario ya tenía acceso a esta empresa.' }

  revalidatePath(`/dashboard/empresas/${empresaId}`)
  return { ok: true }
}

export async function quitarAcceso(usuarioEmpresaId: string) {
  const admin = createAdminClient()

  // Antes no se verificaba quién lo pedía: ahora solo un administrador de ESA empresa
  const { data: vinculo } = await admin
    .from('usuarios_empresas')
    .select('empresa_id')
    .eq('id', usuarioEmpresaId)
    .maybeSingle()
  if (!vinculo || !(await esAdministradorDe(vinculo.empresa_id))) return

  await admin.from('usuarios_empresas').delete().eq('id', usuarioEmpresaId)
  revalidatePath('/dashboard/empresas')
  revalidatePath(`/dashboard/empresas/${vinculo.empresa_id}`)
}