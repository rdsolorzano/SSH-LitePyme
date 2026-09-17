'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { obtenerEmpresaActiva } from '@/lib/empresa'

export type ItemFactura = {
  productoId: string
  descripcion: string
  cantidad: number
  precioUnitario: number
  tasaIsv: number
}

export async function crearFactura(
  clienteId: string,
  caiRangoId: string,
  items: ItemFactura[]
) {
  const { empresaActiva } = await obtenerEmpresaActiva()
  if (!empresaActiva || items.length === 0) return { error: 'Datos incompletos' }

  const supabase = await createClient()

  const { data: caiRango } = await supabase
    .from('cai_rangos')
    .select('*')
    .eq('id', caiRangoId)
    .single()

  if (!caiRango) return { error: 'No se encontró el rango CAI' }
  if (!caiRango.activo) return { error: 'El rango CAI está inactivo' }

  const hoy = new Date().toISOString().split('T')[0]
  if (caiRango.fecha_limite_emision < hoy) {
    return { error: 'El CAI venció. Debes solicitar uno nuevo ante el SAR.' }
  }

  const siguienteNumero = caiRango.correlativo_actual + 1
  if (siguienteNumero > caiRango.rango_final) {
    return { error: 'Se agotó el rango autorizado de este CAI. Solicita uno nuevo.' }
  }

  let subtotalGravado15 = 0
  let subtotalGravado18 = 0
  let subtotalExento = 0

  for (const item of items) {
    const subtotalLinea = item.precioUnitario * item.cantidad
    if (item.tasaIsv === 15) subtotalGravado15 += subtotalLinea
    else if (item.tasaIsv === 18) subtotalGravado18 += subtotalLinea
    else subtotalExento += subtotalLinea
  }

  const isv15 = subtotalGravado15 * 0.15
  const isv18 = subtotalGravado18 * 0.18
  const total = subtotalGravado15 + subtotalGravado18 + subtotalExento + isv15 + isv18

  const numeroCorrelativo = `${caiRango.punto_emision || '000-001-01'}-${String(
    siguienteNumero
  ).padStart(8, '0')}`

  const { data: factura, error } = await supabase
    .from('facturas')
    .insert({
      empresa_id: empresaActiva.id,
      cliente_id: clienteId,
      cai_rango_id: caiRangoId,
      numero_correlativo: numeroCorrelativo,
      subtotal_gravado_15: subtotalGravado15,
      subtotal_gravado_18: subtotalGravado18,
      subtotal_exento: subtotalExento,
      isv_15: isv15,
      isv_18: isv18,
      total,
    })
    .select('id')
    .single()

  if (error || !factura) return { error: 'No se pudo guardar la factura' }

  for (const item of items) {
    await supabase.from('detalle_facturas').insert({
      factura_id: factura.id,
      producto_id: item.productoId,
      descripcion: item.descripcion || null,
      cantidad: item.cantidad,
      precio_unitario: item.precioUnitario,
      tasa_isv: item.tasaIsv,
      subtotal: item.precioUnitario * item.cantidad,
    })

    const { data: producto } = await supabase
      .from('productos_servicios')
      .select('tipo, existencia')
      .eq('id', item.productoId)
      .single()

    if (producto?.tipo === 'producto') {
      await supabase
        .from('productos_servicios')
        .update({ existencia: (producto.existencia || 0) - item.cantidad })
        .eq('id', item.productoId)
    }
  }

  await supabase
    .from('cai_rangos')
    .update({ correlativo_actual: siguienteNumero })
    .eq('id', caiRangoId)

  revalidatePath('/dashboard/facturas')
  revalidatePath('/dashboard/productos')

  return { facturaId: factura.id }
}