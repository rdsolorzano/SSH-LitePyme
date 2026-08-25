'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { quitarAcceso } from '../actions'

export default function QuitarAccesoBoton({ usuarioEmpresaId }: { usuarioEmpresaId: string }) {
  const [quitando, setQuitando] = useState(false)
  const router = useRouter()

  async function quitar() {
    setQuitando(true)
    await quitarAcceso(usuarioEmpresaId)
    setQuitando(false)
    router.refresh()
  }

  return (
    <button onClick={quitar} disabled={quitando} className="text-xs text-red-500 hover:underline disabled:opacity-50">
      Quitar acceso
    </button>
  )
}