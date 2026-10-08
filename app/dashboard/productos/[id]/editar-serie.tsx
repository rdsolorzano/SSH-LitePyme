'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { actualizarSerie } from '../actions'

export default function EditarSerie({ productoId, serieActual }: { productoId: string; serieActual: string | null }) {
  const [serie, setSerie] = useState(serieActual || '')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [guardado, setGuardado] = useState(false)
  const router = useRouter()

  async function guardar() {
    setGuardando(true)
    setError('')
    setGuardado(false)

    const resultado = await actualizarSerie(productoId, serie)
    setGuardando(false)

    if (resultado.error) {
      setError(resultado.error)
      return
    }

    setGuardado(true)
    router.refresh()
    setTimeout(() => setGuardado(false), 3000)
  }

  return (
    <div className="mb-4 mt-2">
      <label className="mb-1 block text-xs uppercase tracking-wide text-gray-400">Serie / modelo (referencia interna)</label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={serie}
          onChange={(e) => setSerie(e.target.value)}
          placeholder="Sin serie registrada"
          className="w-full max-w-xs rounded border px-3 py-2 font-mono text-sm"
        />
        <button
          onClick={guardar}
          disabled={guardando || serie.trim() === (serieActual || '')}
          className="rounded bg-[#0E7C86] px-4 py-2 text-sm text-white hover:bg-[#0c6971] disabled:opacity-50"
        >
          {guardando ? 'Guardando...' : 'Guardar serie'}
        </button>
        {guardado && <span className="text-sm text-[#0E7C86]">Serie guardada.</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  )
}