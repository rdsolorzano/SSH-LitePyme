'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function crearEmpresa(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const admin = createAdminClient()

  const { data: empresa, error } = await admin
    .from('empresas')
    .insert({
      razon_social: formData.get('razon_social') as string,
      nombre_comercial: formData.get('nombre_comercial') as string,
      rtn: formData.get('rtn') as string,
      regimen_fiscal: formData.get('regimen_fiscal') as string,
    })
    .select('id')
    .single()

  if (error || !empresa) return { error: 'No se pudo crear la empresa' }

  await admin.from('usuarios_empresas').insert({
    usuario_id: user.id,
    empresa_id: empresa.id,
    rol: 'admin',
  })

  revalidatePath('/dashboard', 'layout')
  return { empresaId: empresa.id }
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

  const { data: miAcceso } = await supabase
    .from('usuarios_empresas')
    .select('rol')
    .eq('usuario_id', user.id)
    .eq('empresa_id', empresaId)
    .single()
  if (!miAcceso) return { error: 'No tienes acceso a esta empresa' }

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
  await admin.from('usuarios_empresas').delete().eq('id', usuarioEmpresaId)
  revalidatePath('/dashboard/empresas')
}