import { createClient } from '@/lib/supabase/server'
import { obtenerEmpresaActiva } from '@/lib/empresa'
import ListaCosteos, { type FilaCosteo } from './lista-costeos'
import { precioSinIsv } from '@/lib/costeo'

// Todas las hojas de costos de la empresa, con su cotización y su factura.
export default async function CosteosPage() {
  const { empresaActiva } = await obtenerEmpresaActiva()
  if (!empresaActiva) return <div className="p-8">Primero selecciona una empresa.</div>

  const supabase = await createClient()

  const { data: costeos, error } = await supabase
    .from('costeos_cotizacion')
    .select(
      'id, rubro, costo_estimado, precio_sugerido, margen_objetivo, cotizaciones(id, numero, fecha, estado, subtotal_gravado_15, subtotal_gravado_18, subtotal_exento, subtotal_exonerado, clientes(nombre))'
    )
    .eq('empresa_id', empresaActiva.id)
    .order('creado_en', { ascending: false })
    .limit(500)

  const unoSolo = <T,>(v: T | T[] | null | undefined) => (Array.isArray(v) ? v[0] : v) ?? null

  const filasBase = (costeos || [])
    .map((c: any) => ({ c, cot: unoSolo(c.cotizaciones) as any }))
    .filter(({ cot }) => !!cot)

  const idsCotizacion = filasBase.map(({ cot }) => cot.id as string)
  const { data: facturas } = idsCotizacion.length
    ? await supabase.from('facturas').select('id, numero_correlativo, cotizacion_id').in('cotizacion_id', idsCotizacion)
    : { data: [] }
  const facturaPorCotizacion = new Map((facturas || []).map((f: any) => [f.cotizacion_id as string, f]))

  const filas: FilaCosteo[] = filasBase.map(({ c, cot }) => {
    const factura = facturaPorCotizacion.get(cot.id) as { id: string; numero_correlativo: string } | undefined
    return {
      id: c.id,
      rubro: c.rubro,
      costoEstimado: Number(c.costo_estimado) || 0,
      precioSugerido: Number(c.precio_sugerido) || 0,
      margenObjetivo: Number(c.margen_objetivo) || 0,
      precioCotizado: precioSinIsv(cot),
      cotizacionId: cot.id,
      numero: cot.numero,
      fecha: cot.fecha,
      estado: cot.estado,
      cliente: (unoSolo(cot.clientes) as { nombre: string } | null)?.nombre ?? '',
      facturaId: factura?.id ?? null,
      facturaNumero: factura?.numero_correlativo ?? null,
    }
  })

  return (
    <>
      <h1 className="my-4 text-2xl font-bold">Costeos</h1>
      <p className="mb-4 max-w-2xl text-sm text-gray-500">
        Lo que te cuesta cada trabajo cotizado y cuánto te deja. Es información interna: no la ve el cliente ni
        forma parte de tus registros fiscales. Para costear una cotización, ábrela y toca <strong>Costeo</strong>.
      </p>
      {error ? (
        <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-300">
          No se pudo leer el costeo. Si es la primera vez, ejecuta la migración{' '}
          <span className="font-mono">2026-11-20_costeo.sql</span> en Supabase.
        </div>
      ) : (
        <ListaCosteos filas={filas} />
      )}
    </>
  )
}
