import { createClient } from '@/lib/supabase/server'
import { listarAccesos } from '../actions'
import InvitarForm from './invitar-form'
import QuitarAccesoBoton from './quitar-acceso-boton'
import Link from 'next/link'

export default async function GestionAccesosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: empresa } = await supabase
    .from('empresas')
    .select('id, razon_social, nombre_comercial')
    .eq('id', id)
    .single()

  if (!empresa) return <div>No tienes acceso a esta empresa o no existe.</div>

  const accesos = await listarAccesos(id)

  return (
    <>
      <Link href="/dashboard/empresas" className="text-sm text-[#0E7C86] hover:underline">← Volver a mis empresas</Link>
      <h1 className="my-4 text-2xl font-bold text-[#1B2430]">
        Accesos de {empresa.nombre_comercial || empresa.razon_social}
      </h1>

      <InvitarForm empresaId={empresa.id} />

      <div className="overflow-hidden rounded-lg bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="p-3">Correo</th>
              <th className="p-3">Rol</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {accesos.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="p-3">{a.email}</td>
                <td className="p-3 capitalize">{a.rol}</td>
                <td className="p-3"><QuitarAccesoBoton usuarioEmpresaId={a.id} /></td>
              </tr>
            ))}
            {accesos.length === 0 && (
              <tr><td colSpan={3} className="p-6 text-center text-gray-400">Sin usuarios registrados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}