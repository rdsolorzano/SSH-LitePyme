'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { actualizarPrecioVenta } from '../actions'

export default function EditarPrecio({ productoId, precioActual }: { productoId: string; precioActual: number }) {
  const [precio, setPrecio] = useState(String(precioActual))
  const [guardando, setGuardando] = useState(false)
  const router = useRouter()

  async function guardar() {
    setGuardando(true)
    await actualizarPrecioVenta(productoId, parseFloat(precio) || 0)
    setGuardando(false)
    router.refresh()
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        step="0.01"
        value={precio}
        onChange={(e) => setPrecio(e.target.value)}
        className="w-32 rounded border px-2 py-1.5 font-mono text-sm"
      />
      <button
        onClick={guardar}
        disabled={guardando}
        className="rounded bg-[#0E7C86] px-3 py-1.5 text-sm text-white hover:bg-[#0c6971] disabled:opacity-50"
      >
        {guardando ? 'Guardando...' : 'Actualizar precio'}
      </button>
    </div>
  )
}