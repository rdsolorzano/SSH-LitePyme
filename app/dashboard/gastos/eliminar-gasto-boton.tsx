'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { eliminarGasto } from './actions'

// Pide confirmación con un segundo clic (sin ventanas emergentes del navegador)
export default function EliminarGastoBoton({ id }: { id: string }) {
  const [confirmando, setConfirmando] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const router = useRouter()

  async function eliminar() {
    setEliminando(true)
    await eliminarGasto(id)
    setEliminando(false)
    setConfirmando(false)
    router.refresh()
  }

  if (!confirmando) {
    return (
      <button onClick={() => setConfirmando(true)} className="text-xs text-red-500 hover:underline">
        Eliminar
      </button>
    )
  }
  return (
    <span className="flex gap-2 text-xs">
      <button onClick={eliminar} disabled={eliminando} className="font-semibold text-red-600 hover:underline">
        {eliminando ? 'Eliminando...' : '¿Seguro? Sí'}
      </button>
      <button onClick={() => setConfirmando(false)} className="text-gray-400 hover:underline">
        No
      </button>
    </span>
  )
}
