'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { convertirCotizacionAFactura } from '../actions'

export default function ConvertirAFactura({
  cotizacionId,
  caiRangos,
}: {
  cotizacionId: string
  caiRangos: { id: string; cai: string }[]
}) {
  const [caiRangoId, setCaiRangoId] = useState(caiRangos[0]?.id || '')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function convertir() {
    if (!caiRangoId) return setError('No hay un CAI activo configurado.')
    setCargando(true)
    const resultado = await convertirCotizacionAFactura(cotizacionId, caiRangoId)
    setCargando(false)

    if (resultado?.error) return setError(resultado.error)
    if (resultado?.facturaId) router.push(`/dashboard/facturas/${resultado.facturaId}`)
  }

  return (
    <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3">
      <span className="text-sm text-green-700">Cotización aprobada —</span>
      <select value={caiRangoId} onChange={(e) => setCaiRangoId(e.target.value)} className="rounded border px-2 py-1 text-sm">
        {caiRangos.map((c) => <option key={c.id} value={c.id}>{c.cai}</option>)}
      </select>
      <button onClick={convertir} disabled={cargando} className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700 disabled:opacity-50">
        {cargando ? 'Convirtiendo...' : 'Convertir a factura'}
      </button>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  )
}