'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { obtenerEmpresaActiva } from '@/lib/empresa'

export async function crearProducto(formData: FormData) {
  const { empresaActiva } = await obtenerEmpresaActiva()
  if (!empresaActiva) return

  const supabase = await createClient()

  await supabase.from('productos_servicios').insert({
    empresa_id: empresaActiva.id,
    tipo: formData.get('tipo') as string,
    descripcion: formData.get('descripcion') as string,
    precio_unitario: Number(formData.get('precio_unitario')),
    tasa_isv: Number(formData.get('tasa_isv')),
    existencia: Number(formData.get('existencia')) || 0,
  })

  revalidatePath('/dashboard/productos')
}

export async function eliminarProducto(formData: FormData) {
  const id = formData.get('id') as string
  const supabase = await createClient()

  await supabase
    .from('productos_servicios')
    .update({ activo: false })
    .eq('id', id)

  revalidatePath('/dashboard/productos')
}