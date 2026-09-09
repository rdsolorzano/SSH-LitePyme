import { createClient } from '@/lib/supabase/server'
import { obtenerEmpresaActiva, nombreDocumento } from '@/lib/empresa'
import Link from 'next/link'
import BotonImprimir from './boton-imprimir'
import SelectorEstado from './selector-estado'
import ConvertirAFactura from './convertir-a-factura'
import { formatearMoneda } from '@/lib/formato'
import DescargarPdfBoton from './descargar-pdf-boton'
import GenerarReciboBoton from './generar-recibo-boton'

export default async function DetalleCotizacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { empresaActiva } = await obtenerEmpresaActiva()

  const { data: cotizacion } = await supabase
    .from('cotizaciones')
    .select(`
      *,
      clientes(nombre, rtn, direccion, telefono, email),
      empresas(razon_social, nombre_comercial, nombre_impresion, nombre_documento_origen, rtn, direccion, telefono, correo_electronico, sitio_web, logo_url)
    `)
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

  const empresa = cotizacion.empresas
  const nombreEmpresa = empresa ? nombreDocumento(empresa) : ''

  return (
    <div className="mx-auto max-w-3xl p-4 print:max-w-none print:p-0">
      <div className="mb-4 flex justify-between print:hidden">
        <Link href="/dashboard/cotizaciones" className="text-sm text-[#0E7C86] hover:underline">← Volver</Link>
        <div className="flex gap-2"><GenerarReciboBoton cotizacionId={cotizacion.id} />
          {cotizacion.estado !== 'convertida' && (
            <Link href={`/dashboard/cotizaciones/${cotizacion.id}/editar`} className="rounded border px-3 py-2 text-sm hover:bg-gray-50">
              Editar
            </Link>
          )}
          <SelectorEstado cotizacionId={cotizacion.id} estadoActual={cotizacion.estado} />
          <GenerarReciboBoton cotizacionId={cotizacion.id} />
          <DescargarPdfBoton
            empresa={{
              nombre: nombreEmpresa,
              rtn: cotizacion.empresas?.rtn,
              direccion: cotizacion.empresas?.direccion,
              telefono: cotizacion.empresas?.telefono,
              correo_electronico: cotizacion.empresas?.correo_electronico,
              sitio_web: cotizacion.empresas?.sitio_web,
              logo_url: cotizacion.empresas?.logo_url,
            }}
            cliente={{
              nombre: cotizacion.clientes?.nombre,
              rtn: cotizacion.clientes?.rtn,
              direccion: cotizacion.clientes?.direccion,
            }}
            cotizacion={cotizacion}
            items={(detalle || []).map((d: any) => ({
              descripcion: d.productos_servicios?.descripcion,
              cantidad: d.cantidad,
              precio_unitario: d.precio_unitario,
              tasa_isv: d.tasa_isv,
              subtotal: d.subtotal,
            }))}
          />
          <BotonImprimir />
        </div>
      </div>

      {cotizacion.estado === 'aprobada' && (
        <div className="mb-4 print:hidden">
          <ConvertirAFactura cotizacionId={cotizacion.id} caiRangos={caiRangos || []} />
        </div>
      )}

      <div className="rounded-lg border bg-white p-10 print:rounded-none print:border-0 print:p-0">
        <div className="mb-8 flex items-start justify-between border-b-2 border-[#1B2430] pb-6">
          <div className="flex items-start gap-4">
            {empresa?.logo_url && (
              <img src={empresa.logo_url} alt="" className="h-26 w-26 object-contain" />
            )}
            <div>
              <h1 className="text-lg font-bold text-[#1B2430]">{nombreEmpresa}</h1>
              <p className="text-sm text-gray-600">RTN: {empresa?.rtn}</p>
              {empresa?.direccion && <p className="text-sm text-gray-600">{empresa.direccion}</p>}
              <p className="text-sm text-gray-600">
                {[empresa?.telefono, empresa?.correo_electronico, empresa?.sitio_web].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-[#0E7C86]">Cotización</p>
            <p className="font-mono text-lg font-bold text-[#1B2430]">{cotizacion.numero}</p>
            <p className="mt-1 text-sm text-gray-500">{cotizacion.fecha}</p>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-6 text-sm">
          <div>
            <p className="mb-1 text-xs uppercase tracking-wide text-gray-400">Cliente</p>
            <p className="font-medium text-[#1B2430]">{cotizacion.clientes?.nombre}</p>
            {cotizacion.clientes?.rtn && <p className="text-gray-600">RTN: {cotizacion.clientes.rtn}</p>}
            {cotizacion.clientes?.direccion && <p className="text-gray-600">{cotizacion.clientes.direccion}</p>}
            {cotizacion.clientes?.telefono && <p className="text-gray-600">Tel: {cotizacion.clientes.telefono}</p>}
            {cotizacion.clientes?.email && <p className="text-gray-600">{cotizacion.clientes.email}</p>}
          </div>
          <div>
            <p className="mb-1 text-xs uppercase tracking-wide text-gray-400">Validez</p>
            <p className="text-gray-600">{cotizacion.validez_dias} días a partir de la fecha</p>
            {cotizacion.notas && <p className="mt-1 text-gray-600">{cotizacion.notas}</p>}
          </div>
        </div>

        <table className="mb-6 w-full text-left text-sm">
          <thead>
            <tr className="border-b-2 border-[#1B2430] text-xs uppercase tracking-wide text-gray-500">
              <th className="py-2">Descripción</th>
              <th className="py-2 text-right">Cant.</th>
              <th className="py-2 text-right">P. Unit.</th>
              <th className="py-2 text-right"></th>
              <th className="py-2 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {detalle?.map((d: any) => (
              <tr key={d.id} className="border-b border-gray-100">
                <td className="py-2">{d.productos_servicios?.descripcion}</td>
                <td className="py-2 text-center font-mono">{d.cantidad}</td>
                <td className="py-2 text-right font-mono">&nbsp;&nbsp;L.{formatearMoneda(d.precio_unitario)}</td>
                <td className="py-2 text-right font-mono"></td>
                <td className="py-2 text-right font-mono">&nbsp;&nbsp;L.{formatearMoneda(d.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto max-w-xs space-y-1 border-t border-gray-200 pt-3 text-sm">
          <div className="flex justify-between text-gray-600"><span>Gravado 15%</span><span className="font-mono">L. {formatearMoneda(cotizacion.subtotal_gravado_15)}</span></div>
          <div className="flex justify-between text-gray-600"><span>Gravado 18%</span><span className="font-mono">L. {formatearMoneda(cotizacion.subtotal_gravado_18)}</span></div>
          <div className="flex justify-between text-gray-600"><span>Exento</span><span className="font-mono">L. {formatearMoneda(cotizacion.subtotal_exento)}</span></div>
          <div className="flex justify-between text-gray-600"><span>ISV 15%</span><span className="font-mono">L. {formatearMoneda(cotizacion.isv_15)}</span></div>
          <div className="flex justify-between text-gray-600"><span>ISV 18%</span><span className="font-mono">L. {formatearMoneda(cotizacion.isv_18)}</span></div>
          <div className="flex justify-between border-t-2 border-[#1B2430] pt-2 text-base font-bold text-[#1B2430]">
            <span>Total</span><span className="font-mono">L. {formatearMoneda(cotizacion.total)}</span>
          </div>
        </div>

        <p className="mt-10 text-center text-xs text-gray-400">Cotización sujeta a cambios sin previo aviso.</p>
      </div>
    </div>
  )
}