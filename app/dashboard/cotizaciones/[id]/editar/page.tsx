import { createClient } from '@/lib/supabase/server'
import { obtenerEmpresaActiva } from '@/lib/empresa'
import EditarCotizacionForm from './editar-cotizacion-form'
import Link from 'next/link'

export default async function EditarCotizacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { empresaActiva } = await obtenerEmpresaActiva()
  if (!empresaActiva) return <div>Primero selecciona una empresa.</div>

  const supabase = await createClient()

  const { data: cotizacion } = await supabase.from('cotizaciones').select('*').eq('id', id).single()
  if (!cotizacion) return <div>Cotización no encontrada.</div>

  if (cotizacion.estado === 'convertida') {
    return (
      <div className="rounded-lg bg-white p-8 shadow-sm">
        <p className="text-gray-600">Esta cotización ya fue convertida en factura y no se puede editar.</p>
        <Link href={`/dashboard/cotizaciones/${id}`} className="mt-3 inline-block text-[#0E7C86] hover:underline">← Volver</Link>
      </div>
    )
  }

  const { data: detalle } = await supabase.from('detalle_cotizaciones').select('*').eq('cotizacion_id', id)

  const { data: productos } = await supabase
    .from('productos_servicios')
    .select('id, descripcion, precio_unitario, tasa_isv')
    .eq('empresa_id', empresaActiva.id)
    .eq('activo', true)
    .order('descripcion')

  const { data: clientes } = await supabase
    .from('clientes')
    .select('id, nombre')
    .eq('empresa_id', empresaActiva.id)
    .eq('activo', true)
    .order('nombre')

  return (
    <>
      <Link href={`/dashboard/cotizaciones/${id}`} className="text-sm text-[#0E7C86] hover:underline">← Volver</Link>
      <h1 className="my-4 text-2xl font-bold text-[#1B2430]">Editar cotización {cotizacion.numero}</h1>
      <EditarCotizacionForm
        cotizacionId={id}
        cotizacion={cotizacion}
        detalleInicial={detalle || []}
        productos={productos || []}
        clientes={clientes || []}
      />
    </>
  )
}