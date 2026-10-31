import { createClient } from '@/lib/supabase/server'
import { obtenerEmpresaActiva } from '@/lib/empresa'
import Link from 'next/link'
import { formatearFecha, formatearMoneda } from '@/lib/formato'
import { estiloBoton, estiloInput } from '@/lib/estilos'

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

  // Historial completo = compras + cotizaciones de proveedor, ordenado por fecha
  let movimientos: { tipo: 'Compra' | 'Cotización'; fecha: string; proveedor: string; documento: string; cantidad: number | null; costo: number }[] = []
  if (productoId) {
    const { data: cotizaciones } = await supabase
      .from('detalle_cotizaciones_proveedor')
      .select('costo_unitario, cotizaciones_proveedor(fecha, numero_cotizacion, proveedores(nombre))')
      .eq('producto_id', productoId)

    movimientos = [
      ...historial.map((h: any) => ({
        tipo: 'Compra' as const,
        fecha: h.compras?.fecha || '',
        proveedor: h.compras?.proveedores?.nombre || '—',
        documento: h.compras?.numero_factura_proveedor || '—',
        cantidad: h.cantidad,
        costo: h.costo_unitario,
      })),
      ...(cotizaciones || []).map((c: any) => ({
        tipo: 'Cotización' as const,
        fecha: c.cotizaciones_proveedor?.fecha || '',
        proveedor: c.cotizaciones_proveedor?.proveedores?.nombre || '—',
        documento: c.cotizaciones_proveedor?.numero_cotizacion || '—',
        cantidad: null,
        costo: c.costo_unitario,
      })),
    ].sort((a, b) => b.fecha.localeCompare(a.fecha))
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
      <Link href="/dashboard/compras" className="text-sm text-acento hover:underline">← Volver a compras</Link>
      <h1 className="my-4 text-2xl font-bold text-marca">Historial de costos por producto</h1>

      <form method="get" className="mb-6 flex max-w-md items-end gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-xs text-gray-500">Producto</label>
          <select name="producto" defaultValue={productoId || ''} className={`${estiloInput} w-full text-sm`}>
            <option value="">-- Selecciona un producto --</option>
            {productos?.map((p) => (
              <option key={p.id} value={p.id}>{p.descripcion}</option>
            ))}
          </select>
        </div>
        <button type="submit" className={estiloBoton}>
          Ver
        </button>
      </form>

      {productoId && (
        <>
          <h2 className="mb-2 font-semibold text-marca">Comparativo por proveedor</h2>
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
                      <td className="p-3 text-right font-mono">L. {formatearMoneda(r.ultimoCosto)}</td>
                      <td className="p-3 text-right">{formatearFecha(r.ultimaFecha)}</td>
                      <td className="p-3 text-right font-mono">L. {formatearMoneda(r.sumaCosto / r.compras)}</td>
                      <td className="p-3 text-right">{r.compras}</td>
                    </tr>
                  ))}
                {Object.keys(resumenPorProveedor).length === 0 && (
                  <tr><td colSpan={5} className="p-6 text-center text-gray-400">Sin compras registradas para este producto.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <h2 className="mb-2 font-semibold text-marca">Historial completo</h2>
          <div className="overflow-hidden rounded-lg bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Proveedor</th>
                  <th className="p-3">No. Documento</th>
                  <th className="p-3 text-right">Cantidad</th>
                  <th className="p-3 text-right">Costo unit.</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map((m, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-3">{formatearFecha(m.fecha)}</td>
                    <td className={`p-3 ${m.tipo === 'Cotización' ? 'text-amber-700' : ''}`}>{m.tipo}</td>
                    <td className="p-3">{m.proveedor}</td>
                    <td className="p-3 font-mono">{m.documento}</td>
                    <td className="p-3 text-right font-mono">{m.cantidad ?? '—'}</td>
                    <td className="p-3 text-right font-mono">L. {formatearMoneda(m.costo)}</td>
                  </tr>
                ))}
                {movimientos.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-gray-400">Sin compras ni cotizaciones registradas para este producto.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  )
}