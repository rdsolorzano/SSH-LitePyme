import { createClient } from '@/lib/supabase/server'
import { obtenerEmpresaActiva } from '@/lib/empresa'
import Link from 'next/link'

export default async function HistorialComprasPage({
  searchParams,
}: {
  searchParams: Promise<{ producto?: string }>
}) {
  const { producto: productoId } = await searchParams
  const { empresaActiva } = await obtenerEmpresaActiva()
  if (!empresaActiva) return <div>Primero selecciona una empresa.</div>

  const supabase = await createClient()

  const { data: productos } = await supabase
    .from('productos_servicios')
    .select('id, descripcion')
    .eq('empresa_id', empresaActiva.id)
    .order('descripcion')

  let historial: any[] = []
  if (productoId) {
    const { data } = await supabase
      .from('detalle_compras')
      .select('cantidad, costo_unitario, compras(fecha, numero_factura_proveedor, proveedores(nombre))')
      .eq('producto_id', productoId)

    historial = (data || []).sort((a: any, b: any) =>
      (b.compras?.fecha || '').localeCompare(a.compras?.fecha || '')
    )
  }

  const resumenPorProveedor: Record<string, { ultimoCosto: number; ultimaFecha: string; compras: number; sumaCosto: number }> = {}

  for (const h of historial) {
    const nombreProveedor = h.compras?.proveedores?.nombre || 'Desconocido'
    if (!resumenPorProveedor[nombreProveedor]) {
      resumenPorProveedor[nombreProveedor] = {
        ultimoCosto: h.costo_unitario,
        ultimaFecha: h.compras?.fecha || '',
        compras: 0,
        sumaCosto: 0,
      }
    }
    resumenPorProveedor[nombreProveedor].compras += 1
    resumenPorProveedor[nombreProveedor].sumaCosto += h.costo_unitario
    if ((h.compras?.fecha || '') > resumenPorProveedor[nombreProveedor].ultimaFecha) {
      resumenPorProveedor[nombreProveedor].ultimoCosto = h.costo_unitario
      resumenPorProveedor[nombreProveedor].ultimaFecha = h.compras.fecha
    }
  }

  return (
    <>
      <Link href="/dashboard/compras" className="text-sm text-[#0E7C86] hover:underline">← Volver a compras</Link>
      <h1 className="my-4 text-2xl font-bold text-[#1B2430]">Historial de costos por producto</h1>

      <form method="get" className="mb-6 flex max-w-md items-end gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-xs text-gray-500">Producto</label>
          <select name="producto" defaultValue={productoId || ''} className="w-full rounded border px-3 py-2 text-sm">
            <option value="">-- Selecciona un producto --</option>
            {productos?.map((p) => (
              <option key={p.id} value={p.id}>{p.descripcion}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="rounded bg-[#0E7C86] px-4 py-2 text-sm text-white hover:bg-[#0c6971]">
          Ver
        </button>
      </form>

      {productoId && (
        <>
          <h2 className="mb-2 font-semibold text-[#1B2430]">Comparativo por proveedor</h2>
          <div className="mb-6 overflow-hidden rounded-lg bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="p-3">Proveedor</th>
                  <th className="p-3 text-right">Último costo</th>
                  <th className="p-3 text-right">Última compra</th>
                  <th className="p-3 text-right">Costo promedio</th>
                  <th className="p-3 text-right">Veces comprado</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(resumenPorProveedor)
                  .sort((a, b) => a[1].ultimoCosto - b[1].ultimoCosto)
                  .map(([proveedor, r]) => (
                    <tr key={proveedor} className="border-t">
                      <td className="p-3">{proveedor}</td>
                      <td className="p-3 text-right font-mono">L. {r.ultimoCosto.toFixed(2)}</td>
                      <td className="p-3 text-right">{r.ultimaFecha}</td>
                      <td className="p-3 text-right font-mono">L. {(r.sumaCosto / r.compras).toFixed(2)}</td>
                      <td className="p-3 text-right">{r.compras}</td>
                    </tr>
                  ))}
                {Object.keys(resumenPorProveedor).length === 0 && (
                  <tr><td colSpan={5} className="p-6 text-center text-gray-400">Sin compras registradas para este producto.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <h2 className="mb-2 font-semibold text-[#1B2430]">Historial completo</h2>
          <div className="overflow-hidden rounded-lg bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Proveedor</th>
                  <th className="p-3">No. Factura Prov.</th>
                  <th className="p-3 text-right">Cantidad</th>
                  <th className="p-3 text-right">Costo unit.</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((h: any, i: number) => (
                  <tr key={i} className="border-t">
                    <td className="p-3">{h.compras?.fecha}</td>
                    <td className="p-3">{h.compras?.proveedores?.nombre || '—'}</td>
                    <td className="p-3 font-mono">{h.compras?.numero_factura_proveedor || '—'}</td>
                    <td className="p-3 text-right font-mono">{h.cantidad}</td>
                    <td className="p-3 text-right font-mono">L. {h.costo_unitario}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  )
}