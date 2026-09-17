'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { formatearMoneda } from '@/lib/formato'

type Cotizacion = { id: string; numero: string; fecha: string; total: number; estado: string; clientes: { nombre: string } | null }

const COLOR_ESTADO: Record<string, string> = {
  pendiente: 'text-amber-600',
  enviada: 'text-blue-600',
  aprobada: 'text-green-600',
  rechazada: 'text-red-600',
  convertida: 'text-[#0E7C86]',
}

export default function ListaCotizaciones({ cotizaciones }: { cotizaciones: Cotizacion[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [busqueda, setBusqueda] = useState(searchParams.get('q') || '')
  const [orden, setOrden] = useState<'desc' | 'asc'>((searchParams.get('orden') as 'desc' | 'asc') || 'desc')

  useEffect(() => {
    const params = new URLSearchParams()
    if (busqueda) params.set('q', busqueda)
    if (orden !== 'desc') params.set('orden', orden)
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [busqueda, orden, pathname, router])

  const filtradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    let resultado = cotizaciones
    if (texto) {
      resultado = resultado.filter(
        (c) => c.clientes?.nombre?.toLowerCase().includes(texto) || c.numero.toLowerCase().includes(texto)
      )
    }
    return [...resultado].sort((a, b) => (orden === 'desc' ? b.fecha.localeCompare(a.fecha) : a.fecha.localeCompare(b.fecha)))
  }, [cotizaciones, busqueda, orden])

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por cliente o número de cotización..."
          className="w-full max-w-sm rounded border px-3 py-2 text-sm"
        />
        <button onClick={() => setOrden((o) => (o === 'desc' ? 'asc' : 'desc'))} className="rounded border px-3 py-2 text-sm hover:bg-gray-50">
          Fecha: {orden === 'desc' ? 'reciente primero ↓' : 'antigua primero ↑'}
        </button>
        {busqueda && (
          <button onClick={() => setBusqueda('')} className="text-xs text-gray-400 hover:underline">
            Quitar filtro
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="p-3">No.</th>
              <th className="p-3">Fecha</th>
              <th className="p-3">Cliente</th>
              <th className="p-3">Total</th>
              <th className="p-3">Estado</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-3 font-mono">{c.numero}</td>
                <td className="p-3">{c.fecha}</td>
                <td className="p-3">{c.clientes?.nombre || '—'}</td>
                <td className="p-3">L. {formatearMoneda(c.total)}</td>
                <td className={`p-3 capitalize ${COLOR_ESTADO[c.estado] || ''}`}>{c.estado}</td>
                <td className="p-3"><Link href={`/dashboard/cotizaciones/${c.id}`} className="text-[#0E7C86] hover:underline">Ver</Link></td>
              </tr>
            ))}
            {filtradas.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-gray-400">No se encontraron cotizaciones.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}