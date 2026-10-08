import { createClient } from '@/lib/supabase/server'
import { formatearMoneda } from '@/lib/formato'
import Link from 'next/link'

export default async function DetalleCompraPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: compra } = await supabase
    .from('compras')
    .select('*, proveedores(nombre, rtn, telefono)')
    .eq('id', id)
    .single()

  if (!compra) return <div>Compra no encontrada.</div>

  const { data: detalle } = await supabase
    .from('detalle_compras')
    .select('*, productos_servicios(descripcion, serie)')
    .eq('compra_id', id)

  return (
    <>
      <Link href="/dashboard/compras" className="text-sm text-[#0E7C86] hover:underline">← Volver a compras</Link>

      <h1 className="my-4 text-2xl font-bold text-[#1B2430]">Detalle de compra</h1>

      <div className="mb-6 grid grid-cols-1 gap-4 rounded-lg bg-white p-6 shadow-sm sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400">Proveedor</p>
          <p className="font-medium text-[#1B2430]">{compra.proveedores?.nombre || '—'}</p>
          {compra.proveedores?.rtn && <p className="text-sm text-gray-500">RTN: {compra.proveedores.rtn}</p>}
          {compra.proveedores?.telefono && <p className="text-sm text-gray-500">Tel: {compra.proveedores.telefono}</p>}
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400">No. Factura del proveedor</p>
          <p className="font-mono text-[#1B2430]">{compra.numero_factura_proveedor || '—'}</p>
          <p className="mt-2 text-xs uppercase tracking-wide text-gray-400">Fecha de la factura</p>
          <p className="text-[#1B2430]">{compra.fecha}</p>
        </div>
      </div>

      <h2 className="mb-2 font-semibold text-[#1B2430]">Artículos comprados</h2>
      <div className="mb-6 overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="p-3">Producto</th>
              <th className="p-3 text-right">Cantidad</th>
              <th className="p-3 text-right">Costo unit. (c/ISV)</th>
              <th className="p-3 text-right">ISV</th>
              <th className="p-3 text-right">Subtotal línea</th>
            </tr>
          </thead>
          <tbody>
            {detalle?.map((d: any) => (
              <tr key={d.id} className="border-t">
                <td className="p-3">
                  {d.productos_servicios?.descripcion || '—'}
                  {d.productos_servicios?.serie && <p className="font-mono text-xs text-gray-400">Serie: {d.productos_servicios.serie}</p>}
                </td>
                <td className="p-3 text-right font-mono">{d.cantidad}</td>
                <td className="p-3 text-right font-mono">L. {formatearMoneda(d.costo_unitario)}</td>
                <td className="p-3 text-right font-mono">{d.tasa_isv}%</td>
                <td className="p-3 text-right font-mono">L. {formatearMoneda(d.subtotal)}</td>
              </tr>
            ))}
            {(!detalle || detalle.length === 0) && (
              <tr><td colSpan={5} className="p-6 text-center text-gray-400">Sin artículos registrados en esta compra.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="ml-auto max-w-xs space-y-1 rounded-lg bg-white p-4 text-sm shadow-sm">
        <div className="flex justify-between text-gray-600"><span>Gravado 15%</span><span className="font-mono">L. {formatearMoneda(compra.subtotal_gravado_15)}</span></div>
        <div className="flex justify-between text-gray-600"><span>Gravado 18%</span><span className="font-mono">L. {formatearMoneda(compra.subtotal_gravado_18)}</span></div>
        <div className="flex justify-between text-gray-600"><span>Exento</span><span className="font-mono">L. {formatearMoneda(compra.subtotal_exento)}</span></div>
        <div className="flex justify-between text-gray-600"><span>ISV 15%</span><span className="font-mono">L. {formatearMoneda(compra.isv_15)}</span></div>
        <div className="flex justify-between text-gray-600"><span>ISV 18%</span><span className="font-mono">L. {formatearMoneda(compra.isv_18)}</span></div>
        <div className="flex justify-between border-t-2 border-[#1B2430] pt-2 text-base font-bold text-[#1B2430]">
          <span>Total</span><span className="font-mono">L. {formatearMoneda(compra.total)}</span>
        </div>
      </div>
    </>
  )
}