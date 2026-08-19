import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import BotonImprimir from './boton-imprimir'

export default async function DetalleFacturaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: factura } = await supabase
    .from('facturas')
    .select('*, clientes(nombre, rtn, direccion), empresas(razon_social, rtn, direccion), cai_rangos(cai, rango_inicial, rango_final, fecha_limite_emision)')
    .eq('id', id)
    .single()

  const { data: detalle } = await supabase
    .from('detalle_facturas')
    .select('*, productos_servicios(descripcion)')
    .eq('factura_id', id)

  if (!factura) {
    return <div className="p-8">Factura no encontrada.</div>
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <div className="mb-4 flex justify-between print:hidden">
        <Link href="/dashboard/facturas" className="text-sm text-blue-600 hover:underline">← Volver</Link>
        <BotonImprimir />
      </div>

      <div className="rounded-lg border bg-white p-8">
        <div className="mb-6 border-b pb-4">
          <h1 className="text-xl font-bold">{factura.empresas?.razon_social}</h1>
          <p className="text-sm text-gray-600">RTN: {factura.empresas?.rtn}</p>
          <p className="text-sm text-gray-600">{factura.empresas?.direccion}</p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p><span className="text-gray-500">Factura No.:</span> {factura.numero_correlativo}</p>
            <p><span className="text-gray-500">Fecha:</span> {factura.fecha}</p>
            <p><span className="text-gray-500">Cliente:</span> {factura.clientes?.nombre}</p>
            {factura.clientes?.rtn && <p><span className="text-gray-500">RTN Cliente:</span> {factura.clientes.rtn}</p>}
          </div>
          <div>
            <p><span className="text-gray-500">CAI:</span> {factura.cai_rangos?.cai}</p>
            <p><span className="text-gray-500">Rango autorizado:</span> {factura.cai_rangos?.rango_inicial} - {factura.cai_rangos?.rango_final}</p>
            <p><span className="text-gray-500">Fecha límite emisión:</span> {factura.cai_rangos?.fecha_limite_emision}</p>
          </div>
        </div>

        <table className="mb-6 w-full text-left text-sm">
          <thead className="border-b">
            <tr>
              <th className="py-2">Descripción</th>
              <th className="py-2">Cant.</th>
              <th className="py-2">P. Unit.</th>
              <th className="py-2">ISV</th>
              <th className="py-2">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {detalle?.map((d: any) => (
              <tr key={d.id} className="border-b">
                <td className="py-2">{d.productos_servicios?.descripcion}</td>
                <td className="py-2">{d.cantidad}</td>
                <td className="py-2">L. {d.precio_unitario}</td>
                <td className="py-2">{d.tasa_isv}%</td>
                <td className="py-2">L. {d.subtotal}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto max-w-xs space-y-1 text-sm">
          <div className="flex justify-between"><span>Gravado 15%</span><span>L. {factura.subtotal_gravado_15}</span></div>
          <div className="flex justify-between"><span>Gravado 18%</span><span>L. {factura.subtotal_gravado_18}</span></div>
          <div className="flex justify-between"><span>Exento</span><span>L. {factura.subtotal_exento}</span></div>
          <div className="flex justify-between"><span>ISV 15%</span><span>L. {factura.isv_15}</span></div>
          <div className="flex justify-between"><span>ISV 18%</span><span>L. {factura.isv_18}</span></div>
          <div className="flex justify-between border-t pt-1 font-bold"><span>Total</span><span>L. {factura.total}</span></div>
        </div>
      </div>
    </div>
  )
}