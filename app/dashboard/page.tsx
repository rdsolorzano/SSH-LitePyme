import { obtenerEmpresaActiva } from '@/lib/empresa'
import { seleccionarEmpresa, cerrarSesion } from './actions'
import Link from 'next/link'

export default async function DashboardPage() {
  const { empresas, empresaActiva } = await obtenerEmpresaActiva()

  if (empresas.length === 0) {
    return <div className="p-8">No tienes ninguna empresa asignada. Contacta al administrador.</div>
  }

  if (!empresaActiva) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow">
          <h1 className="mb-6 text-xl font-semibold text-gray-800">Elige una empresa</h1>
          <div className="space-y-2">
            {empresas.map((empresa) => (
              <form key={empresa.id} action={seleccionarEmpresa}>
                <input type="hidden" name="empresaId" value={empresa.id} />
                <button
                  type="submit"
                  className="w-full rounded border px-4 py-2 text-left hover:bg-gray-50"
                >
                  {empresa.nombre_comercial || empresa.razon_social}
                </button>
              </form>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {empresaActiva.nombre_comercial || empresaActiva.razon_social}
        </h1>
        <form action={cerrarSesion}>
          <button type="submit" className="text-sm text-gray-500 hover:text-gray-800">
            Cerrar sesión
          </button>
        </form>
      </div>

      <nav className="flex gap-4">
        <Link href="/dashboard/productos" className="text-blue-600 hover:underline">
          Productos y servicios
        </Link>
        <Link href="/dashboard/proveedores" className="text-blue-600 hover:underline">
          Proveedores
        </Link>
        <Link href="/dashboard/clientes" className="text-blue-600 hover:underline">
          Clientes
        </Link>
        <Link href="/dashboard/compras" className="text-blue-600 hover:underline">
          Compras
        </Link>
        <Link href="/dashboard/cotizaciones" className="text-blue-600 hover:underline">
          Cotizaciones
        </Link>
        <Link href="/dashboard/facturas" className="text-blue-600 hover:underline">
          Facturación
        </Link>
      </nav>
    </div>
  )
}