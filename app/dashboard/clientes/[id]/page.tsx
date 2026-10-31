import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { actualizarCliente } from '../actions'
import { estiloInput } from '@/lib/estilos'

export default async function EditarClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: c } = await supabase.from('clientes').select('*').eq('id', id).single()

  if (!c) return <div className="p-8">Cliente no encontrado.</div>

  return (
    <>
      <Link href="/dashboard/clientes" className="text-sm text-acento hover:underline">← Volver</Link>
      <h1 className="my-4 text-2xl font-bold">Editar cliente</h1>

      <form action={actualizarCliente} className="grid max-w-xl gap-3 rounded-lg bg-white p-6 shadow">
        <input type="hidden" name="id" value={c.id} />
        <input name="nombre" defaultValue={c.nombre} placeholder="Nombre o razón social" required className={estiloInput} />
        <input name="rtn" defaultValue={c.rtn || ''} placeholder="RTN" className={estiloInput} />
        <input name="telefono" defaultValue={c.telefono || ''} placeholder="Teléfono" className={estiloInput} />
        <input name="email" type="email" defaultValue={c.email || ''} placeholder="Correo" className={estiloInput} />
        <input name="direccion" defaultValue={c.direccion || ''} placeholder="Dirección" className={estiloInput} />

        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="exonerado" defaultChecked={!!c.exonerado} />
          Cliente exonerado de impuestos
        </label>
        <input name="no_constancia_exonerado" defaultValue={c.no_constancia_exonerado || ''} placeholder="No. Constancia Exonerado (si es exonerado)" className={estiloInput} />
        <input name="no_registro_sag" defaultValue={c.no_registro_sag || ''} placeholder="No. Registro S.A.G. (si aplica)" className={estiloInput} />

        <button type="submit" className="rounded bg-acento py-2 text-white hover:bg-acento-oscuro">Guardar cambios</button>
      </form>
    </>
  )
}