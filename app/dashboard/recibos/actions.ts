'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { obtenerEmpresaActiva } from '@/lib/empresa'
import { exigirPermiso } from '@/lib/permisos'

export async function crearReciboDesdeCotizacion(cotizacionId: string) {
  const bloqueo = await exigirPermiso('ventas')
  if (bloqueo) return { error: bloqueo }
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
    .select('descripcion, cantidad, precio_unitario, productos_servicios(descripcion)')
    .eq('cotizacion_id', cotizacionId)

  if (!cotizacion || !detalle || detalle.length === 0) return { error: 'No se encontró la cotización' }

  // Número seguro: dos personas al mismo tiempo nunca reciben el mismo
  const { data: siguiente, error: errorNumero } = await supabase.rpc('siguiente_correlativo', {
    p_empresa_id: empresaActiva.id,
    p_tipo: 'recibo',
  })
  if (errorNumero || !siguiente) {
    return { error: 'No se pudo asignar el número. ¿Ya ejecutaste la migración 2026-11-21_seguridad_facturacion.sql?' }
  }

  const numero = `REC-${String(siguiente).padStart(4, '0')}`
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
      descripcion: d.descripcion || d.productos_servicios?.descripcion || 'Ítem',
      cantidad: d.cantidad,
      precio_unitario: d.precio_unitario,
      subtotal: d.precio_unitario * d.cantidad,
    })
  }

  revalidatePath('/dashboard/recibos')
  return { reciboId: recibo.id }
}