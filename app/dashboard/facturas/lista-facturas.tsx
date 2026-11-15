'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { compararNumeroDocumento, formatearFecha, formatearMoneda } from '@/lib/formato'
import { estiloBotonSecundario, estiloInput } from '@/lib/estilos'
import { conVolver, rutaConFiltros } from '@/lib/navegacion'

type Factura = { id: string; numero_correlativo: string; fecha: string; total: number; isv: number; clientes: { nombre: string } | null }

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

  // Origen para el botón Volver del detalle: esta lista con su búsqueda y orden
  const origen = rutaConFiltros(pathname, { q: busqueda || null, orden: orden !== 'desc' ? orden : null })

  const filtradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    let resultado = facturas
    if (texto) {
      resultado = resultado.filter(
        (f) => f.clientes?.nombre?.toLowerCase().includes(texto) || f.numero_correlativo.toLowerCase().includes(texto)
      )
    }
    // Orden consecutivo por número de documento (antes era solo por fecha y los del mismo día salían revueltos)
    return [...resultado].sort((a, b) =>
      orden === 'desc' ? compararNumeroDocumento(b.numero_correlativo, a.numero_correlativo) : compararNumeroDocumento(a.numero_correlativo, b.numero_correlativo)
    )
  }, [facturas, busqueda, orden])

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por cliente o número de factura..."
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

      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="p-3">No. Factura</th>
              <th className="p-3">Fecha</th>
              <th className="p-3">Cliente</th>
              <th className="p-3 text-right">Sin ISV</th>
              <th className="p-3 text-right">ISV</th>
              <th className="p-3 text-right">Total</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((f) => (
              <tr key={f.id} className="border-t">
                <td className="whitespace-nowrap p-3 font-mono">{f.numero_correlativo}</td>
                <td className="whitespace-nowrap p-3">{formatearFecha(f.fecha)}</td>
                <td className="p-3">{f.clientes?.nombre || '—'}</td>
                <td className="whitespace-nowrap p-3 text-right font-mono">L. {formatearMoneda(f.total - f.isv)}</td>
                <td className="whitespace-nowrap p-3 text-right font-mono">L. {formatearMoneda(f.isv)}</td>
                <td className="whitespace-nowrap p-3 text-right font-mono font-semibold">L. {formatearMoneda(f.total)}</td>
                <td className="whitespace-nowrap p-3"><Link href={conVolver(`/dashboard/facturas/${f.id}`, origen)} className="text-acento hover:underline">Ver / Imprimir</Link></td>
              </tr>
            ))}
            {filtradas.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-gray-400">No se encontraron facturas.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}