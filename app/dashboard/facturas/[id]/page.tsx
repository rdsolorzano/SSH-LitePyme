import { createClient } from '@/lib/supabase/server'
import { nombreDocumento } from '@/lib/empresa'
import Link from 'next/link'
import BotonImprimir from './boton-imprimir'
import { formatearMoneda } from '@/lib/formato'
import DescargarPdfBoton from './descargar-pdf-boton'
import BotonVolver from './boton-volver'
import { formatearNumeroDocumento } from '@/lib/formato'
import { numeroALetras } from '@/lib/numero-a-letras'

export default async function DetalleFacturaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: factura } = await supabase
    .from('facturas')
    .select(`
      *,
      clientes(nombre, rtn, direccion, telefono, email),
      empresas(razon_social, nombre_comercial, nombre_impresion, nombre_documento_origen, rtn, direccion, telefono, correo_electronico, sitio_web, logo_url),
      cai_rangos(cai, punto_emision, rango_inicial, rango_final, fecha_limite_emision)
    `)
    .eq('id', id)
    .single()

  const { data: detalle } = await supabase
    .from('detalle_facturas')
    .select('*, productos_servicios(descripcion)')
    .eq('factura_id', id)

  if (!factura) {
    return <div className="p-8">Factura no encontrada.</div>
  }

  const empresa = factura.empresas
  const nombreEmpresa = empresa ? nombreDocumento(empresa) : ''

  return (
    <div className="mx-auto max-w-3xl p-4 print:max-w-none print:p-0">
      <div className="mb-4 flex justify-between print:hidden">
        <BotonVolver fallbackHref="/dashboard/facturas" />
        <div className="flex gap-2">
          <DescargarPdfBoton
            empresa={{
              nombre: nombreEmpresa,
              razonSocial: factura.empresas?.razon_social,
              rtn: factura.empresas?.rtn,
              direccion: factura.empresas?.direccion,
              telefono: factura.empresas?.telefono,
              correo_electronico: factura.empresas?.correo_electronico,
              sitio_web: factura.empresas?.sitio_web,
              logo_url: factura.empresas?.logo_url,
            }}
            cliente={{
              nombre: factura.clientes?.nombre,
              rtn: factura.clientes?.rtn,
              direccion: factura.clientes?.direccion,
              telefono: factura.clientes?.telefono,
              email: factura.clientes?.email,
            }}
            factura={factura}
            cai={factura.cai_rangos}
            items={(detalle || []).map((d: any) => ({
              descripcion: d.descripcion || d.productos_servicios?.descripcion,
              cantidad: d.cantidad,
              precio_unitario: d.precio_unitario,
              tasa_isv: d.tasa_isv,
              subtotal: d.subtotal,
            }))}
          />
          <BotonImprimir />
        </div>
      </div>

      <div className="rounded-lg border bg-white p-10 print:rounded-none print:border-0 print:p-0">
        {/* Encabezado */}
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
            <p className="text-xs uppercase tracking-wide text-[#0E7C86]">Factura · Original</p>
            <p className="font-mono text-lg font-bold text-red-600">{factura.numero_correlativo}</p>
            <p className="mt-1 text-sm text-gray-500">{factura.fecha}</p>
          </div>
        </div>

        {/* Cliente + CAI */}
        <div className="mb-6 grid grid-cols-2 gap-6 text-sm">
          <div>
            <p className="mb-1 text-xs uppercase tracking-wide text-gray-400">Cliente</p>
            <p className="font-medium text-[#1B2430]">{factura.clientes?.nombre}</p>
            {factura.clientes?.rtn && <p className="text-gray-600">RTN: {factura.clientes.rtn}</p>}
            {factura.clientes?.direccion && <p className="text-gray-600">{factura.clientes.direccion}</p>}
            {factura.clientes?.telefono && <p className="text-gray-600">Tel: {factura.clientes.telefono}</p>}
            {factura.clientes?.email && <p className="text-gray-600">{factura.clientes.email}</p>}
          </div>
          <div>
            <p className="mb-1 text-xs uppercase tracking-wide text-gray-400">Datos de facturación</p>
            <p className="text-xs text-gray-600">{factura.empresas?.razon_social}</p>
            <p className="font-mono text-xs text-gray-600">CAI: {factura.cai_rangos?.cai}</p>
            <p className="text-xs text-gray-600">
              Rango autorizado: {formatearNumeroDocumento(factura.cai_rangos?.punto_emision, factura.cai_rangos?.rango_inicial)} | {formatearNumeroDocumento(factura.cai_rangos?.punto_emision, factura.cai_rangos?.rango_final)}
            </p>
            <p className="text-xs text-gray-600">Fecha límite de emisión: {factura.cai_rangos?.fecha_limite_emision}</p>
          </div>
        </div>

        {/* Tabla de artículos */}
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
                <td className="py-2">{d.descripcion || d.productos_servicios?.descripcion}</td>
                <td className="py-2 text-center font-mono">{d.cantidad}</td>
                <td className="py-2 text-right font-mono">&nbsp;&nbsp;L.{formatearMoneda(d.precio_unitario)}</td>
                <td className="py-2 text-right font-mono"></td>
                <td className="py-2 text-right font-mono">&nbsp;&nbsp;L.{formatearMoneda(d.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totales */}
        <div className="ml-auto max-w-xs space-y-1 border-t border-gray-200 pt-3 text-sm">
          <div className="flex justify-between text-gray-600"><span>Gravado 15%</span><span className="font-mono">L. {formatearMoneda(factura.subtotal_gravado_15)}</span></div>
          <div className="flex justify-between text-gray-600"><span>Gravado 18%</span><span className="font-mono">L. {formatearMoneda(factura.subtotal_gravado_18)}</span></div>
          <div className="flex justify-between text-gray-600"><span>Exento</span><span className="font-mono">L. {formatearMoneda(factura.subtotal_exento)}</span></div>
          <div className="flex justify-between text-gray-600"><span>ISV 15%</span><span className="font-mono">L. {formatearMoneda(factura.isv_15)}</span></div>
          <div className="flex justify-between text-gray-600"><span>ISV 18%</span><span className="font-mono">L. {formatearMoneda(factura.isv_18)}</span></div>
          <div className="flex justify-between border-t-2 border-[#1B2430] pt-2 text-base font-bold text-[#1B2430]">
            <span>Total</span><span className="font-mono">L. {formatearMoneda(factura.total)}</span>
          </div>
          <p className="pt-1 text-right text-[10px] italic text-gray-500">{numeroALetras(factura.total)}</p>
        </div>
        {/*<p className="mt-10 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">ORIGINAL: CLIENTE &nbsp;·&nbsp; COPIA: EMISOR</p>*/}
        <p className="mt-2 text-center text-xs text-gray-400">Gracias por su preferencia.</p>
      </div>
    </div>
  )
}