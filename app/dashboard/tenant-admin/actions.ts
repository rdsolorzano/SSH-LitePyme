'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { esSuperAdmin } from '@/lib/permisos'

export async function crearEmpresa(formData: FormData) {
  if (!(await esSuperAdmin())) return { error: 'No autorizado' }

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

  revalidatePath('/dashboard/tenant-admin')
  return { empresaId: empresa.id }
}

export async function listarTodo() {
  if (!(await esSuperAdmin())) return { empresas: [], usuarios: [] }

  const admin = createAdminClient()

  const { data: empresas } = await admin
    .from('empresas')
    .select('id, razon_social, nombre_comercial')
    .order('razon_social')

  const { data: listado } = await admin.auth.admin.listUsers()
  const { data: vinculos } = await admin.from('usuarios_empresas').select('id, usuario_id, empresa_id, rol')

  const usuarios = (listado?.users || []).map((u) => ({
    id: u.id,
    email: u.email || '',
    nombre: (u.user_metadata?.full_name as string) || '',
    empresas: (vinculos || [])
      .filter((v) => v.usuario_id === u.id)
      .map((v) => {
        const emp = empresas?.find((e) => e.id === v.empresa_id)
        return { vinculoId: v.id, nombre: emp?.nombre_comercial || emp?.razon_social || 'Desconocida', rol: v.rol }
      }),
  }))

  return { empresas: empresas || [], usuarios }
}

export async function asignarEmpresaAUsuario(usuarioId: string, empresaId: string, rol: string) {
  if (!(await esSuperAdmin())) return { error: 'No autorizado' }

  const admin = createAdminClient()
  const { error } = await admin.from('usuarios_empresas').insert({ usuario_id: usuarioId, empresa_id: empresaId, rol })

  if (error) return { error: 'Ese usuario ya tenía acceso a esa empresa.' }

  revalidatePath('/dashboard/tenant-admin')
  return { ok: true }
}

export async function eliminarEmpresa(empresaId: string) {
  if (!(await esSuperAdmin())) return { error: 'No autorizado' }

  const admin = createAdminClient()

  const { data: facturas } = await admin.from('facturas').select('id').eq('empresa_id', empresaId)
  const facturaIds = (facturas || []).map((f) => f.id)
  if (facturaIds.length) await admin.from('detalle_facturas').delete().in('factura_id', facturaIds)

  const { data: cotizaciones } = await admin.from('cotizaciones').select('id').eq('empresa_id', empresaId)
  const cotizacionIds = (cotizaciones || []).map((c) => c.id)
  if (cotizacionIds.length) await admin.from('detalle_cotizaciones').delete().in('cotizacion_id', cotizacionIds)

  const { data: compras } = await admin.from('compras').select('id').eq('empresa_id', empresaId)
  const compraIds = (compras || []).map((c) => c.id)
  if (compraIds.length) await admin.from('detalle_compras').delete().in('compra_id', compraIds)

  await admin.from('facturas').delete().eq('empresa_id', empresaId)
  await admin.from('cotizaciones').delete().eq('empresa_id', empresaId)
  await admin.from('compras').delete().eq('empresa_id', empresaId)
  await admin.from('productos_servicios').delete().eq('empresa_id', empresaId)
  await admin.from('proveedores').delete().eq('empresa_id', empresaId)
  await admin.from('clientes').delete().eq('empresa_id', empresaId)
  await admin.from('cai_rangos').delete().eq('empresa_id', empresaId)
  await admin.from('usuarios_empresas').delete().eq('empresa_id', empresaId)
  await admin.from('empresas').delete().eq('id', empresaId)

  revalidatePath('/dashboard', 'layout')
  return { ok: true }
}
export async function desasignarEmpresa(usuarioEmpresaId: string) {
  if (!(await esSuperAdmin())) return { error: 'No autorizado' }

  const admin = createAdminClient()
  await admin.from('usuarios_empresas').delete().eq('id', usuarioEmpresaId)

  revalidatePath('/dashboard/tenant-admin')
  return { ok: true }
}