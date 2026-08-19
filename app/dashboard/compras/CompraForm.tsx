'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { obtenerEmpresaActiva } from '@/lib/empresa'

type ItemInput = {
  productoId: string
  cantidad: number
  costoUnitario: number
  precioVenta: number
  actualizarPrecio: boolean
}

export async function guardarCompra(datos: {
  proveedorId: string
  numeroFactura: string
  isv: number
  subtotal: number
  total: number
  items: ItemInput[]
}) {
  const { empresaActiva } = await obtenerEmpresaActiva()
  if (!empresaActiva) return

  const supabase = await createClient()

  const { data: compra, error } = await supabase
    .from('compras')
    .insert({
      empresa_id: empresaActiva.id,
      proveedor_id: datos.proveedorId,
      numero_factura_proveedor: datos.numeroFactura || null,
      subtotal: datos.subtotal,
      isv: datos.isv,
      total: datos.total,
    })
    .select('id')
    .single()

  if (error || !compra) {
    console.error(error)
    return
  }

  for (const item of datos.items) {
    await supabase.from('detalle_compras').insert({
      compra_id: compra.id,
      producto_id: item.productoId,
      cantidad: item.cantidad,
      costo_unitario: item.costoUnitario,
      subtotal: item.cantidad * item.costoUnitario,
    })

    // Sumar la cantidad comprada a la existencia actual
    const { data: producto } = await supabase
      .from('productos_servicios')
      .select('existencia')
      .eq('id', item.productoId)
      .single()

    const nuevaExistencia = (producto?.existencia || 0) + item.cantidad

    const actualizacion: Record<string, number> = { existencia: nuevaExistencia }
    if (item.actualizarPrecio) {
      actualizacion.precio_unitario = item.precioVenta
    }

    await supabase.from('productos_servicios').update(actualizacion).eq('id', item.productoId)
  }

  revalidatePath('/dashboard/compras')
  revalidatePath('/dashboard/productos')
}