'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { obtenerEmpresaActiva } from '@/lib/empresa'
import { redirect } from 'next/navigation'

export async function crearCliente(formData: FormData) {
  const { empresaActiva } = await obtenerEmpresaActiva()
  if (!empresaActiva) return

  const supabase = await createClient()

  await supabase.from('clientes').insert({
    empresa_id: empresaActiva.id,
    nombre: formData.get('nombre') as string,
    rtn: formData.get('rtn') as string,
    telefono: formData.get('telefono') as string,
    email: formData.get('email') as string,
    direccion: formData.get('direccion') as string,
    exonerado: formData.get('exonerado') === 'on',
    no_constancia_exonerado: (formData.get('no_constancia_exonerado') as string) || null,
    no_registro_sag: (formData.get('no_registro_sag') as string) || null,
  })

  revalidatePath('/dashboard/clientes')
}

export async function eliminarCliente(formData: FormData) {
  const id = formData.get('id') as string
  const supabase = await createClient()

  await supabase
    .from('clientes')
    .update({ activo: false })
    .eq('id', id)

  revalidatePath('/dashboard/clientes')
}
export async function actualizarCliente(formData: FormData) {
  const id = formData.get('id') as string
  const exonerado = formData.get('exonerado') === 'on'
  const supabase = await createClient()

  await supabase
    .from('clientes')
    .update({
      nombre: formData.get('nombre') as string,
      rtn: formData.get('rtn') as string,
      telefono: formData.get('telefono') as string,
      email: formData.get('email') as string,
      direccion: formData.get('direccion') as string,
      exonerado,
      no_constancia_exonerado: exonerado ? ((formData.get('no_constancia_exonerado') as string) || null) : null,
      no_registro_sag: exonerado ? ((formData.get('no_registro_sag') as string) || null) : null,
    })
    .eq('id', id)

  revalidatePath('/dashboard/clientes')
  redirect('/dashboard/clientes')
}