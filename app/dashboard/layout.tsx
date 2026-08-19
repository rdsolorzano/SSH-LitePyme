import { obtenerEmpresaActiva } from '@/lib/empresa'
import { cerrarSesion, seleccionarEmpresa } from './actions'
import NavShell from './nav-shell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { empresas, empresaActiva } = await obtenerEmpresaActiva()

  return (
    <NavShell
      empresas={empresas}
      empresaActiva={empresaActiva}
      cerrarSesion={cerrarSesion}
      seleccionarEmpresa={seleccionarEmpresa}
    >
      {children}
    </NavShell>
  )
}