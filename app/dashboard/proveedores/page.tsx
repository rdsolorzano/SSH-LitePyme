import { createClient } from '@/lib/supabase/server'
import { obtenerEmpresaActiva } from '@/lib/empresa'
import { crearProveedor, eliminarProveedor } from './actions'
import BuscadorLista from '@/app/dashboard/buscador-lista'
import { limpiarBusqueda } from '@/lib/busqueda'

export default async function ProveedoresPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { empresaActiva } = await obtenerEmpresaActiva()

  if (!empresaActiva) {
    return <div className="p-8">Primero selecciona una empresa desde el dashboard.</div>
  }

  const q = limpiarBusqueda((await searchParams).q)

  const supabase = await createClient()
  let consulta = supabase
    .from('proveedores')
    .select('*')
    .eq('empresa_id', empresaActiva.id)
    .eq('activo', true)

  if (q) consulta = consulta.or(`nombre.ilike.%${q}%,rtn.ilike.%${q}%,telefono.ilike.%${q}%,email.ilike.%${q}%`)

  const { data: proveedores } = await consulta.order('created_at', { ascending: false })

  return (
    <>

      <h1 className="my-4 text-2xl font-bold">Proveedores</h1>

      <form action={crearProveedor} className="mb-8 grid max-w-xl gap-3 rounded-lg bg-white p-6 shadow">
        <input name="nombre" placeholder="Nombre o razón social" required className="rounded border px-3 py-2" />
        <input name="rtn" placeholder="RTN (opcional)" className="rounded border px-3 py-2" />
        <input name="telefono" placeholder="Teléfono" className="rounded border px-3 py-2" />
        <input name="email" type="email" placeholder="Correo" className="rounded border px-3 py-2" />
        <input name="direccion" placeholder="Dirección" className="rounded border px-3 py-2" />

        <button type="submit" className="rounded bg-blue-600 py-2 text-white hover:bg-blue-700">
          Agregar
        </button>
      </form>

      <BuscadorLista placeholder="Buscar por nombre, RTN, teléfono o correo..." />

      <div className="overflow-hidden rounded-lg bg-white shadow">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="p-3">Nombre</th>
              <th className="p-3">RTN</th>
              <th className="p-3">Teléfono</th>
              <th className="p-3">Correo</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {proveedores?.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3">{p.nombre}</td>
                <td className="p-3">{p.rtn || '—'}</td>
                <td className="p-3">{p.telefono || '—'}</td>
                <td className="p-3">{p.email || '—'}</td>
                <td className="p-3">
                  <form action={eliminarProveedor}>
                    <input type="hidden" name="id" value={p.id} />
                    <button type="submit" className="text-red-500 hover:underline">
                      Eliminar
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {(!proveedores || proveedores.length === 0) && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-gray-400">
                  {q ? 'No se encontraron proveedores con esa búsqueda.' : 'Todavía no has agregado proveedores.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}