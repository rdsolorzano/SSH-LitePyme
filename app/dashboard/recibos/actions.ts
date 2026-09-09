'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { obtenerEmpresaActiva } from '@/lib/empresa'

export async function crearReciboDesdeCotizacion(cotizacionId: string) {
  const { empresaActiva } = await obtenerEmpresaActiva()
  if (!empresaActiva) return { error: 'No hay empresa activa' }

  const supabase = await createClient()

  const { data: cotizacion } = await supabase
    .from('cotizaciones')
    .select('cliente_id, notas')
    .eq('id', cotizacionId)
    .single()

  const { data: detalle } = await supabase
    .from('detalle_cotizaciones')
    .select('descripcion:producto_id, cantidad, precio_unitario, productos_servicios(descripcion)')
    .eq('cotizacion_id', cotizacionId)

  if (!cotizacion || !detalle || detalle.length === 0) return { error: 'No se encontró la cotización' }

  const { count } = await supabase
    .from('recibos')
    .select('id', { count: 'exact', head: true })
    .eq('empresa_id', empresaActiva.id)

  const numero = `REC-${String((count || 0) + 1).padStart(4, '0')}`
  const total = detalle.reduce((acc: number, d: any) => acc + d.precio_unitario * d.cantidad, 0)

  const { data: recibo, error } = await supabase
    .from('recibos')
    .insert({ empresa_id: empresaActiva.id, cliente_id: cotizacion.cliente_id, numero, total, notas: cotizacion.notas })
    .select('id')
    .single()

  if (error || !recibo) return { error: 'No se pudo crear el recibo' }

  for (const d of detalle as any[]) {
    await supabase.from('detalle_recibos').insert({
      recibo_id: recibo.id,
      descripcion: d.productos_servicios?.descripcion || 'Ítem',
      cantidad: d.cantidad,
      precio_unitario: d.precio_unitario,
      subtotal: d.precio_unitario * d.cantidad,
    })
  }

  revalidatePath('/dashboard/recibos')
  return { reciboId: recibo.id }
}