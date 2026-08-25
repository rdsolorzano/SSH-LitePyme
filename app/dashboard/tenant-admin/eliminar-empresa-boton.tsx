'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { eliminarEmpresa } from './actions'

export default function EliminarEmpresaBoton({ empresaId, nombre }: { empresaId: string; nombre: string }) {
  const [confirmando, setConfirmando] = useState(false)
  const [texto, setTexto] = useState('')
  const [eliminando, setEliminando] = useState(false)
  const router = useRouter()

  async function eliminar() {
    setEliminando(true)
    await eliminarEmpresa(empresaId)
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
    <div className="flex items-center gap-2">
      <input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder={`Escribe "${nombre}" para confirmar`}
        className="rounded border px-2 py-1 text-xs"
      />
      <button
        onClick={eliminar}
        disabled={texto !== nombre || eliminando}
        className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-50"
      >
        {eliminando ? 'Eliminando...' : 'Confirmar borrado'}
      </button>
      <button onClick={() => { setConfirmando(false); setTexto('') }} className="text-xs text-gray-400 hover:underline">
        Cancelar
      </button>
    </div>
  )
}