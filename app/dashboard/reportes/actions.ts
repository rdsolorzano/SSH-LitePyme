'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { obtenerEmpresaActiva } from '@/lib/empresa'
import { exigirPermiso } from '@/lib/permisos'
import { sumarDocumentos, sumarTotales } from '@/lib/gastos'
import { isvDe, ultimoDiaMes } from '@/lib/indicadores'

const esMes = (v: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(v)
const esFecha = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v)

// ISV neto del mes según los documentos registrados (ventas − compras y gastos)
async function isvNetoDelMes(empresaId: string, mes: string) {
  const supabase = await createClient()
  const desde = `${mes}-01`
  const hasta = ultimoDiaMes(mes)
  const campos = 'subtotal_gravado_15, subtotal_gravado_18, subtotal_exento, isv_15, isv_18, total'
  const [{ data: facturas }, { data: compras }, { data: gastos }] = await Promise.all([
    supabase.from('facturas').select(campos).eq('empresa_id', empresaId).gte('fecha', desde).lte('fecha', hasta),
    supabase.from('compras').select(campos).eq('empresa_id', empresaId).gte('fecha', desde).lte('fecha', hasta),
    supabase.from('gastos').select(campos).eq('empresa_id', empresaId).gte('fecha', desde).lte('fecha', hasta),
  ])
  const ventas = sumarDocumentos(facturas || [])
  const egresos = sumarTotales(sumarDocumentos(compras || []), sumarDocumentos(gastos || []))
  return Math.round((isvDe(ventas) - isvDe(egresos)) * 100) / 100
}

export type DatosDeclaracion = {
  mes: string
  fechaPresentacion: string
  numeroConstancia: string
  montoPagado: number
  notas: string
}

// Marca un mes como declarado (o actualiza los datos si ya estaba marcado)
export async function guardarDeclaracion(datos: DatosDeclaracion) {
  const bloqueo = await exigirPermiso('admin')
  if (bloqueo) return { error: bloqueo }

  const { empresaActiva } = await obtenerEmpresaActiva()
  if (!empresaActiva) return { error: 'No hay empresa activa' }
  if (!esMes(datos.mes)) return { error: 'Mes no válido.' }
  if (!esFecha(datos.fechaPresentacion)) return { error: 'Indica la fecha en que presentaste la declaración.' }
  const montoPagado = Number(datos.montoPagado)
  if (!Number.isFinite(montoPagado) || montoPagado < 0) return { error: 'El monto pagado no es válido.' }

  const supabase = await createClient()
  const { error } = await supabase.from('declaraciones').upsert(
    {
      empresa_id: empresaActiva.id,
      tipo: 'isv_mensual',
      periodo: datos.mes,
      fecha_presentacion: datos.fechaPresentacion,
      numero_constancia: datos.numeroConstancia.trim().slice(0, 60) || null,
      monto_calculado: await isvNetoDelMes(empresaActiva.id, datos.mes),
      monto_pagado: Math.round(montoPagado * 100) / 100,
      notas: datos.notas.trim().slice(0, 1000) || null,
      actualizado_en: new Date().toISOString(),
    },
    { onConflict: 'empresa_id,tipo,periodo' }
  )

  if (error) return { error: 'No se pudo guardar. ¿Ya ejecutaste la migración 2026-11-22_declaraciones.sql?' }

  revalidatePath('/dashboard/reportes')
  revalidatePath('/dashboard')
  return { ok: true }
}

// Quita la marca de "declarado" de un mes
export async function quitarDeclaracion(mes: string) {
  const bloqueo = await exigirPermiso('admin')
  if (bloqueo) return { error: bloqueo }

  const { empresaActiva } = await obtenerEmpresaActiva()
  if (!empresaActiva || !esMes(mes)) return { error: 'Datos incompletos' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('declaraciones')
    .delete()
    .eq('empresa_id', empresaActiva.id)
    .eq('tipo', 'isv_mensual')
    .eq('periodo', mes)

  if (error) return { error: 'No se pudo quitar la marca.' }

  revalidatePath('/dashboard/reportes')
  revalidatePath('/dashboard')
  return { ok: true }
}
