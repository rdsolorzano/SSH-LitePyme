'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { obtenerEmpresaActiva } from '@/lib/empresa'

export async function crearProveedor(formData: FormData) {
  const { empresaActiva } = await obtenerEmpresaActiva()
  if (!empresaActiva) return

  const supabase = await createClient()

  await supabase.from('proveedores').insert({
    empresa_id: empresaActiva.id,
    nombre: formData.get('nombre') as string,
    rtn: formData.get('rtn') as string,
    telefono: formData.get('telefono') as string,
    email: formData.get('email') as string,
    direccion: formData.get('direccion') as string,
  })

  revalidatePath('/dashboard/proveedores')
}

export async function eliminarProveedor(formData: FormData) {
  const id = formData.get('id') as string
  const supabase = await createClient()

  await supabase
    .from('proveedores')
    .update({ activo: false })
    .eq('id', id)

  revalidatePath('/dashboard/proveedores')
}