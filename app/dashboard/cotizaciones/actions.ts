'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { obtenerEmpresaActiva } from '@/lib/empresa'
import { crearFactura } from '../facturas/actions'

export type ItemCotizacion = {
  productoId: string
  cantidad: number
  precioUnitario: number
  tasaIsv: number
}

export async function crearCotizacion(
  clienteId: string,
  items: ItemCotizacion[],
  validezDias: number,
  notas: string
) {
  const { empresaActiva } = await obtenerEmpresaActiva()
  if (!empresaActiva || items.length === 0) return { error: 'Datos incompletos' }

  const supabase = await createClient()

  const { count } = await supabase
    .from('cotizaciones')
    .select('id', { count: 'exact', head: true })
    .eq('empresa_id', empresaActiva.id)

  const numero = `COT-${String((count || 0) + 1).padStart(4, '0')}`

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

  const { data: cotizacion, error } = await supabase
    .from('cotizaciones')
    .insert({
      empresa_id: empresaActiva.id,
      cliente_id: clienteId,
      numero,
      validez_dias: validezDias,
      subtotal_gravado_15: subtotalGravado15,
      subtotal_gravado_18: subtotalGravado18,
      subtotal_exento: subtotalExento,
      isv_15: isv15,
      isv_18: isv18,
      total,
      notas,
    })
    .select('id')
    .single()

  if (error || !cotizacion) return { error: 'No se pudo guardar la cotización' }

  for (const item of items) {
    await supabase.from('detalle_cotizaciones').insert({
      cotizacion_id: cotizacion.id,
      producto_id: item.productoId,
      cantidad: item.cantidad,
      precio_unitario: item.precioUnitario,
      tasa_isv: item.tasaIsv,
      subtotal: item.precioUnitario * item.cantidad,
    })
  }

  revalidatePath('/dashboard/cotizaciones')
  return { cotizacionId: cotizacion.id }
}

export async function actualizarEstado(cotizacionId: string, estado: string) {
  const supabase = await createClient()
  await supabase.from('cotizaciones').update({ estado }).eq('id', cotizacionId)
  revalidatePath('/dashboard/cotizaciones')
}

export async function convertirCotizacionAFactura(cotizacionId: string, caiRangoId: string) {
  const supabase = await createClient()

  const { data: cotizacion } = await supabase
    .from('cotizaciones')
    .select('cliente_id')
    .eq('id', cotizacionId)
    .single()

  const { data: detalle } = await supabase
    .from('detalle_cotizaciones')
    .select('producto_id, cantidad, precio_unitario, tasa_isv')
    .eq('cotizacion_id', cotizacionId)

  if (!cotizacion || !detalle || detalle.length === 0) {
    return { error: 'No se encontró la cotización' }
  }

  const items = detalle.map((d) => ({
    productoId: d.producto_id,
    cantidad: d.cantidad,
    precioUnitario: d.precio_unitario,
    tasaIsv: d.tasa_isv,
  }))

  const resultado = await crearFactura(cotizacion.cliente_id, caiRangoId, items)

  if (!resultado?.error) {
    await supabase.from('cotizaciones').update({ estado: 'convertida' }).eq('id', cotizacionId)
    revalidatePath('/dashboard/cotizaciones')
  }

  return resultado
}
export async function actualizarCotizacion(
  cotizacionId: string,
  clienteId: string,
  items: ItemCotizacion[],
  validezDias: number,
  notas: string
) {
  const supabase = await createClient()

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

  const { error } = await supabase
    .from('cotizaciones')
    .update({
      cliente_id: clienteId,
      validez_dias: validezDias,
      subtotal_gravado_15: subtotalGravado15,
      subtotal_gravado_18: subtotalGravado18,
      subtotal_exento: subtotalExento,
      isv_15: isv15,
      isv_18: isv18,
      total,
      notas,
    })
    .eq('id', cotizacionId)

  if (error) return { error: 'No se pudo actualizar la cotización' }

  // Reemplazamos todo el detalle anterior por el nuevo
  await supabase.from('detalle_cotizaciones').delete().eq('cotizacion_id', cotizacionId)

  for (const item of items) {
    await supabase.from('detalle_cotizaciones').insert({
      cotizacion_id: cotizacionId,
      producto_id: item.productoId,
      cantidad: item.cantidad,
      precio_unitario: item.precioUnitario,
      tasa_isv: item.tasaIsv,
      subtotal: item.precioUnitario * item.cantidad,
    })
  }

  revalidatePath('/dashboard/cotizaciones')
  revalidatePath(`/dashboard/cotizaciones/${cotizacionId}`)
  return { ok: true }
}