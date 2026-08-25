import { obtenerEmpresaActiva } from '@/lib/empresa'
import NuevaEmpresaForm from './nueva-empresa-form'
import Link from 'next/link'

export default async function EmpresasPage() {
  const { empresas } = await obtenerEmpresaActiva()

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold text-[#1B2430]">Mis empresas</h1>

      <NuevaEmpresaForm />

      <h2 className="mb-2 font-semibold text-[#1B2430]">Empresas con acceso</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {empresas.map((e) => (
          <Link key={e.id} href={`/dashboard/empresas/${e.id}`} className="rounded-lg bg-white p-4 shadow-sm hover:shadow-md">
            <p className="font-medium text-[#1B2430]">{e.nombre_comercial || e.razon_social}</p>
            <p className="text-xs text-gray-400">Administrar accesos →</p>
          </Link>
        ))}
      </div>
    </>
  )
}