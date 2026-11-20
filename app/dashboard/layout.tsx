import { obtenerEmpresaActiva } from '@/lib/empresa'
import { esSuperAdmin, obtenerRol } from '@/lib/permisos'
import { cerrarSesion, seleccionarEmpresa } from './actions'
import NavShell from './nav-shell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { empresas, empresaActiva } = await obtenerEmpresaActiva()
  const esAdmin = await esSuperAdmin()
  const rol = empresaActiva ? await obtenerRol(empresaActiva.id) : 'admin'

  return (
    <NavShell
      empresas={empresas}
      empresaActiva={empresaActiva}
      cerrarSesion={cerrarSesion}
      seleccionarEmpresa={seleccionarEmpresa}
      esSuperAdmin={esAdmin}
      rol={rol}
    >
      {children}
    </NavShell>
  )
}