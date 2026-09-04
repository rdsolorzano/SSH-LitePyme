import { createClient } from '@/lib/supabase/server'
import { obtenerEmpresaActiva } from '@/lib/empresa'
import Link from 'next/link'
import EditarOrdenForm from './editar-orden-form'

export default async function EditarOrdenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { empresaActiva } = await obtenerEmpresaActiva()
  if (!empresaActiva) return <div>Primero selecciona una empresa.</div>

  const supabase = await createClient()

  const { data: orden } = await supabase.from('ordenes_trabajo').select('*').eq('id', id).single()
  if (!orden) return <div>Orden no encontrada.</div>

  const { data: items } = await supabase
    .from('detalle_ordenes_trabajo')
    .select('id, descripcion, completado')
    .eq('orden_id', id)
    .order('created_at')

  const { data: clientes } = await supabase
    .from('clientes')
    .select('id, nombre')
    .eq('empresa_id', empresaActiva.id)
    .eq('activo', true)
    .order('nombre')

  return (
    <>
      <Link href="/dashboard/ordenes" className="text-sm text-[#0E7C86] hover:underline">← Volver a órdenes</Link>
      <h1 className="my-4 text-2xl font-bold text-[#1B2430]">Editar hoja de requerimiento</h1>
      <EditarOrdenForm ordenId={id} orden={orden} itemsIniciales={items || []} clientes={clientes || []} />
    </>
  )
}