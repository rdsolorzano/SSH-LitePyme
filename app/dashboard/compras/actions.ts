'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { obtenerEmpresaActiva } from '@/lib/empresa'

export type ItemCompra = {
  productoId: string
  cantidad: number
  costoUnitario: number
  baseGravada: number
  tasaIsv: number
  precioVenta: number
  serie?: string
}

export async function crearCompra(proveedorId: string, items: ItemCompra[], numeroFacturaProveedor?: string, fecha?: string) {
  const { empresaActiva } = await obtenerEmpresaActiva()
  if (!empresaActiva || items.length === 0) return

  const supabase = await createClient()

  let subtotalGravado15 = 0
  let subtotalGravado18 = 0
  let subtotalExento = 0
  let isv15 = 0
  let isv18 = 0
  let total = 0

  for (const item of items) {
    const baseLinea = item.baseGravada * item.cantidad
    const totalLinea = item.costoUnitario * item.cantidad
    const isvLinea = totalLinea - baseLinea

    if (item.tasaIsv === 15) {
      subtotalGravado15 += baseLinea
      isv15 += isvLinea
    } else if (item.tasaIsv === 18) {
      subtotalGravado18 += baseLinea
      isv18 += isvLinea
    } else {
      subtotalExento += baseLinea
    }

    total += totalLinea
  }

  const subtotal = subtotalGravado15 + subtotalGravado18 + subtotalExento
  const isv = isv15 + isv18

  const { data: compra, error } = await supabase
    .from('compras')
    .insert({
      empresa_id: empresaActiva.id,
      proveedor_id: proveedorId,
      numero_factura_proveedor: numeroFacturaProveedor || null,
      fecha: fecha || new Date().toISOString().split('T')[0],
      subtotal,
      isv,
      total,
      subtotal_gravado_15: subtotalGravado15,
      subtotal_gravado_18: subtotalGravado18,
      subtotal_exento: subtotalExento,
      isv_15: isv15,
      isv_18: isv18,
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
      tasa_isv: item.tasaIsv,
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
        ...(item.serie?.trim() ? { serie: item.serie.trim() } : {}),
      })
      .eq('id', item.productoId)
  }

  revalidatePath('/dashboard/compras')
  revalidatePath('/dashboard/productos')
}