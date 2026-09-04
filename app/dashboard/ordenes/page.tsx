import { createClient } from '@/lib/supabase/server'
import { obtenerEmpresaActiva } from '@/lib/empresa'
import NuevaOrdenForm from './nueva-orden-form'
import TarjetaOrden from './tarjeta-orden'

export default async function OrdenesPage() {
  const { empresaActiva } = await obtenerEmpresaActiva()
  if (!empresaActiva) return <div>Primero selecciona una empresa.</div>

  const supabase = await createClient()

  const { data: clientes } = await supabase
    .from('clientes')
    .select('id, nombre')
    .eq('empresa_id', empresaActiva.id)
    .eq('activo', true)
    .order('nombre')

  const { data: ordenes } = await supabase
    .from('ordenes_trabajo')
    .select('*, clientes(nombre), detalle_ordenes_trabajo(id, descripcion, completado)')
    .eq('empresa_id', empresaActiva.id)
    .order('created_at', { ascending: false })

  const pendientes = (ordenes || []).filter((o) => o.estado === 'pendiente')
  const enProceso = (ordenes || []).filter((o) => o.estado === 'en_proceso')
  const completadas = (ordenes || []).filter((o) => o.estado === 'completado')
  const canceladas = (ordenes || []).filter((o) => o.estado === 'cancelado')

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold text-[#1B2430]">Órdenes de trabajo</h1>

      <NuevaOrdenForm clientes={clientes || []} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div>
          <h2 className="mb-2 font-semibold text-gray-500">Pendiente ({pendientes.length})</h2>
          <div className="space-y-3">
            {pendientes.map((o: any) => <TarjetaOrden key={o.id} orden={o} />)}
            {pendientes.length === 0 && <p className="text-sm text-gray-400">Sin pendientes.</p>}
          </div>
        </div>
        <div>
          <h2 className="mb-2 font-semibold text-gray-500">En proceso ({enProceso.length})</h2>
          <div className="space-y-3">
            {enProceso.map((o: any) => <TarjetaOrden key={o.id} orden={o} />)}
            {enProceso.length === 0 && <p className="text-sm text-gray-400">Nada en proceso.</p>}
          </div>
        </div>
        <div>
          <h2 className="mb-2 font-semibold text-gray-500">Completado ({completadas.length})</h2>
          <div className="space-y-3">
            {completadas.map((o: any) => <TarjetaOrden key={o.id} orden={o} />)}
            {completadas.length === 0 && <p className="text-sm text-gray-400">Nada completado todavía.</p>}
          </div>
        </div>
        <div>
          <h2 className="mb-2 font-semibold text-gray-500">Cancelado ({canceladas.length})</h2>
          <div className="space-y-3">
            {canceladas.map((o: any) => <TarjetaOrden key={o.id} orden={o} />)}
            {canceladas.length === 0 && <p className="text-sm text-gray-400">Nada cancelado.</p>}
          </div>
        </div>
      </div>
    </>
  )
}