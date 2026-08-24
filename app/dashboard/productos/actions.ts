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
export async function crearProductoRapido(formData: FormData) {
  const { empresaActiva } = await obtenerEmpresaActiva()
  if (!empresaActiva) return { error: 'No hay empresa activa' }

  const supabase = await createClient()

  const { data: producto, error } = await supabase
    .from('productos_servicios')
    .insert({
      empresa_id: empresaActiva.id,
      tipo: formData.get('tipo') as string,
      descripcion: formData.get('descripcion') as string,
      precio_unitario: 0,
      tasa_isv: Number(formData.get('tasa_isv')) || 15,
      existencia: 0,
    })
    .select('id, descripcion, precio_unitario, tasa_isv, tipo')
    .single()

  if (error || !producto) return { error: 'No se pudo crear el producto' }

  revalidatePath('/dashboard/productos')
  return { producto }
}
export async function actualizarPrecioVenta(productoId: string, nuevoPrecio: number) {
  const supabase = await createClient()

  const { data: producto } = await supabase
    .from('productos_servicios')
    .select('costo_unitario')
    .eq('id', productoId)
    .single()

  // Si no existe el producto, salimos de la función inmediatamente
  if (!producto) return { error: 'Producto no encontrado' }

  // Ahora TypeScript sabe con 100% de certeza que 'producto' existe
  const margen =
    producto.costo_unitario > 0
      ? ((nuevoPrecio - producto.costo_unitario) / producto.costo_unitario) * 100
      : 0

  await supabase
    .from('productos_servicios')
    .update({ precio_unitario: nuevoPrecio, margen_porcentaje: margen })
    .eq('id', productoId)

  revalidatePath('/dashboard/productos')
}
