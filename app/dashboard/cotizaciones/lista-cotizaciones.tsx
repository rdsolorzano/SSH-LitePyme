'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { compararNumeroDocumento, formatearFecha, formatearMoneda } from '@/lib/formato'
import { estiloBotonSecundario, estiloInput } from '@/lib/estilos'
import { ESTADOS_COTIZACION, infoEstado } from '@/lib/estados'

type Cotizacion = { id: string; numero: string; fecha: string; total: number; estado: string; clientes: { nombre: string } | null }

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
    // Orden consecutivo por número de documento (antes era solo por fecha y los del mismo día salían revueltos)
    return [...resultado].sort((a, b) =>
      orden === 'desc' ? compararNumeroDocumento(b.numero, a.numero) : compararNumeroDocumento(a.numero, b.numero)
    )
  }, [cotizaciones, busqueda, orden])

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por cliente o número de cotización..."
          className={`${estiloInput} w-full max-w-sm text-sm`}
        />
        <button onClick={() => setOrden((o) => (o === 'desc' ? 'asc' : 'desc'))} className={estiloBotonSecundario}>
          No.: {orden === 'desc' ? 'más reciente primero ↓' : 'más antiguo primero ↑'}
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
                <td className="p-3">{formatearFecha(c.fecha)}</td>
                <td className="p-3">{c.clientes?.nombre || '—'}</td>
                <td className="p-3">L. {formatearMoneda(c.total)}</td>
                <td className={`p-3 ${infoEstado(ESTADOS_COTIZACION, c.estado).color}`}>{infoEstado(ESTADOS_COTIZACION, c.estado).etiqueta}</td>
                <td className="p-3"><Link href={`/dashboard/cotizaciones/${c.id}`} className="text-acento hover:underline">Ver</Link></td>
              </tr>
            ))}
            {filtradas.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-gray-400">No se encontraron cotizaciones.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}