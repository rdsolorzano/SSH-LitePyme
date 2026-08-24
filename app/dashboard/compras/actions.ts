'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { obtenerEmpresaActiva } from '@/lib/empresa'

export type ItemCompra = {
  productoId: string
  cantidad: number
  costoUnitario: number // ya con ISV incluido (calculado en pantalla)
  precioVenta: number   // precio de reventa decidido
}

export async function crearCompra(proveedorId: string, items: ItemCompra[], numeroFacturaProveedor?: string) {
  const { empresaActiva } = await obtenerEmpresaActiva()
  if (!empresaActiva || items.length === 0) return

  const supabase = await createClient()

  const total = items.reduce((acc, i) => acc + i.costoUnitario * i.cantidad, 0)

  const { data: compra, error } = await supabase
    .from('compras')
    .insert({
      empresa_id: empresaActiva.id,
      proveedor_id: proveedorId,
      numero_factura_proveedor: numeroFacturaProveedor || null,
      subtotal: total,
      isv: 0,
      total,
    })
    .select('id')
    .single()

  if (error || !compra) return

  for (const item of items) {
    await supabase.from('detalle_compras').insert({
      compra_id: compra.id,
      producto_id: item.productoId,
      cantidad: item.cantidad,
      costo_unitario: item.costoUnitario,
      subtotal: item.costoUnitario * item.cantidad,
    })

    const { data: producto } = await supabase
      .from('productos_servicios')
      .select('existencia')
      .eq('id', item.productoId)
      .single()

    const margen =
      item.costoUnitario > 0
        ? ((item.precioVenta - item.costoUnitario) / item.costoUnitario) * 100
        : 0

    await supabase
      .from('productos_servicios')
      .update({
        costo_unitario: item.costoUnitario,
        precio_unitario: item.precioVenta,
        margen_porcentaje: margen,
        existencia: (producto?.existencia || 0) + item.cantidad,
      })
      .eq('id', item.productoId)
  }

  revalidatePath('/dashboard/compras')
  revalidatePath('/dashboard/productos')
}