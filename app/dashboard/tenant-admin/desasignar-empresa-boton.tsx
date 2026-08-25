'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { desasignarEmpresa } from './actions'

export default function DesasignarEmpresaBoton({ vinculoId }: { vinculoId: string }) {
  const [quitando, setQuitando] = useState(false)
  const router = useRouter()

  async function quitar() {
    if (!confirm('¿Quitar el acceso de este usuario a esta empresa?')) return
    setQuitando(true)
    await desasignarEmpresa(vinculoId)
    setQuitando(false)
    router.refresh()
  }

  return (
    <button onClick={quitar} disabled={quitando} className="ml-2 text-xs text-red-500 hover:underline disabled:opacity-50">
      {quitando ? 'Quitando...' : 'Quitar'}
    </button>
  )
}