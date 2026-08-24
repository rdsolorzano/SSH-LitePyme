import { createClient } from '@/lib/supabase/server'
import { obtenerEmpresaActiva } from '@/lib/empresa'
import NuevaFacturaForm from './nueva-factura-form'
import Link from 'next/link'
import { formatearMoneda } from '@/lib/formato'

export default async function FacturasPage() {
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

  const { data: caiRangos } = await supabase
    .from('cai_rangos')
    .select('id, cai, punto_emision')
    .eq('empresa_id', empresaActiva.id)
    .eq('activo', true)

  const { data: facturas } = await supabase
    .from('facturas')
    .select('id, numero_correlativo, fecha, total, clientes(nombre)')
    .eq('empresa_id', empresaActiva.id)
    .order('fecha', { ascending: false })
    .limit(20)

  return (
    <>

      <h1 className="my-4 text-2xl font-bold">Facturación</h1>

      {(!caiRangos || caiRangos.length === 0) && (
        <p className="mb-4 text-sm text-amber-600">
          No tienes un rango CAI activo. No podrás emitir facturas hasta que se configure uno.
        </p>
      )}

      <NuevaFacturaForm productos={productos || []} clientes={clientes || []} caiRangos={caiRangos || []} />

      <h2 className="mb-2 text-lg font-semibold">Facturas emitidas</h2>
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="p-3">No. Factura</th>
              <th className="p-3">Fecha</th>
              <th className="p-3">Cliente</th>
              <th className="p-3">Total</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {facturas?.map((f: any) => (
              <tr key={f.id} className="border-t">
                <td className="p-3">{f.numero_correlativo}</td>
                <td className="p-3">{f.fecha}</td>
                <td className="p-3">{f.clientes?.nombre || '—'}</td>
                <td className="p-3">L. {formatearMoneda(f.total)}</td>
                <td className="p-3">
                  <Link href={`/dashboard/facturas/${f.id}`} className="text-blue-600 hover:underline">Ver / Imprimir</Link>
                </td>
              </tr>
            ))}
            {(!facturas || facturas.length === 0) && (
              <tr><td colSpan={5} className="p-6 text-center text-gray-400">Todavía no has emitido facturas.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}