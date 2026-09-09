import { createClient } from '@/lib/supabase/server'
import { obtenerEmpresaActiva } from '@/lib/empresa'
import { formatearMoneda } from '@/lib/formato'
import Link from 'next/link'

export default async function RecibosPage() {
  const { empresaActiva } = await obtenerEmpresaActiva()
  if (!empresaActiva) return <div>Primero selecciona una empresa.</div>

  const supabase = await createClient()
  const { data: recibos } = await supabase
    .from('recibos')
    .select('id, numero, fecha, total, clientes(nombre)')
    .eq('empresa_id', empresaActiva.id)
    .order('fecha', { ascending: false })

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold text-[#1B2430]">Recibos</h1>
      <p className="mb-4 text-xs text-gray-400">Documento no fiscal — no reemplaza una factura para ventas gravadas.</p>
      <div className="overflow-hidden rounded-lg bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr><th className="p-3">No.</th><th className="p-3">Fecha</th><th className="p-3">Cliente</th><th className="p-3">Total</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {recibos?.map((r: any) => (
              <tr key={r.id} className="border-t">
                <td className="p-3 font-mono">{r.numero}</td>
                <td className="p-3">{r.fecha}</td>
                <td className="p-3">{r.clientes?.nombre || '—'}</td>
                <td className="p-3">L. {formatearMoneda(r.total)}</td>
                <td className="p-3"><Link href={`/dashboard/recibos/${r.id}`} className="text-[#0E7C86] hover:underline">Ver</Link></td>
              </tr>
            ))}
            {(!recibos || recibos.length === 0) && <tr><td colSpan={5} className="p-6 text-center text-gray-400">Sin recibos.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}