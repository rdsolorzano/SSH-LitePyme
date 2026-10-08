import { createClient } from '@/lib/supabase/server'
import { obtenerEmpresaActiva, nombreDocumento } from '@/lib/empresa'
import { formatearMoneda } from '@/lib/formato'
import BotonImprimir from './boton-imprimir'
import DescargarPdfBoton from './descargar-pdf-boton'

function primerDiaMes() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
}
function hoy() {
  return new Date().toISOString().split('T')[0]
}

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string }>
}) {
  const { desde, hasta } = await searchParams
  const fechaDesde = desde || primerDiaMes()
  const fechaHasta = hasta || hoy()

  const { empresaActiva } = await obtenerEmpresaActiva()
  if (!empresaActiva) return <div>Primero selecciona una empresa.</div>

  const supabase = await createClient()

  const { data: empresaCompleta } = await supabase
    .from('empresas')
    .select('razon_social, nombre_comercial, nombre_impresion, nombre_documento_origen')
    .eq('id', empresaActiva.id)
    .single()

  const nombreEmpresa = empresaCompleta ? nombreDocumento(empresaCompleta) : ''

  const { data: facturas } = await supabase
    .from('facturas')
    .select('id, numero_correlativo, fecha, subtotal_gravado_15, subtotal_gravado_18, subtotal_exento, isv_15, isv_18, total, clientes(nombre)')
    .eq('empresa_id', empresaActiva.id)
    .gte('fecha', fechaDesde)
    .lte('fecha', fechaHasta)
    .order('fecha')

  const { data: compras } = await supabase
    .from('compras')
    .select('id, fecha, numero_factura_proveedor, subtotal_gravado_15, subtotal_gravado_18, subtotal_exento, isv_15, isv_18, total, proveedores(nombre)')
    .eq('empresa_id', empresaActiva.id)
    .gte('fecha', fechaDesde)
    .lte('fecha', fechaHasta)
    .order('fecha')

  const totales = (facturas || []).reduce(
    (acc, f: any) => ({
      gravado15: acc.gravado15 + (f.subtotal_gravado_15 || 0),
      gravado18: acc.gravado18 + (f.subtotal_gravado_18 || 0),
      exento: acc.exento + (f.subtotal_exento || 0),
      isv15: acc.isv15 + (f.isv_15 || 0),
      isv18: acc.isv18 + (f.isv_18 || 0),
      total: acc.total + (f.total || 0),
    }),
    { gravado15: 0, gravado18: 0, exento: 0, isv15: 0, isv18: 0, total: 0 }
  )

  const totalesCompras = (compras || []).reduce(
    (acc, c: any) => ({
      gravado15: acc.gravado15 + (c.subtotal_gravado_15 || 0),
      gravado18: acc.gravado18 + (c.subtotal_gravado_18 || 0),
      exento: acc.exento + (c.subtotal_exento || 0),
      isv15: acc.isv15 + (c.isv_15 || 0),
      isv18: acc.isv18 + (c.isv_18 || 0),
      total: acc.total + (c.total || 0),
    }),
    { gravado15: 0, gravado18: 0, exento: 0, isv15: 0, isv18: 0, total: 0 }
  )

  const isvNeto = (totales.isv15 + totales.isv18) - (totalesCompras.isv15 + totalesCompras.isv18)

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <h1 className="text-2xl font-bold text-[#1B2430]">Reportes</h1>
        <div className="flex gap-2">
          <DescargarPdfBoton
            empresaNombre={nombreEmpresa}
            desde={fechaDesde}
            hasta={fechaHasta}
            ventas={(facturas || []).map((f: any) => ({
              numero_correlativo: f.numero_correlativo,
              fecha: f.fecha,
              cliente: f.clientes?.nombre || '—',
              subtotal_gravado_15: f.subtotal_gravado_15,
              subtotal_gravado_18: f.subtotal_gravado_18,
              subtotal_exento: f.subtotal_exento,
              isv_15: f.isv_15,
              isv_18: f.isv_18,
              total: f.total,
            }))}
            totalesVentas={totales}
            compras={(compras || []).map((c: any) => ({
              numero_factura_proveedor: c.numero_factura_proveedor,
              fecha: c.fecha,
              proveedor: c.proveedores?.nombre || '—',
              subtotal_gravado_15: c.subtotal_gravado_15,
              subtotal_gravado_18: c.subtotal_gravado_18,
              subtotal_exento: c.subtotal_exento,
              isv_15: c.isv_15,
              isv_18: c.isv_18,
              total: c.total,
            }))}
            totalesCompras={totalesCompras}
            isvNeto={isvNeto}
          />
          <BotonImprimir />
        </div>
      </div>

      <form method="get" className="mb-6 flex flex-wrap items-end gap-3 rounded-lg bg-white p-4 shadow-sm print:hidden">
        <div>
          <label className="mb-1 block text-xs text-gray-500">Desde</label>
          <input type="date" name="desde" defaultValue={fechaDesde} className="rounded border px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Hasta</label>
          <input type="date" name="hasta" defaultValue={fechaHasta} className="rounded border px-3 py-2 text-sm" />
        </div>
        <button type="submit" className="rounded bg-[#0E7C86] px-4 py-2 text-sm text-white hover:bg-[#0c6971]">
          Filtrar
        </button>
      </form>

      <p className="mb-4 text-sm text-gray-500 print:mb-6">Período: {fechaDesde} al {fechaHasta}</p>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-400">Total facturado</p>
          <p className="font-mono text-lg font-bold text-[#1B2430]">L. {formatearMoneda(totales.total)}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-400">ISV recaudado (ventas)</p>
          <p className="font-mono text-lg font-bold text-[#1B2430]">L. {formatearMoneda(totales.isv15 + totales.isv18)}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-400">Total comprado</p>
          <p className="font-mono text-lg font-bold text-[#1B2430]">L. {formatearMoneda(totalesCompras.total)}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-400">ISV pagado (compras)</p>
          <p className="font-mono text-lg font-bold text-[#1B2430]">L. {formatearMoneda(totalesCompras.isv15 + totalesCompras.isv18)}</p>
        </div>
      </div>

      <div className={`mb-6 rounded-lg p-4 shadow-sm ${isvNeto >= 0 ? 'bg-red-50' : 'bg-green-50'}`}>
        <p className="text-xs uppercase tracking-wide text-gray-500">ISV neto del período (ventas − compras)</p>
        <p className={`font-mono text-2xl font-bold ${isvNeto >= 0 ? 'text-red-700' : 'text-green-700'}`}>
          L. {formatearMoneda(isvNeto)}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          {isvNeto >= 0
            ? 'Monto orientativo que tendrías que declarar/pagar por ISV en este período, considerando el ISV que pagaste en compras deducibles como crédito.'
            : 'Tuviste más ISV pagado en compras (crédito fiscal) que recaudado en ventas en este período.'}
        </p>
      </div>

      <h2 className="mb-2 font-semibold text-[#1B2430]">Libro de ventas</h2>
      <div className="mb-8 overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="p-3">Fecha</th>
              <th className="p-3">Factura</th>
              <th className="p-3">Cliente</th>
              <th className="p-3 text-right">Grav. 15%</th>
              <th className="p-3 text-right">Grav. 18%</th>
              <th className="p-3 text-right">Exento</th>
              <th className="p-3 text-right">ISV 15%</th>
              <th className="p-3 text-right">ISV 18%</th>
              <th className="p-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {facturas?.map((f: any) => (
              <tr key={f.id} className="border-t">
                <td className="p-3">{f.fecha}</td>
                <td className="p-3 font-mono">{f.numero_correlativo}</td>
                <td className="p-3">{f.clientes?.nombre || '—'}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(f.subtotal_gravado_15)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(f.subtotal_gravado_18)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(f.subtotal_exento)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(f.isv_15)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(f.isv_18)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(f.total)}</td>
              </tr>
            ))}
            {(!facturas || facturas.length === 0) && (
              <tr><td colSpan={9} className="p-6 text-center text-gray-400">Sin facturas en este período.</td></tr>
            )}
          </tbody>
          {facturas && facturas.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-[#1B2430] font-semibold">
                <td className="p-3" colSpan={3}>Totales</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totales.gravado15)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totales.gravado18)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totales.exento)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totales.isv15)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totales.isv18)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totales.total)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <h2 className="mb-2 font-semibold text-[#1B2430]">Libro de compras</h2>
      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="p-3">Fecha</th>
              <th className="p-3">No. Factura Prov.</th>
              <th className="p-3">Proveedor</th>
              <th className="p-3 text-right">Grav. 15%</th>
              <th className="p-3 text-right">Grav. 18%</th>
              <th className="p-3 text-right">Exento</th>
              <th className="p-3 text-right">ISV 15%</th>
              <th className="p-3 text-right">ISV 18%</th>
              <th className="p-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {compras?.map((c: any) => (
              <tr key={c.id} className="border-t">
                <td className="p-3">{c.fecha}</td>
                <td className="p-3 font-mono">{c.numero_factura_proveedor || '—'}</td>
                <td className="p-3">{c.proveedores?.nombre || '—'}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(c.subtotal_gravado_15)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(c.subtotal_gravado_18)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(c.subtotal_exento)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(c.isv_15)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(c.isv_18)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(c.total)}</td>
              </tr>
            ))}
            {(!compras || compras.length === 0) && (
              <tr><td colSpan={9} className="p-6 text-center text-gray-400">Sin compras en este período.</td></tr>
            )}
          </tbody>
          {compras && compras.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-[#1B2430] font-semibold">
                <td className="p-3" colSpan={3}>Totales</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesCompras.gravado15)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesCompras.gravado18)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesCompras.exento)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesCompras.isv15)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesCompras.isv18)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesCompras.total)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <p className="mt-6 text-xs text-gray-400 print:mt-10">
        Nota: el desglose por tasa de ISV en compras solo está disponible para compras registradas a partir de la actualización de esta función — las compras anteriores muestran 0 en estas columnas (su monto Total general sigue siendo correcto).
      </p>
    </>
  )
}