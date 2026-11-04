import { createClient } from '@/lib/supabase/server'
import { obtenerEmpresaActiva } from '@/lib/empresa'
import { formatearFecha, formatearMoneda } from '@/lib/formato'
import { limpiarBusqueda } from '@/lib/busqueda'
import { etiquetaCategoria, sumarDocumentos, TIPOS_DOCUMENTO_GASTO } from '@/lib/gastos'
import BuscadorLista from '@/app/dashboard/buscador-lista'
import Link from 'next/link'
import NuevoGastoForm from './nuevo-gasto-form'
import EliminarGastoBoton from './eliminar-gasto-boton'

export default async function GastosPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { empresaActiva } = await obtenerEmpresaActiva()
  if (!empresaActiva) return <div className="p-8">Primero selecciona una empresa desde el dashboard.</div>

  const supabase = await createClient()

  const { data: proveedores } = await supabase
    .from('proveedores')
    .select('nombre, rtn')
    .eq('empresa_id', empresaActiva.id)
    .eq('activo', true)
    .order('nombre')

  const q = limpiarBusqueda((await searchParams).q)

  let consulta = supabase.from('gastos').select('*').eq('empresa_id', empresaActiva.id)
  if (q) {
    consulta = consulta.or(
      [`nombre_proveedor.ilike.%${q}%`, `numero_documento.ilike.%${q}%`, `descripcion.ilike.%${q}%`, `rtn_proveedor.ilike.%${q}%`].join(',')
    )
  }
  const { data: gastos } = await consulta.order('fecha', { ascending: false }).limit(q ? 200 : 50)

  const totales = sumarDocumentos(gastos || [])
  const etiquetaTipo = (v: string) => TIPOS_DOCUMENTO_GASTO.find((t) => t.valor === v)?.etiqueta ?? v

  return (
    <>
      <div className="my-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-marca">Gastos</h1>
        <Link href="/dashboard/reportes" className="text-sm text-acento hover:underline">
          Ver en reportes (ISV mensual y resumen para renta) →
        </Link>
      </div>
      <p className="mb-4 max-w-3xl text-sm text-gray-500">
        Registra aquí lo que no es inventario: combustible, alquiler, energía, internet, honorarios, reparaciones, etc.
        No suma existencias. El ISV de las facturas gravadas cuenta como crédito fiscal en el reporte, y los montos sin
        ISV se resumen por categoría para la declaración de renta.
      </p>

      <NuevoGastoForm proveedores={(proveedores || []).map((p) => ({ nombre: p.nombre, rtn: p.rtn ?? null }))} />

      <h2 className="mb-2 text-lg font-semibold">Gastos {q ? 'de la búsqueda' : 'recientes'}</h2>
      <BuscadorLista placeholder="Buscar por proveedor, RTN, No. de documento o descripción..." />
      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="p-3">Fecha</th>
              <th className="p-3">Proveedor</th>
              <th className="p-3">Documento</th>
              <th className="p-3">Categoría</th>
              <th className="p-3 text-right">ISV</th>
              <th className="p-3 text-right">Total</th>
              <th className="p-3">Renta</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {gastos?.map((g: any) => (
              <tr key={g.id} className="border-t align-top">
                <td className="p-3">{formatearFecha(g.fecha)}</td>
                <td className="p-3">
                  {g.nombre_proveedor}
                  {g.rtn_proveedor && <p className="font-mono text-xs text-gray-400">RTN: {g.rtn_proveedor}</p>}
                </td>
                <td className="p-3">
                  <span className="text-xs text-gray-500">{etiquetaTipo(g.tipo_documento)}</span>
                  {g.numero_documento && <p className="font-mono text-xs">{g.numero_documento}</p>}
                </td>
                <td className="p-3">
                  {etiquetaCategoria(g.categoria)}
                  {g.descripcion && <p className="text-xs text-gray-400">{g.descripcion}</p>}
                </td>
                <td className="p-3 text-right font-mono">{formatearMoneda(Number(g.isv_15) + Number(g.isv_18))}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(g.total)}</td>
                <td className="p-3 text-xs">{g.deducible_isr ? 'Deducible' : <span className="text-gray-400">Personal</span>}</td>
                <td className="p-3"><EliminarGastoBoton id={g.id} /></td>
              </tr>
            ))}
            {(!gastos || gastos.length === 0) && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-gray-400">
                  {q ? 'No se encontraron gastos con esa búsqueda.' : 'Todavía no has registrado gastos.'}
                </td>
              </tr>
            )}
          </tbody>
          {gastos && gastos.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-marca font-semibold">
                <td className="p-3" colSpan={4}>Totales de esta lista</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totales.isv15 + totales.isv18)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totales.total)}</td>
                <td className="p-3" colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </>
  )
}
