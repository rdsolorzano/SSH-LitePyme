import { esSuperAdmin } from '@/lib/permisos'
import { listarTodo } from './actions'
import NuevaEmpresaForm from './nueva-empresa-form'
import AsignarEmpresaForm from './asignar-empresa-form'
import EliminarEmpresaBoton from './eliminar-empresa-boton'
import DesasignarEmpresaBoton from './desasignar-empresa-boton'

export default async function TenantAdminPage() {
  const autorizado = await esSuperAdmin()

  if (!autorizado) {
    return (
      <div className="rounded-lg bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-[#1B2430]">Acceso no autorizado</h1>
        <p className="mt-2 text-sm text-gray-500">Esta sección es exclusiva del administrador general del sistema.</p>
      </div>
    )
  }

  const { empresas, usuarios } = await listarTodo()

  return (
    <>
      <h1 className="mb-1 text-2xl font-bold text-[#1B2430]">Administración general LitePyme</h1>
      <p className="mb-6 text-sm text-gray-500">Visible solo para el administrador del sistema.</p>

      <NuevaEmpresaForm />

      <h2 className="mb-2 font-semibold text-[#1B2430]">Asignar empresa a un usuario</h2>
      <AsignarEmpresaForm usuarios={usuarios} empresas={empresas} />

      <h2 className="mb-2 mt-8 font-semibold text-[#1B2430]">Todos los usuarios del sistema</h2>
      <div className="overflow-hidden rounded-lg bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="p-3">Nombre</th>
              <th className="p-3">Correo</th>
              <th className="p-3">Empresas asignadas</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} className="border-t align-top">
                <td className="p-3">{u.nombre || '—'}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3">
                  {u.empresas.length === 0 ? (
                    <span className="text-gray-400">Sin empresas</span>
                  ) : (
                    u.empresas.map((e, i) => (
                      <div key={i} className="mb-1">
                        {e.nombre} <span className="text-gray-400">({e.rol})</span>
                        <DesasignarEmpresaBoton vinculoId={e.vinculoId} />
                      </div>
                    ))
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mb-2 mt-8 font-semibold text-[#1B2430]">Todas las empresas</h2>
      <div className="overflow-hidden rounded-lg bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="p-3">Empresa</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {empresas.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="p-3">{e.nombre_comercial || e.razon_social}</td>
                <td className="p-3"><EliminarEmpresaBoton empresaId={e.id} nombre={e.nombre_comercial || e.razon_social} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}