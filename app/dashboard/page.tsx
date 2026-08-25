import { obtenerEmpresaActiva } from '@/lib/empresa'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const { empresaActiva } = await obtenerEmpresaActiva()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const nombreCompleto = user?.user_metadata?.full_name as string | undefined
  const identificacionUsuario = nombreCompleto ? `${nombreCompleto} — ${user?.email}` : user?.email

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
      <div className="flex items-center gap-4">
        {empresaActiva.logo_url && (
          <img src={empresaActiva.logo_url} alt="" className="h-46 w-46 object-contain" />
        )}
        <h1 className="text-4xl font-bold text-[#1B2430]">
          {empresaActiva.nombre_comercial || empresaActiva.razon_social}
        </h1>
      </div>
      <p className="mt-1 text-sm text-gray-500">&nbsp;&nbsp;Ver. 2.2.1</p>
      <p className="mt-1 text-sm text-gray-500">&nbsp;&nbsp;23:45 | 24.08.26</p>
      <p className="mt-1 text-sm text-gray-500">&nbsp;&nbsp;</p>
      <p className="mt-1 text-2xl text-gray-500">Bienvenido a tu panel de control</p>
      <p className="mt-1 text-2xl text-gray-500">Usuario: {identificacionUsuario}</p>
      <p className="mt-1 text-sm text-gray-500">&nbsp;&nbsp;</p>
      <p className="mt-1 text-sm text-gray-500">&nbsp;&nbsp;</p>

    </div>
  )
}