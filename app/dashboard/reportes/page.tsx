import { createClient } from '@/lib/supabase/server'
import { obtenerEmpresaActiva, nombreDocumento } from '@/lib/empresa'
import { formatearFecha, formatearMoneda } from '@/lib/formato'
import BotonImprimir from '@/components/BotonImprimir'
import DescargarPdfBoton from './descargar-pdf-boton'
import { estiloBoton, estiloInput } from '@/lib/estilos'
import { etiquetaCategoria, resumirPorCategoria, sumarDocumentos, sumarTotales, type Gasto } from '@/lib/gastos'

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
    .select('id, numero_correlativo, fecha, subtotal_gravado_15, subtotal_gravado_18, subtotal_exento, subtotal_exonerado, isv_15, isv_18, total, clientes(nombre)')
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

  const { data: gastosData } = await supabase
    .from('gastos')
    .select('*')
    .eq('empresa_id', empresaActiva.id)
    .gte('fecha', fechaDesde)
    .lte('fecha', fechaHasta)
    .order('fecha')
  const gastos = (gastosData || []) as Gasto[]

  const totales = sumarDocumentos(facturas || [])
  const totalesCompras = sumarDocumentos(compras || [])
  const totalesGastos = sumarDocumentos(gastos)
  const totalesComprasYGastos = sumarTotales(totalesCompras, totalesGastos)
  const gastosPorCategoria = resumirPorCategoria(gastos)
  const gastosNoDeducibles = gastos.filter((g) => !g.deducible_isr)

  // Netos = total sin ISV (incluye gravado, exento y exonerado)
  const isvVentas = totales.isv15 + totales.isv18
  const isvCompras = totalesComprasYGastos.isv15 + totalesComprasYGastos.isv18
  const ventaNeta = totales.total - isvVentas
  const compraNeta = totalesComprasYGastos.total - isvCompras
  const isvNeto = isvVentas - isvCompras

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <h1 className="text-2xl font-bold text-marca">Reportes</h1>
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
              subtotal_exonerado: f.subtotal_exonerado,
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
            gastos={gastos}
            isvNeto={isvNeto}
          />
          <BotonImprimir />
        </div>
      </div>

      <form method="get" className="mb-6 flex flex-wrap items-end gap-3 rounded-lg bg-white p-4 shadow-sm print:hidden">
        <div>
          <label className="mb-1 block text-xs text-gray-500">Desde</label>
          <input type="date" name="desde" defaultValue={fechaDesde} className={`${estiloInput} text-sm`} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Hasta</label>
          <input type="date" name="hasta" defaultValue={fechaHasta} className={`${estiloInput} text-sm`} />
        </div>
        <button type="submit" className={estiloBoton}>
          Filtrar
        </button>
      </form>

      <p className="mb-4 text-sm text-gray-500 print:mb-6">Período: {formatearFecha(fechaDesde)} al {formatearFecha(fechaHasta)}</p>

      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Ventas</h2>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-400">Total facturado (con ISV)</p>
          <p className="font-mono text-lg font-bold text-marca">L. {formatearMoneda(totales.total)}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-400">ISV recaudado (ventas)</p>
          <p className="font-mono text-lg font-bold text-marca">L. {formatearMoneda(isvVentas)}</p>
        </div>
        <div className="rounded-lg border-2 border-acento bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-acento">Venta neta sin ISV</p>
          <p className="font-mono text-lg font-bold text-marca">L. {formatearMoneda(ventaNeta)}</p>
          <p className="mt-1 text-xs text-gray-500">Ventas a declarar al SAR (total facturado − ISV recaudado)</p>
        </div>
      </div>

      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Compras y gastos</h2>
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-400">Total compras y gastos (con ISV)</p>
          <p className="font-mono text-lg font-bold text-marca">L. {formatearMoneda(totalesComprasYGastos.total)}</p>
          <p className="mt-1 text-xs text-gray-500">
            Inventario L. {formatearMoneda(totalesCompras.total)} · Gastos L. {formatearMoneda(totalesGastos.total)}
          </p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-400">ISV pagado (crédito fiscal)</p>
          <p className="font-mono text-lg font-bold text-marca">L. {formatearMoneda(isvCompras)}</p>
        </div>
        <div className="rounded-lg border-2 border-acento bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-acento">Compra neta sin ISV</p>
          <p className="font-mono text-lg font-bold text-marca">L. {formatearMoneda(compraNeta)}</p>
          <p className="mt-1 text-xs text-gray-500">Compras a declarar al SAR (total compras y gastos − ISV pagado)</p>
        </div>
      </div>

      <div className={`mb-6 rounded-lg p-4 shadow-sm ${isvNeto >= 0 ? 'bg-red-50' : 'bg-green-50'}`}>
        <p className="text-xs uppercase tracking-wide text-gray-500">ISV neto del período (ventas − compras y gastos)</p>
        <p className={`font-mono text-2xl font-bold ${isvNeto >= 0 ? 'text-red-700' : 'text-green-700'}`}>
          L. {formatearMoneda(isvNeto)}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          {isvNeto >= 0
            ? 'Monto orientativo que tendrías que declarar/pagar por ISV en este período, considerando el ISV que pagaste en compras deducibles como crédito.'
            : 'Tuviste más ISV pagado en compras (crédito fiscal) que recaudado en ventas en este período.'}
        </p>
      </div>

      <h2 className="mb-2 font-semibold text-marca">Resumen para la declaración mensual de ISV</h2>
      <div className="mb-8 overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="p-3"></th>
              <th className="p-3 text-right">Grav. 15%</th>
              <th className="p-3 text-right">Grav. 18%</th>
              <th className="p-3 text-right">Exento</th>
              <th className="p-3 text-right">Exonerado</th>
              <th className="p-3 text-right">ISV 15%</th>
              <th className="p-3 text-right">ISV 18%</th>
              <th className="p-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
              <tr className="border-t font-semibold">
                <td className="p-3">Ventas</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totales.gravado15)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totales.gravado18)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totales.exento)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totales.exonerado)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totales.isv15)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totales.isv18)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totales.total)}</td>
              </tr>
              <tr className="border-t">
                <td className="p-3">Compras de inventario</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesCompras.gravado15)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesCompras.gravado18)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesCompras.exento)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesCompras.exonerado)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesCompras.isv15)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesCompras.isv18)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesCompras.total)}</td>
              </tr>
              <tr className="border-t">
                <td className="p-3">Gastos</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesGastos.gravado15)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesGastos.gravado18)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesGastos.exento)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesGastos.exonerado)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesGastos.isv15)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesGastos.isv18)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesGastos.total)}</td>
              </tr>
              <tr className="border-t border-marca font-semibold">
                <td className="p-3">Total compras y gastos</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesComprasYGastos.gravado15)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesComprasYGastos.gravado18)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesComprasYGastos.exento)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesComprasYGastos.exonerado)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesComprasYGastos.isv15)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesComprasYGastos.isv18)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesComprasYGastos.total)}</td>
              </tr>
          </tbody>
        </table>
      </div>

      <h2 className="mb-2 font-semibold text-marca">Libro de ventas</h2>
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
              <th className="p-3 text-right">Exonerado</th>
              <th className="p-3 text-right">ISV 15%</th>
              <th className="p-3 text-right">ISV 18%</th>
              <th className="p-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {facturas?.map((f: any) => (
              <tr key={f.id} className="border-t">
                <td className="p-3">{formatearFecha(f.fecha)}</td>
                <td className="p-3 font-mono">{f.numero_correlativo}</td>
                <td className="p-3">{f.clientes?.nombre || '—'}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(f.subtotal_gravado_15)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(f.subtotal_gravado_18)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(f.subtotal_exento)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(f.subtotal_exonerado)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(f.isv_15)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(f.isv_18)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(f.total)}</td>
              </tr>
            ))}
            {(!facturas || facturas.length === 0) && (
              <tr><td colSpan={10} className="p-6 text-center text-gray-400">Sin facturas en este período.</td></tr>
            )}
          </tbody>
          {facturas && facturas.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-marca font-semibold">
                <td className="p-3" colSpan={3}>Totales</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totales.gravado15)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totales.gravado18)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totales.exento)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totales.exonerado)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totales.isv15)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totales.isv18)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totales.total)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <h2 className="mb-2 font-semibold text-marca">Libro de compras</h2>
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
                <td className="p-3">{formatearFecha(c.fecha)}</td>
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
              <tr className="border-t-2 border-marca font-semibold">
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

      <h2 className="mb-2 mt-8 font-semibold text-marca">Libro de gastos</h2>
      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="p-3">Fecha</th>
              <th className="p-3">Documento</th>
              <th className="p-3">Proveedor</th>
              <th className="p-3">Categoría</th>
              <th className="p-3 text-right">Grav. 15%</th>
              <th className="p-3 text-right">Grav. 18%</th>
              <th className="p-3 text-right">Exento</th>
              <th className="p-3 text-right">Exonerado</th>
              <th className="p-3 text-right">ISV 15%</th>
              <th className="p-3 text-right">ISV 18%</th>
              <th className="p-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {gastos.map((g) => (
              <tr key={g.id} className="border-t">
                <td className="p-3">{formatearFecha(g.fecha)}</td>
                <td className="p-3 font-mono">{g.numero_documento || '—'}</td>
                <td className="p-3">
                  {g.nombre_proveedor}
                  {g.rtn_proveedor && <p className="font-mono text-xs text-gray-400">{g.rtn_proveedor}</p>}
                </td>
                <td className="p-3">
                  {etiquetaCategoria(g.categoria)}
                  {!g.deducible_isr && <span className="text-xs text-gray-400"> (personal)</span>}
                </td>
                <td className="p-3 text-right font-mono">{formatearMoneda(g.subtotal_gravado_15)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(g.subtotal_gravado_18)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(g.subtotal_exento)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(g.subtotal_exonerado)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(g.isv_15)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(g.isv_18)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(g.total)}</td>
              </tr>
            ))}
            {gastos.length === 0 && (
              <tr><td colSpan={11} className="p-6 text-center text-gray-400">Sin gastos en este período.</td></tr>
            )}
          </tbody>
          {gastos.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-marca font-semibold">
                <td className="p-3" colSpan={4}>Totales</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesGastos.gravado15)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesGastos.gravado18)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesGastos.exento)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesGastos.exonerado)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesGastos.isv15)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesGastos.isv18)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesGastos.total)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <h2 className="mb-2 mt-8 font-semibold text-marca">Gastos deducibles por categoría (para la declaración de renta)</h2>
      <p className="mb-2 text-xs text-gray-500">
        Montos sin ISV, porque el ISV de las facturas gravadas ya se usa como crédito fiscal. Para la renta anual, filtra
        del 1 de enero al 31 de diciembre.
      </p>
      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="p-3">Categoría</th>
              <th className="p-3 text-right">Documentos</th>
              <th className="p-3 text-right">Sin factura</th>
              <th className="p-3 text-right">Total sin ISV</th>
            </tr>
          </thead>
          <tbody>
            {gastosPorCategoria.map((c) => (
              <tr key={c.categoria} className="border-t">
                <td className="p-3">{c.etiqueta}</td>
                <td className="p-3 text-right font-mono">{c.cantidad}</td>
                <td className={`p-3 text-right font-mono ${c.sinFactura > 0 ? 'text-amber-700' : ''}`}>{c.sinFactura}</td>
                <td className="p-3 text-right font-mono">L. {formatearMoneda(c.totalSinIsv)}</td>
              </tr>
            ))}
            {gastosPorCategoria.length === 0 && (
              <tr><td colSpan={4} className="p-6 text-center text-gray-400">Sin gastos deducibles en este período.</td></tr>
            )}
          </tbody>
          {gastosPorCategoria.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-marca font-semibold">
                <td className="p-3">Total gastos deducibles</td>
                <td className="p-3 text-right font-mono">{gastosPorCategoria.reduce((s, c) => s + c.cantidad, 0)}</td>
                <td className="p-3 text-right font-mono">{gastosPorCategoria.reduce((s, c) => s + c.sinFactura, 0)}</td>
                <td className="p-3 text-right font-mono">L. {formatearMoneda(gastosPorCategoria.reduce((s, c) => s + c.totalSinIsv, 0))}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {gastosNoDeducibles.length > 0 && (
        <p className="mt-2 text-xs text-gray-500">
          {gastosNoDeducibles.length} gasto(s) marcados como personales no entran en este resumen (L. {formatearMoneda(sumarDocumentos(gastosNoDeducibles).total)}).
        </p>
      )}
      <p className="mt-2 text-xs text-gray-500">
        &quot;Sin factura&quot; = recibos, planillas u otros documentos. Revisa con tu contador si se aceptan como deducción.
      </p>

      <p className="mt-6 text-xs text-gray-400 print:mt-10">
        Nota: el desglose por tasa de ISV en compras solo está disponible para compras registradas a partir de la actualización de esta función — las compras anteriores muestran 0 en estas columnas (su monto Total general sigue siendo correcto).
      </p>
    </>
  )
}