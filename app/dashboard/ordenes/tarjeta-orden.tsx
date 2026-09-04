'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { actualizarEstadoOrden, eliminarOrden } from './actions'

type Item = { id: string; descripcion: string; completado: boolean }
type Orden = {
  id: string
  titulo: string
  prioridad: string
  estado: string
  fecha_compromiso: string | null
  clientes: { nombre: string } | null
  detalle_ordenes_trabajo: Item[]
}

const COLOR_PRIORIDAD: Record<string, string> = {
  alta: 'border-red-400',
  media: 'border-amber-400',
  baja: 'border-gray-300',
}

export default function TarjetaOrden({ orden }: { orden: Orden }) {
  const [cambiando, setCambiando] = useState(false)
  const router = useRouter()

  async function cambiarEstado(estado: string) {
    setCambiando(true)
    await actualizarEstadoOrden(orden.id, estado)
    setCambiando(false)
    router.refresh()
  }

  async function eliminar() {
    if (!confirm('¿Eliminar esta hoja y todas sus peticiones?')) return
    await eliminarOrden(orden.id)
    router.refresh()
  }

  const total = orden.detalle_ordenes_trabajo.length
  const completados = orden.detalle_ordenes_trabajo.filter((i) => i.completado).length

  return (
    <div className={`rounded-lg border-l-4 bg-white p-3 shadow-sm ${COLOR_PRIORIDAD[orden.prioridad] || 'border-gray-300'}`}>
      <Link href={`/dashboard/ordenes/${orden.id}`} className="text-sm font-medium text-[#1B2430] hover:underline">
        {orden.titulo}
      </Link>
      {orden.clientes?.nombre && <p className="text-xs text-gray-500">Cliente: {orden.clientes.nombre}</p>}
      {total > 0 && <p className="mt-1 text-xs text-gray-500">{completados}/{total} peticiones completadas</p>}
      {orden.fecha_compromiso && <p className="mt-1 text-xs text-gray-400">Compromiso: {orden.fecha_compromiso}</p>}

      <div className="mt-2 flex items-center justify-between">
        <select
          value={orden.estado}
          onChange={(e) => cambiarEstado(e.target.value)}
          disabled={cambiando}
          className="rounded border px-2 py-1 text-xs"
        >
          <option value="pendiente">Pendiente</option>
          <option value="en_proceso">En proceso</option>
          <option value="completado">Completado</option>
          <option value="cancelado">Cancelado</option>
        </select>
        <button onClick={eliminar} className="text-xs text-red-500 hover:underline">Eliminar</button>
      </div>
    </div>
  )
}