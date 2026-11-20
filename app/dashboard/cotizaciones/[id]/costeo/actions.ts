'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { obtenerEmpresaActiva } from '@/lib/empresa'
import {
  RUBROS,
  TIPOS_LINEA,
  calcularCosteo,
  precioSugerido,
  redondear,
  type LineaCosteo,
  type ParametrosCosteo,
} from '@/lib/costeo'

export type DatosCosteo = {
  rubro: string
  parametros: ParametrosCosteo
  lineas: LineaCosteo[]
  notas: string
}

const positivo = (v: unknown) => {
  const x = Number(v)
  return Number.isFinite(x) && x > 0 ? redondear(x) : 0
}

// Guarda la hoja de costos ESTIMADA de una cotización (crea o reemplaza).
// Los totales se recalculan aquí, no se confía en lo que manda la pantalla.
export async function guardarCosteo(cotizacionId: string, datos: DatosCosteo) {
  const { empresaActiva } = await obtenerEmpresaActiva()
  if (!empresaActiva) return { error: 'No hay empresa activa' }

  const supabase = await createClient()

  const { data: cotizacion } = await supabase
    .from('cotizaciones')
    .select('id, empresa_id')
    .eq('id', cotizacionId)
    .single()
  if (!cotizacion) return { error: 'No se encontró la cotización' }

  const { data: existente } = await supabase
    .from('costeos_cotizacion')
    .select('id, estimado_cerrado')
    .eq('cotizacion_id', cotizacionId)
    .maybeSingle()
  if (existente?.estimado_cerrado) {
    return { error: 'Esta cotización ya se facturó: su costeo estimado quedó en solo lectura.' }
  }

  const margen = positivo(datos.parametros.margenObjetivo)
  if (margen >= 100) return { error: 'El margen objetivo debe ser menor que 100 %.' }

  const parametros: ParametrosCosteo = {
    indirectoHora: positivo(datos.parametros.indirectoHora),
    tarifaHora: positivo(datos.parametros.tarifaHora),
    costoKm: positivo(datos.parametros.costoKm),
    pctConsumibles: positivo(datos.parametros.pctConsumibles),
    pctImprevistos: positivo(datos.parametros.pctImprevistos),
    margenObjetivo: margen,
  }

  // Renglones válidos: tipo conocido y con algo escrito
  const lineas: LineaCosteo[] = (datos.lineas || [])
    .filter((l) => TIPOS_LINEA.some((t) => t.valor === l.tipo))
    .map((l) => ({
      tipo: l.tipo,
      descripcion: String(l.descripcion || '').trim().slice(0, 300),
      productoId: l.productoId || null,
      unidad: l.unidad ? String(l.unidad).slice(0, 20) : null,
      tecnicos: l.tipo === 'mano_obra' ? positivo(l.tecnicos) || 1 : 1,
      cantidad: positivo(l.cantidad),
      costoUnitario: positivo(l.costoUnitario),
      cantidadReal: null,
      costoUnitarioReal: null,
      soloReal: false,
    }))
    .filter((l) => l.descripcion || l.cantidad > 0 || l.costoUnitario > 0)

  const desglose = calcularCosteo(lineas, parametros)
  const rubro = RUBROS.some((r) => r.valor === datos.rubro) ? datos.rubro : 'general'

  const { data: costeo, error } = await supabase
    .from('costeos_cotizacion')
    .upsert(
      {
        empresa_id: cotizacion.empresa_id,
        cotizacion_id: cotizacionId,
        rubro,
        indirecto_hora: parametros.indirectoHora,
        tarifa_hora: parametros.tarifaHora,
        costo_km: parametros.costoKm,
        pct_consumibles: parametros.pctConsumibles,
        pct_imprevistos: parametros.pctImprevistos,
        margen_objetivo: parametros.margenObjetivo,
        costo_estimado: desglose.total,
        precio_sugerido: precioSugerido(desglose.total, parametros.margenObjetivo),
        notas: String(datos.notas || '').trim().slice(0, 2000) || null,
        actualizado_en: new Date().toISOString(),
      },
      { onConflict: 'cotizacion_id' }
    )
    .select('id')
    .single()

  if (error || !costeo) {
    return { error: 'No se pudo guardar el costeo. ¿Ya ejecutaste la migración de costeo en Supabase?' }
  }

  // Reemplazamos todos los renglones por los nuevos
  await supabase.from('costeo_lineas').delete().eq('costeo_id', costeo.id)
  if (lineas.length > 0) {
    const { error: errorLineas } = await supabase.from('costeo_lineas').insert(
      lineas.map((l, i) => ({
        costeo_id: costeo.id,
        tipo: l.tipo,
        descripcion: l.descripcion,
        producto_id: l.productoId,
        unidad: l.unidad,
        tecnicos: l.tecnicos,
        cantidad: l.cantidad,
        costo_unitario: l.costoUnitario,
        orden: i,
      }))
    )
    if (errorLineas) return { error: 'Se guardó la hoja, pero no sus renglones. Intenta de nuevo.' }
  }

  revalidatePath(`/dashboard/cotizaciones/${cotizacionId}`)
  revalidatePath(`/dashboard/cotizaciones/${cotizacionId}/costeo`)
  revalidatePath('/dashboard/cotizaciones')
  revalidatePath('/dashboard/costeos')
  return { ok: true }
}
