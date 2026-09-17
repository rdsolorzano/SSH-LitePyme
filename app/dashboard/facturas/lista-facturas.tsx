'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { formatearMoneda } from '@/lib/formato'

type Factura = { id: string; numero_correlativo: string; fecha: string; total: number; clientes: { nombre: string } | null }

export default function ListaFacturas({ facturas }: { facturas: Factura[] }) {
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
    let resultado = facturas
    if (texto) {
      resultado = resultado.filter(
        (f) => f.clientes?.nombre?.toLowerCase().includes(texto) || f.numero_correlativo.toLowerCase().includes(texto)
      )
    }
    return [...resultado].sort((a, b) => (orden === 'desc' ? b.fecha.localeCompare(a.fecha) : a.fecha.localeCompare(b.fecha)))
  }, [facturas, busqueda, orden])

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por cliente o número de factura..."
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
              <th className="p-3">No. Factura</th>
              <th className="p-3">Fecha</th>
              <th className="p-3">Cliente</th>
              <th className="p-3">Total</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((f) => (
              <tr key={f.id} className="border-t">
                <td className="p-3 font-mono">{f.numero_correlativo}</td>
                <td className="p-3">{f.fecha}</td>
                <td className="p-3">{f.clientes?.nombre || '—'}</td>
                <td className="p-3">L. {formatearMoneda(f.total)}</td>
                <td className="p-3"><Link href={`/dashboard/facturas/${f.id}`} className="text-[#0E7C86] hover:underline">Ver / Imprimir</Link></td>
              </tr>
            ))}
            {filtradas.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-gray-400">No se encontraron facturas.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}