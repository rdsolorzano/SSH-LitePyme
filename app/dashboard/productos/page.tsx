import { createClient } from '@/lib/supabase/server'
import { obtenerEmpresaActiva } from '@/lib/empresa'
import { crearProducto, eliminarProducto } from './actions'
import Link from 'next/link'

export default async function ProductosPage() {
  const { empresaActiva } = await obtenerEmpresaActiva()

  if (!empresaActiva) {
    return <div className="p-8">Primero selecciona una empresa desde el dashboard.</div>
  }

  const supabase = await createClient()
  const { data: productos } = await supabase
    .from('productos_servicios')
    .select('*')
    .eq('empresa_id', empresaActiva.id)
    .eq('activo', true)
    .order('created_at', { ascending: false })

  return (
    <div className="p-8">
      <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
        ← Volver al dashboard
      </Link>

      <h1 className="my-4 text-2xl font-bold">Productos y servicios</h1>

      <form action={crearProducto} className="mb-8 grid max-w-xl gap-3 rounded-lg bg-white p-6 shadow">
        <select name="tipo" defaultValue="producto" className="rounded border px-3 py-2">
          <option value="producto">Producto</option>
          <option value="servicio">Servicio</option>
        </select>

        <input name="descripcion" placeholder="Descripción" required className="rounded border px-3 py-2" />

        <input
          name="precio_unitario"
          type="number"
          step="0.01"
          placeholder="Precio unitario (L.)"
          required
          className="rounded border px-3 py-2"
        />

        <select name="tasa_isv" defaultValue="15" className="rounded border px-3 py-2">
          <option value="15">ISV 15%</option>
          <option value="18">ISV 18%</option>
          <option value="0">Exento</option>
        </select>

        <input
          name="existencia"
          type="number"
          step="1"
          placeholder="Existencia (solo productos)"
          className="rounded border px-3 py-2"
        />

        <button type="submit" className="rounded bg-blue-600 py-2 text-white hover:bg-blue-700">
          Agregar
        </button>
      </form>

      <div className="overflow-hidden rounded-lg bg-white shadow">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="p-3">Descripción</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">Precio</th>
              <th className="p-3">ISV</th>
              <th className="p-3">Existencia</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {productos?.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3">{p.descripcion}</td>
                <td className="p-3">{p.tipo}</td>
                <td className="p-3">L. {p.precio_unitario}</td>
                <td className="p-3">{p.tasa_isv}%</td>
                <td className="p-3">{p.tipo === 'producto' ? p.existencia : '—'}</td>
                <td className="p-3">
                  <form action={eliminarProducto}>
                    <input type="hidden" name="id" value={p.id} />
                    <button type="submit" className="text-red-500 hover:underline">
                      Eliminar
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {(!productos || productos.length === 0) && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-gray-400">
                  Todavía no has agregado productos o servicios.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}