import { createClient } from '@/lib/supabase/server'
import { obtenerEmpresaActiva } from '@/lib/empresa'
import NuevaCotizacionForm from './nueva-cotizacion-form'
import Link from 'next/link'
import { formatearMoneda } from '@/lib/formato'

export default async function CotizacionesPage() {
  const { empresaActiva } = await obtenerEmpresaActiva()
  if (!empresaActiva) {
    return <div className="p-8">Primero selecciona una empresa desde el dashboard.</div>
  }

  const supabase = await createClient()

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

  const { data: cotizaciones } = await supabase
    .from('cotizaciones')
    .select('id, numero, fecha, total, estado, clientes(nombre)')
    .eq('empresa_id', empresaActiva.id)
    .order('fecha', { ascending: false })
    .limit(20)

  const colorEstado: Record<string, string> = {
    pendiente: 'text-amber-600',
    aprobada: 'text-green-600',
    rechazada: 'text-red-600',
    convertida: 'text-blue-600',
  }

  return (
    <>

      <h1 className="my-4 text-2xl font-bold">Cotizaciones</h1>

      <NuevaCotizacionForm productos={productos || []} clientes={clientes || []} />

      <h2 className="mb-2 text-lg font-semibold">Cotizaciones recientes</h2>
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="p-3">No.</th>
              <th className="p-3">Fecha</th>
              <th className="p-3">Cliente</th>
              <th className="p-3">Total</th>
              <th className="p-3">Estado</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {cotizaciones?.map((c: any) => (
              <tr key={c.id} className="border-t">
                <td className="p-3">{c.numero}</td>
                <td className="p-3">{c.fecha}</td>
                <td className="p-3">{c.clientes?.nombre || '—'}</td>
                <td className="p-3">L. {formatearMoneda(c.total)}</td>
                <td className={`p-3 capitalize ${colorEstado[c.estado] || ''}`}>{c.estado}</td>
                <td className="p-3">
                  <Link href={`/dashboard/cotizaciones/${c.id}`} className="text-blue-600 hover:underline">Ver</Link>
                </td>
              </tr>
            ))}
            {(!cotizaciones || cotizaciones.length === 0) && (
              <tr><td colSpan={6} className="p-6 text-center text-gray-400">Todavía no has creado cotizaciones.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}