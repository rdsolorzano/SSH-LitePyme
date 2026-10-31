'use client'

import { useRouter } from 'next/navigation'
import { actualizarEstado } from '../actions'
import { estiloInput } from '@/lib/estilos'
import { ESTADOS_COTIZACION } from '@/lib/estados'

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
      className={`${estiloInput} text-sm`}
    >
      {ESTADOS_COTIZACION.filter((e) => e.seleccionable).map((e) => (
        <option key={e.valor} value={e.valor}>
          {e.etiqueta}
        </option>
      ))}
    </select>
  )
}