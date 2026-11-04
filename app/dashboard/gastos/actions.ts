'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { obtenerEmpresaActiva } from '@/lib/empresa'
import { CATEGORIAS_GASTO } from '@/lib/gastos'

export type DatosGasto = {
  fecha: string
  tipoDocumento: string
  numeroDocumento: string
  nombreProveedor: string
  rtnProveedor: string
  categoria: string
  descripcion: string
  gravado15: number
  gravado18: number
  exento: number
  exonerado: number
  isv15: number
  isv18: number
  deducibleIsr: boolean
}

const redondear = (n: number) => Math.round((Number(n) || 0) * 100) / 100

export async function crearGasto(d: DatosGasto) {
  const { empresaActiva } = await obtenerEmpresaActiva()
  if (!empresaActiva) return { error: 'No hay empresa activa' }

  if (!d.fecha) return { error: 'Indica la fecha del gasto' }
  if (!d.nombreProveedor.trim()) return { error: 'Indica a quién le pagaste (proveedor)' }
  if (!CATEGORIAS_GASTO.some((c) => c.valor === d.categoria)) return { error: 'Elige una categoría' }
  if (d.tipoDocumento === 'factura' && !d.numeroDocumento.trim()) {
    return { error: 'Indica el número de la factura' }
  }

  const montos = {
    subtotal_gravado_15: redondear(d.gravado15),
    subtotal_gravado_18: redondear(d.gravado18),
    subtotal_exento: redondear(d.exento),
    subtotal_exonerado: redondear(d.exonerado),
    isv_15: redondear(d.isv15),
  }
  const isv18 = redondear(d.isv18)
  const total = redondear(
    montos.subtotal_gravado_15 + montos.subtotal_gravado_18 + montos.subtotal_exento + montos.subtotal_exonerado + montos.isv_15 + isv18
  )
  if (total <= 0) return { error: 'El gasto debe tener algún monto' }

  const supabase = await createClient()
  const { error } = await supabase.from('gastos').insert({
    empresa_id: empresaActiva.id,
    fecha: d.fecha,
    tipo_documento: d.tipoDocumento,
    numero_documento: d.numeroDocumento.trim() || null,
    nombre_proveedor: d.nombreProveedor.trim(),
    rtn_proveedor: d.rtnProveedor.trim() || null,
    categoria: d.categoria,
    descripcion: d.descripcion.trim() || null,
    subtotal_gravado_15: montos.subtotal_gravado_15,
    subtotal_gravado_18: montos.subtotal_gravado_18,
    subtotal_exento: montos.subtotal_exento,
    subtotal_exonerado: montos.subtotal_exonerado,
    isv_15: montos.isv_15,
    isv_18: isv18,
    total,
    deducible_isr: d.deducibleIsr,
  })

  if (error) return { error: 'No se pudo guardar el gasto: ' + error.message }

  revalidatePath('/dashboard/gastos')
  revalidatePath('/dashboard/reportes')
  return { ok: true }
}

export async function eliminarGasto(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('gastos').delete().eq('id', id)
  if (error) return { error: 'No se pudo eliminar: ' + error.message }
  revalidatePath('/dashboard/gastos')
  revalidatePath('/dashboard/reportes')
  return { ok: true }
}
