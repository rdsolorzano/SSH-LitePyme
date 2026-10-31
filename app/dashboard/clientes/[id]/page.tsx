import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { actualizarCliente } from '../actions'

export default async function EditarClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: c } = await supabase.from('clientes').select('*').eq('id', id).single()

  if (!c) return <div className="p-8">Cliente no encontrado.</div>

  return (
    <>
      <Link href="/dashboard/clientes" className="text-sm text-[#0E7C86] hover:underline">← Volver</Link>
      <h1 className="my-4 text-2xl font-bold">Editar cliente</h1>

      <form action={actualizarCliente} className="grid max-w-xl gap-3 rounded-lg bg-white p-6 shadow">
        <input type="hidden" name="id" value={c.id} />
        <input name="nombre" defaultValue={c.nombre} placeholder="Nombre o razón social" required className="rounded border px-3 py-2" />
        <input name="rtn" defaultValue={c.rtn || ''} placeholder="RTN" className="rounded border px-3 py-2" />
        <input name="telefono" defaultValue={c.telefono || ''} placeholder="Teléfono" className="rounded border px-3 py-2" />
        <input name="email" type="email" defaultValue={c.email || ''} placeholder="Correo" className="rounded border px-3 py-2" />
        <input name="direccion" defaultValue={c.direccion || ''} placeholder="Dirección" className="rounded border px-3 py-2" />

        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="exonerado" defaultChecked={!!c.exonerado} />
          Cliente exonerado de impuestos
        </label>
        <input name="no_constancia_exonerado" defaultValue={c.no_constancia_exonerado || ''} placeholder="No. Constancia Exonerado (si es exonerado)" className="rounded border px-3 py-2" />
        <input name="no_registro_sag" defaultValue={c.no_registro_sag || ''} placeholder="No. Registro S.A.G. (si aplica)" className="rounded border px-3 py-2" />

        <button type="submit" className="rounded bg-[#0E7C86] py-2 text-white hover:bg-[#0c6971]">Guardar cambios</button>
      </form>
    </>
  )
}