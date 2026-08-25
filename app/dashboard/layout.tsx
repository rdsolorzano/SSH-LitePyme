import { obtenerEmpresaActiva } from '@/lib/empresa'
import { esSuperAdmin } from '@/lib/permisos'
import { cerrarSesion, seleccionarEmpresa } from './actions'
import NavShell from './nav-shell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { empresas, empresaActiva } = await obtenerEmpresaActiva()
  const esAdmin = await esSuperAdmin()

  return (
    <NavShell
      empresas={empresas}
      empresaActiva={empresaActiva}
      cerrarSesion={cerrarSesion}
      seleccionarEmpresa={seleccionarEmpresa}
      esSuperAdmin={esAdmin}
    >
      {children}
    </NavShell>
  )
}