import { obtenerEmpresaActiva } from '@/lib/empresa'

export default async function DashboardPage() {
  const { empresaActiva } = await obtenerEmpresaActiva()

  if (!empresaActiva) {
    return (
      <div className="rounded-lg bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-[#1B2430]">No tienes ninguna empresa asignada</h1>
        <p className="mt-2 text-sm text-gray-500">Contacta al administrador para que te vincule a una.</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1B2430]">
        {empresaActiva.nombre_comercial || empresaActiva.razon_social}
      </h1>
      <p className="mt-1 text-sm text-gray-500">Bienvenido a tu panel de control. Ver. 1.5.0</p>
    </div>
  )
}