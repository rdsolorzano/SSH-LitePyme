import { createClient } from '@/lib/supabase/server'
import { obtenerEmpresaActiva } from '@/lib/empresa'
import Link from 'next/link'
import BotonImprimir from './boton-imprimir'
import SelectorEstado from './selector-estado'
import ConvertirAFactura from './convertir-a-factura'

export default async function DetalleCotizacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { empresaActiva } = await obtenerEmpresaActiva()

  const { data: cotizacion } = await supabase
    .from('cotizaciones')
    .select('*, clientes(nombre, rtn, direccion), empresas(razon_social, rtn, direccion)')
    .eq('id', id)
    .single()

  const { data: detalle } = await supabase
    .from('detalle_cotizaciones')
    .select('*, productos_servicios(descripcion)')
    .eq('cotizacion_id', id)

  const { data: caiRangos } = await supabase
    .from('cai_rangos')
    .select('id, cai')
    .eq('empresa_id', empresaActiva?.id)
    .eq('activo', true)

  if (!cotizacion) {
    return <div className="p-8">Cotización no encontrada.</div>
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <div className="mb-4 flex justify-between print:hidden">
        <Link href="/dashboard/cotizaciones" className="text-sm text-blue-600 hover:underline">← Volver</Link>
        <div className="flex gap-2">
          <SelectorEstado cotizacionId={cotizacion.id} estadoActual={cotizacion.estado} />
          <BotonImprimir />
        </div>
      </div>

      {cotizacion.estado === 'aprobada' && (
        <div className="mb-4 print:hidden">
          <ConvertirAFactura cotizacionId={cotizacion.id} caiRangos={caiRangos || []} />
        </div>
      )}

      <div className="rounded-lg border bg-white p-8">
        <div className="mb-6 border-b pb-4">
          <h1 className="text-xl font-bold">{cotizacion.empresas?.razon_social}</h1>
          <p className="text-sm text-gray-600">RTN: {cotizacion.empresas?.rtn}</p>
          <p className="text-sm text-gray-600">{cotizacion.empresas?.direccion}</p>
        </div>

        <div className="mb-2 text-lg font-semibold text-gray-700">COTIZACIÓN {cotizacion.numero}</div>

        <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p><span className="text-gray-500">Fecha:</span> {cotizacion.fecha}</p>
            <p><span className="text-gray-500">Cliente:</span> {cotizacion.clientes?.nombre}</p>
          </div>
          <div>
            <p><span className="text-gray-500">Válida por:</span> {cotizacion.validez_dias} días</p>
            {cotizacion.notas && <p><span className="text-gray-500">Notas:</span> {cotizacion.notas}</p>}
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
          <div className="flex justify-between"><span>Gravado 15%</span><span>L. {cotizacion.subtotal_gravado_15}</span></div>
          <div className="flex justify-between"><span>Gravado 18%</span><span>L. {cotizacion.subtotal_gravado_18}</span></div>
          <div className="flex justify-between"><span>Exento</span><span>L. {cotizacion.subtotal_exento}</span></div>
          <div className="flex justify-between"><span>ISV 15%</span><span>L. {cotizacion.isv_15}</span></div>
          <div className="flex justify-between"><span>ISV 18%</span><span>L. {cotizacion.isv_18}</span></div>
          <div className="flex justify-between border-t pt-1 font-bold"><span>Total</span><span>L. {cotizacion.total}</span></div>
        </div>
      </div>
    </div>
  )
}