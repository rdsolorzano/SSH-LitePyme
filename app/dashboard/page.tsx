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
      <h1 className="text-4xl font-bold text-[#1B2430]">
        {empresaActiva.nombre_comercial || empresaActiva.razon_social}
      </h1>
      <p className="mt-1 text-sm text-gray-500">&nbsp;&nbsp;</p>
      <p className="mt-1 text-2xl text-gray-500">Bienvenido a tu panel de control.</p>
      <p className="mt-1 text-sm text-gray-500">&nbsp;&nbsp;</p>
      <p className="mt-1 text-sm text-gray-500">&nbsp;&nbsp;</p>
      <p className="mt-1 text-sm text-gray-500">&nbsp;&nbsp;Ver. 1.5.6     &nbsp;&nbsp;&nbsp;&nbsp; 10.15 | 24.08.26</p>
    </div>
  )
}