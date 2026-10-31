'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { crearReciboDesdeCotizacion } from '@/app/dashboard/recibos/actions'
import { estiloBotonSecundario } from '@/lib/estilos'

export default function GenerarReciboBoton({ cotizacionId }: { cotizacionId: string }) {
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function generar() {
    setGenerando(true)
    setError('')
    const resultado = await crearReciboDesdeCotizacion(cotizacionId)
    setGenerando(false)

    if (resultado?.error) return setError(resultado.error)
    if (resultado?.reciboId) router.push(`/dashboard/recibos/${resultado.reciboId}`)
  }

  return (
    <div>
      <button onClick={generar} disabled={generando} className={estiloBotonSecundario}>
        {generando ? 'Generando...' : 'Generar recibo'}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}