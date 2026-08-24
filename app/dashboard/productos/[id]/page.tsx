import { createClient } from '@/lib/supabase/server'
import { obtenerEmpresaActiva } from '@/lib/empresa'
import Link from 'next/link'
import EditarPrecio from './editar-precio'
import { formatearMoneda } from '@/lib/formato'

export default async function DetalleProductoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { empresaActiva } = await obtenerEmpresaActiva()
  if (!empresaActiva) return <div>Primero selecciona una empresa.</div>

  const supabase = await createClient()

  const { data: producto } = await supabase
    .from('productos_servicios')
    .select('*')
    .eq('id', id)
    .single()

  if (!producto) return <div>Producto no encontrado.</div>

  const { data: historial } = await supabase
    .from('detalle_compras')
    .select('cantidad, costo_unitario, compras(fecha, numero_factura_proveedor, proveedores(nombre))')
    .eq('producto_id', id)

  const historialOrdenado = (historial || []).sort((a: any, b: any) =>
    (b.compras?.fecha || '').localeCompare(a.compras?.fecha || '')
  )

  return (
    <>
      <Link href="/dashboard/productos" className="text-sm text-[#0E7C86] hover:underline">← Volver a productos</Link>

      <h1 className="my-4 text-2xl font-bold text-[#1B2430]">{producto.descripcion}</h1>

      <div className="mb-6 grid grid-cols-1 gap-4 rounded-lg bg-white p-6 shadow-sm sm:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400">Costo actual</p>
                    <p className="font-mono text-lg text-[#1B2430]">L. {formatearMoneda(producto.costo_unitario)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400">Margen actual</p>
          <p className="font-mono text-lg text-[#1B2430]">{(producto.margen_porcentaje ?? 0).toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400">Existencia</p>
          <p className="font-mono text-lg text-[#1B2430]">{producto.existencia}</p>
        </div>
      </div>

      <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
        <p className="mb-2 text-xs uppercase tracking-wide text-gray-400">Precio de venta</p>
        <EditarPrecio productoId={producto.id} precioActual={producto.precio_unitario} />
      </div>

      <h2 className="mb-2 font-semibold text-[#1B2430]">Historial de costos de compra</h2>
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
            {historialOrdenado.map((h: any, i: number) => (
              <tr key={i} className="border-t">
                <td className="p-3">{h.compras?.fecha}</td>
                <td className="p-3">{h.compras?.proveedores?.nombre || '—'}</td>
                <td className="p-3 font-mono">{h.compras?.numero_factura_proveedor || '—'}</td>
                <td className="p-3 text-right font-mono">{h.cantidad}</td>
                <td className="p-3 text-right font-mono">L. {formatearMoneda(h.costo_unitario)}</td>
              </tr>
            ))}
            {historialOrdenado.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-gray-400">Todavía no hay compras registradas para este producto.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}