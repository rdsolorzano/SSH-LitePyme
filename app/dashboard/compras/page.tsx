import { createClient } from '@/lib/supabase/server'
import { obtenerEmpresaActiva } from '@/lib/empresa'
import NuevaCompraForm from './nueva-compra-form'

export default async function ComprasPage() {
  const { empresaActiva } = await obtenerEmpresaActiva()

  if (!empresaActiva) {
    return <div className="p-8">Primero selecciona una empresa desde el dashboard.</div>
  }

  const supabase = await createClient()

  const { data: productos } = await supabase
    .from('productos_servicios')
    .select('id, descripcion')
    .eq('empresa_id', empresaActiva.id)
    .eq('activo', true)
    .order('descripcion')

  const { data: proveedores } = await supabase
    .from('proveedores')
    .select('id, nombre')
    .eq('empresa_id', empresaActiva.id)
    .eq('activo', true)
    .order('nombre')

  const { data: compras } = await supabase
    .from('compras')
    .select('id, fecha, total, proveedores(nombre)')
    .eq('empresa_id', empresaActiva.id)
    .order('fecha', { ascending: false })
    .limit(20)

  return (
    <>

      <h1 className="my-4 text-2xl font-bold">Compras</h1>

      {(!productos || productos.length === 0 || !proveedores || proveedores.length === 0) && (
        <p className="mb-4 text-sm text-amber-600">
          Necesitas al menos un producto y un proveedor registrados antes de crear una compra.
        </p>
      )}

      <NuevaCompraForm productos={productos || []} proveedores={proveedores || []} />

      <h2 className="mb-2 text-lg font-semibold">Historial reciente</h2>
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="p-3">Fecha</th>
              <th className="p-3">Proveedor</th>
              <th className="p-3">Total</th>
            </tr>
          </thead>
          <tbody>
            {compras?.map((c: any) => (
              <tr key={c.id} className="border-t">
                <td className="p-3">{c.fecha}</td>
                <td className="p-3">{c.proveedores?.nombre || '—'}</td>
                <td className="p-3">L. {c.total}</td>
              </tr>
            ))}
            {(!compras || compras.length === 0) && (
              <tr>
                <td colSpan={3} className="p-6 text-center text-gray-400">
                  Todavía no has registrado compras.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}