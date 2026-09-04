'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { obtenerEmpresaActiva } from '@/lib/empresa'

export async function crearOrden(
  clienteId: string,
  titulo: string,
  prioridad: string,
  fechaCompromiso: string,
  notas: string,
  items: string[]
) {
  const { empresaActiva } = await obtenerEmpresaActiva()
  if (!empresaActiva) return { error: 'No hay empresa activa' }

  const supabase = await createClient()

  const { data: orden, error } = await supabase
    .from('ordenes_trabajo')
    .insert({
      empresa_id: empresaActiva.id,
      cliente_id: clienteId || null,
      titulo,
      prioridad,
      fecha_compromiso: fechaCompromiso || null,
      notas,
    })
    .select('id')
    .single()

  if (error || !orden) return { error: 'No se pudo crear la orden' }

  const itemsValidos = items.filter((i) => i.trim())
  for (const descripcion of itemsValidos) {
    await supabase.from('detalle_ordenes_trabajo').insert({ orden_id: orden.id, descripcion })
  }

  revalidatePath('/dashboard/ordenes')
  return { ordenId: orden.id }
}

export async function actualizarOrden(
  ordenId: string,
  clienteId: string,
  titulo: string,
  prioridad: string,
  fechaCompromiso: string,
  notas: string,
  items: { id?: string; descripcion: string; completado: boolean }[]
) {
  const supabase = await createClient()

  const { error: errorActualizar } = await supabase
    .from('ordenes_trabajo')
    .update({
      cliente_id: clienteId || null,
      titulo,
      prioridad,
      fecha_compromiso: fechaCompromiso || null,
      notas,
    })
    .eq('id', ordenId)

  if (errorActualizar) return { error: 'No se pudo actualizar la orden' }

  await supabase.from('detalle_ordenes_trabajo').delete().eq('orden_id', ordenId)

  const itemsValidos = items.filter((i) => i.descripcion.trim())
  for (const item of itemsValidos) {
    await supabase.from('detalle_ordenes_trabajo').insert({
      orden_id: ordenId,
      descripcion: item.descripcion,
      completado: item.completado,
    })
  }

  revalidatePath('/dashboard/ordenes')
  revalidatePath(`/dashboard/ordenes/${ordenId}`)
  return { ok: true }
}

export async function alternarItem(itemId: string, completado: boolean) {
  const supabase = await createClient()
  await supabase.from('detalle_ordenes_trabajo').update({ completado }).eq('id', itemId)
  revalidatePath('/dashboard/ordenes')
}

export async function actualizarEstadoOrden(id: string, estado: string) {
  const supabase = await createClient()

  await supabase
    .from('ordenes_trabajo')
    .update({
      estado,
      completado_at: estado === 'completado' ? new Date().toISOString() : null,
    })
    .eq('id', id)

  revalidatePath('/dashboard/ordenes')
}

export async function eliminarOrden(id: string) {
  const supabase = await createClient()
  await supabase.from('ordenes_trabajo').delete().eq('id', id)
  revalidatePath('/dashboard/ordenes')
}