import { createClient } from '@/lib/supabase/server'
import { formatearFecha, formatearMoneda } from '@/lib/formato'
import Link from 'next/link'

export default async function DetalleCotizacionProveedorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: cotizacion } = await supabase
    .from('cotizaciones_proveedor')
    .select('*, proveedores(nombre, rtn, telefono)')
    .eq('id', id)
    .single()

  if (!cotizacion) return <div>Cotización no encontrada.</div>

  const { data: detalle } = await supabase
    .from('detalle_cotizaciones_proveedor')
    .select('*, productos_servicios(id, descripcion, serie)')
    .eq('cotizacion_id', id)

  return (
    <>
      <Link href="/dashboard/compras" className="text-sm text-acento hover:underline">← Volver a compras</Link>

      <h1 className="my-4 text-2xl font-bold text-marca">Cotización de proveedor</h1>

      <div className="mb-6 grid grid-cols-1 gap-4 rounded-lg bg-white p-6 shadow-sm sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400">Proveedor</p>
          <p className="font-medium text-marca">{cotizacion.proveedores?.nombre || '—'}</p>
          {cotizacion.proveedores?.rtn && <p className="text-sm text-gray-500">RTN: {cotizacion.proveedores.rtn}</p>}
          {cotizacion.proveedores?.telefono && <p className="text-sm text-gray-500">Tel: {cotizacion.proveedores.telefono}</p>}
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400">No. Cotización del proveedor</p>
          <p className="font-mono text-marca">{cotizacion.numero_cotizacion}</p>
          <p className="mt-2 text-xs uppercase tracking-wide text-gray-400">Fecha de la cotización</p>
          <p className="text-marca">{formatearFecha(cotizacion.fecha)}</p>
          <p className="mt-2 text-xs uppercase tracking-wide text-gray-400">Precios</p>
          <p className="text-marca">
            {cotizacion.actualizo_precios ? 'Se actualizaron costo y precio de venta' : 'Solo registro, no cambió precios'}
          </p>
        </div>
      </div>

      <h2 className="mb-2 font-semibold text-marca">Productos cotizados</h2>
      <div className="mb-6 overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="p-3">Producto</th>
              <th className="p-3 text-right">ISV</th>
              <th className="p-3 text-right">Costo anterior</th>
              <th className="p-3 text-right">Costo cotizado (c/ISV)</th>
              <th className="p-3 text-right">Precio anterior</th>
              <th className="p-3 text-right">Precio venta</th>
            </tr>
          </thead>
          <tbody>
            {detalle?.map((d: any) => (
              <tr key={d.id} className="border-t">
                <td className="p-3">
                  <Link href={`/dashboard/productos/${d.productos_servicios?.id}`} className="text-acento hover:underline">
                    {d.productos_servicios?.descripcion || '—'}
                  </Link>
                  {d.productos_servicios?.serie && <p className="font-mono text-xs text-gray-400">Serie: {d.productos_servicios.serie}</p>}
                </td>
                <td className="p-3 text-right font-mono">{d.tasa_isv}%</td>
                <td className="p-3 text-right font-mono text-gray-500">L. {formatearMoneda(d.costo_anterior)}</td>
                <td className="p-3 text-right font-mono">L. {formatearMoneda(d.costo_unitario)}</td>
                <td className="p-3 text-right font-mono text-gray-500">L. {formatearMoneda(d.precio_anterior)}</td>
                <td className="p-3 text-right font-mono">L. {formatearMoneda(d.precio_venta)}</td>
              </tr>
            ))}
            {(!detalle || detalle.length === 0) && (
              <tr><td colSpan={6} className="p-6 text-center text-gray-400">Sin productos en esta cotización.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
