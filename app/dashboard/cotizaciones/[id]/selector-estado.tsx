'use client'

import { useRouter } from 'next/navigation'
import { actualizarEstado } from '../actions'

export default function SelectorEstado({ cotizacionId, estadoActual }: { cotizacionId: string; estadoActual: string }) {
  const router = useRouter()

  async function cambiar(estado: string) {
    await actualizarEstado(cotizacionId, estado)
    router.refresh()
  }

  return (
    <select
      value={estadoActual}
      onChange={(e) => cambiar(e.target.value)}
      className="rounded border px-3 py-2 text-sm"
    >
      <option value="pendiente">Pendiente</option>
      <option value="enviada">Enviada</option>
      <option value="aprobada">Aprobada</option>
      <option value="rechazada">Rechazada</option>
    </select>
  )
}