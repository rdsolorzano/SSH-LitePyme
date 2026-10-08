import { createClient } from '@/lib/supabase/server'
import { obtenerEmpresaActiva } from '@/lib/empresa'
import NuevaCompraForm from './nueva-compra-form'
import Link from 'next/link'
import { formatearMoneda } from '@/lib/formato'
import BuscadorLista from '@/app/dashboard/buscador-lista'
import { limpiarBusqueda } from '@/lib/busqueda'

export default async function ComprasPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { empresaActiva } = await obtenerEmpresaActiva()

  if (!empresaActiva) {
    return <div className="p-8">Primero selecciona una empresa desde el dashboard.</div>
  }

  const supabase = await createClient()

  const { data: productos } = await supabase
    .from('productos_servicios')
    .select('id, descripcion, precio_unitario, serie')
    .eq('empresa_id', empresaActiva.id)
    .eq('activo', true)
    .order('descripcion')

  const { data: proveedores } = await supabase
    .from('proveedores')
    .select('id, nombre')
    .eq('empresa_id', empresaActiva.id)
    .eq('activo', true)
    .order('nombre')

  const q = limpiarBusqueda((await searchParams).q)

  let consultaCompras = supabase
    .from('compras')
    .select('id, fecha, total, numero_factura_proveedor, proveedores(nombre)')
    .eq('empresa_id', empresaActiva.id)

  if (q) {
    const { data: provsCoinciden } = await supabase
      .from('proveedores')
      .select('id')
      .eq('empresa_id', empresaActiva.id)
      .ilike('nombre', `%${q}%`)

    const ids = (provsCoinciden || []).map((p) => p.id)
    const filtros = [`numero_factura_proveedor.ilike.%${q}%`]
    if (ids.length > 0) filtros.push(`proveedor_id.in.(${ids.join(',')})`)
    consultaCompras = consultaCompras.or(filtros.join(','))
  }

  const { data: compras } = await consultaCompras
    .order('fecha', { ascending: false })
    .limit(q ? 100 : 20)

  return (
    <>

      <div className="my-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1B2430]">Compras</h1>
        <Link href="/dashboard/compras/historial" className="text-sm text-[#0E7C86] hover:underline">
          Ver historial de costos por producto →
        </Link>
      </div>

      {(!productos || productos.length === 0 || !proveedores || proveedores.length === 0) && (
        <p className="mb-4 text-sm text-amber-600">
          Necesitas al menos un producto y un proveedor registrados antes de crear una compra.
        </p>
      )}

      <NuevaCompraForm productos={productos || []} proveedores={proveedores || []} />

      <h2 className="mb-2 text-lg font-semibold">Historial {q ? 'de la búsqueda' : 'reciente'}</h2>
      <BuscadorLista placeholder="Buscar por proveedor o No. de factura..." />
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="p-3">Fecha</th>
              <th className="p-3">Proveedor</th>
              <th className="p-3">No. Factura Prov.</th>
              <th className="p-3">Total</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {compras?.map((c: any) => (
              <tr key={c.id} className="border-t">
                <td className="p-3">{c.fecha}</td>
                <td className="p-3">{c.proveedores?.nombre || '—'}</td>
                <td className="p-3 font-mono">{c.numero_factura_proveedor || '—'}</td>
                <td className="p-3">L. {formatearMoneda(c.total)}</td>
                <td className="p-3"><Link href={`/dashboard/compras/${c.id}`} className="text-[#0E7C86] hover:underline">Ver detalle</Link></td>
              </tr>
            ))}
            {(!compras || compras.length === 0) && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-gray-400">
                  {q ? 'No se encontraron compras con esa búsqueda.' : 'Todavía no has registrado compras.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}