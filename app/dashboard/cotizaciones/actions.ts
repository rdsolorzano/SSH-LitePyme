'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { obtenerEmpresaActiva } from '@/lib/empresa'
import { crearFactura } from '../facturas/actions'
import { calcularTotales, type DatosExoneracion } from '@/lib/exoneracion'

export type ItemCotizacion = {
  productoId: string
  descripcion: string
  cantidad: number
  precioUnitario: number
  tasaIsv: number
}

export async function crearCotizacion(
  clienteId: string,
  items: ItemCotizacion[],
  validezDias: number,
  notas: string,
  exoneracion?: DatosExoneracion
) {
  const { empresaActiva } = await obtenerEmpresaActiva()
  if (!empresaActiva || items.length === 0) return { error: 'Datos incompletos' }

  const supabase = await createClient()

  const { count } = await supabase
    .from('cotizaciones')
    .select('id', { count: 'exact', head: true })
    .eq('empresa_id', empresaActiva.id)

  const numero = `COT-${String((count || 0) + 1).padStart(4, '0')}`

    const { data: cli } = await supabase.from('clientes').select('exonerado').eq('id', clienteId).single()
  const esExonerado = !!cli?.exonerado

  const t = calcularTotales(items, esExonerado)
  const subtotalGravado15 = t.gravado15
  const subtotalGravado18 = t.gravado18
  const subtotalExento = t.exento
  const isv15 = t.isv15
  const isv18 = t.isv18
  const total = t.total


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
      exonerado: esExonerado,
      subtotal_exonerado: t.exonerado,
      no_constancia_exonerado: esExonerado ? exoneracion?.noConstancia || null : null,
      no_registro_sag: esExonerado ? exoneracion?.noRegistroSag || null : null,
      no_orden_compra_exenta: esExonerado ? exoneracion?.noOrdenCompra || null : null,
    })
    .select('id')
    .single()

  if (error || !cotizacion) return { error: 'No se pudo guardar la cotización' }

  for (const item of items) {
    await supabase.from('detalle_cotizaciones').insert({
      cotizacion_id: cotizacion.id,
      producto_id: item.productoId,
      descripcion: item.descripcion || null,
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
    .select('cliente_id, exonerado, no_constancia_exonerado, no_registro_sag, no_orden_compra_exenta')
    .eq('id', cotizacionId)
    .single()

  const { data: detalle } = await supabase
    .from('detalle_cotizaciones')
    .select('producto_id, descripcion, cantidad, precio_unitario, tasa_isv')
    .eq('cotizacion_id', cotizacionId)

  if (!cotizacion || !detalle || detalle.length === 0) {
    return { error: 'No se encontró la cotización' }
  }

  const items = detalle.map((d) => ({
    productoId: d.producto_id,
    descripcion: d.descripcion || '',
    cantidad: d.cantidad,
    precioUnitario: d.precio_unitario,
    tasaIsv: d.tasa_isv,
  }))

  const exoneracion = cotizacion.exonerado
    ? {
        noConstancia: cotizacion.no_constancia_exonerado || '',
        noRegistroSag: cotizacion.no_registro_sag || '',
        noOrdenCompra: cotizacion.no_orden_compra_exenta || '',
      }
    : undefined

  const resultado = await crearFactura(cotizacion.cliente_id, caiRangoId, items, exoneracion)

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
  notas: string,
  exoneracion?: DatosExoneracion
) {
  const supabase = await createClient()

  const { data: cli } = await supabase.from('clientes').select('exonerado').eq('id', clienteId).single()
  const esExonerado = !!cli?.exonerado

  const t = calcularTotales(items, esExonerado)
  const subtotalGravado15 = t.gravado15
  const subtotalGravado18 = t.gravado18
  const subtotalExento = t.exento
  const isv15 = t.isv15
  const isv18 = t.isv18
  const total = t.total

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
      exonerado: esExonerado,
      subtotal_exonerado: t.exonerado,
      no_constancia_exonerado: esExonerado ? exoneracion?.noConstancia || null : null,
      no_registro_sag: esExonerado ? exoneracion?.noRegistroSag || null : null,
      no_orden_compra_exenta: esExonerado ? exoneracion?.noOrdenCompra || null : null,
    })
    .eq('id', cotizacionId)

  if (error) return { error: 'No se pudo actualizar la cotización' }

  // Reemplazamos todo el detalle anterior por el nuevo
  await supabase.from('detalle_cotizaciones').delete().eq('cotizacion_id', cotizacionId)

  for (const item of items) {
    await supabase.from('detalle_cotizaciones').insert({
      cotizacion_id: cotizacionId,
      producto_id: item.productoId,
      descripcion: item.descripcion || null,
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