'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { compararNumeroDocumento, formatearFecha, formatearMoneda, nombreArchivoFactura } from '@/lib/formato'
import { estiloInput } from '@/lib/estilos'
import { conVolver, rutaConFiltros } from '@/lib/navegacion'
import { ESTADOS_COTIZACION, infoEstado } from '@/lib/estados'
import { AVISOS, RUBROS, etiquetaRubro, formatearPorcentaje, margenReal, nivelAviso } from '@/lib/costeo'

export type FilaCosteo = {
  id: string
  rubro: string
  costoEstimado: number
  precioSugerido: number
  margenObjetivo: number
  precioCotizado: number
  cotizacionId: string
  numero: string
  fecha: string
  estado: string
  cliente: string
  facturaId: string | null
  facturaNumero: string | null
}

export default function ListaCosteos({ filas }: { filas: FilaCosteo[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [busqueda, setBusqueda] = useState(searchParams.get('q') || '')
  const [rubro, setRubro] = useState(searchParams.get('rubro') || '')
  const [estado, setEstado] = useState(searchParams.get('estado') || '')
  const [desde, setDesde] = useState(searchParams.get('desde') || '')
  const [hasta, setHasta] = useState(searchParams.get('hasta') || '')
  const [alerta, setAlerta] = useState(searchParams.get('alerta') === '1')

  const filtros = {
    q: busqueda || null,
    rubro: rubro || null,
    estado: estado || null,
    desde: desde || null,
    hasta: hasta || null,
    alerta: alerta ? '1' : null,
  }
  // Origen para el botón Volver de la hoja: este listado con sus filtros
  const origen = rutaConFiltros(pathname, filtros)

  useEffect(() => {
    router.replace(origen, { scroll: false })
  }, [origen, router])

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return filas
      .filter((f) => !texto || f.numero.toLowerCase().includes(texto) || f.cliente.toLowerCase().includes(texto))
      .filter((f) => !rubro || f.rubro === rubro)
      .filter((f) => (estado === 'facturadas' ? f.estado === 'convertida' : estado === 'abiertas' ? f.estado !== 'convertida' : true))
      .filter((f) => !desde || f.fecha.slice(0, 10) >= desde)
      .filter((f) => !hasta || f.fecha.slice(0, 10) <= hasta)
      .filter((f) => {
        if (!alerta) return true
        const nivel = nivelAviso(f.precioCotizado, f.costoEstimado, f.margenObjetivo)
        return nivel === 'perdida' || nivel === 'bajo'
      })
      .sort((a, b) => compararNumeroDocumento(b.numero, a.numero))
  }, [filas, busqueda, rubro, estado, desde, hasta, alerta])

  const totalCosto = visibles.reduce((s, f) => s + f.costoEstimado, 0)
  const totalPrecio = visibles.reduce((s, f) => s + f.precioCotizado, 0)
  const margenTotal = margenReal(totalPrecio, totalCosto)
  const gananciaTotal = totalPrecio - totalCosto
  const hayFiltros = Object.values(filtros).some(Boolean)

  function limpiar() {
    setBusqueda('')
    setRubro('')
    setEstado('')
    setDesde('')
    setHasta('')
    setAlerta(false)
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por cliente o número de cotización..."
          className={`${estiloInput} w-full max-w-sm text-sm`}
        />
        <select value={rubro} onChange={(e) => setRubro(e.target.value)} className={`${estiloInput} text-sm`}>
          <option value="">Todos los rubros</option>
          {RUBROS.map((r) => (
            <option key={r.valor} value={r.valor}>
              {r.etiqueta}
            </option>
          ))}
        </select>
        <select value={estado} onChange={(e) => setEstado(e.target.value)} className={`${estiloInput} text-sm`}>
          <option value="">Abiertas y facturadas</option>
          <option value="abiertas">Solo abiertas</option>
          <option value="facturadas">Solo facturadas</option>
        </select>
        <label className="text-xs text-gray-500">
          Desde
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={`${estiloInput} ml-1 py-1.5 text-sm`} />
        </label>
        <label className="text-xs text-gray-500">
          Hasta
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={`${estiloInput} ml-1 py-1.5 text-sm`} />
        </label>
        <label className="flex items-center gap-1.5 rounded border px-3 py-2 text-sm">
          <input type="checkbox" checked={alerta} onChange={(e) => setAlerta(e.target.checked)} />
          Bajo el margen objetivo o con pérdida
        </label>
        {hayFiltros && (
          <button onClick={limpiar} className="text-xs text-gray-400 hover:underline">
            Quitar filtros
          </button>
        )}
      </div>

      {/* Escritorio: tabla */}
      <div className="hidden overflow-x-auto rounded-lg bg-white shadow-sm md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="p-3">Cotización</th>
              <th className="p-3">Cliente</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Factura</th>
              <th className="p-3 text-right">Costo</th>
              <th className="p-3 text-right">Precio cotizado</th>
              <th className="p-3 text-right">Ganancia</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((f) => {
              const aviso = AVISOS[nivelAviso(f.precioCotizado, f.costoEstimado, f.margenObjetivo)]
              const est = infoEstado(ESTADOS_COTIZACION, f.estado)
              return (
                <tr key={f.id} className="border-t">
                  <td className="whitespace-nowrap p-3 font-mono">
                    <Link href={conVolver(`/dashboard/cotizaciones/${f.cotizacionId}`, origen)} className="text-acento hover:underline">
                      {f.numero}
                    </Link>
                    <span className="block font-sans text-xs text-gray-400">{formatearFecha(f.fecha)}</span>
                  </td>
                  <td className="p-3">
                    {f.cliente || '—'}
                    <span className="block text-xs text-gray-400">{etiquetaRubro(f.rubro)}</span>
                  </td>
                  <td className={`p-3 ${est.color}`}>{est.etiqueta}</td>
                  <td className="whitespace-nowrap p-3 font-mono">
                    {f.facturaId ? (
                      <Link href={conVolver(`/dashboard/facturas/${f.facturaId}`, origen)} title={f.facturaNumero ?? ''} className="text-acento hover:underline">
                        {nombreArchivoFactura(f.facturaNumero)}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="whitespace-nowrap p-3 text-right font-mono">L. {formatearMoneda(f.costoEstimado)}</td>
                  <td className="whitespace-nowrap p-3 text-right font-mono">L. {formatearMoneda(f.precioCotizado)}</td>
                  <td className="whitespace-nowrap p-3 text-right">
                    <Ganancia valor={f.precioCotizado - f.costoEstimado} />
                    <span className={`mt-1 inline-block rounded px-2 py-0.5 font-mono text-xs font-semibold ${aviso.caja} ${aviso.texto}`} title={aviso.etiqueta}>
                      {formatearPorcentaje(margenReal(f.precioCotizado, f.costoEstimado))}
                    </span>
                  </td>
                  <td className="whitespace-nowrap p-3">
                    <Link href={conVolver(`/dashboard/cotizaciones/${f.cotizacionId}/costeo`, origen)} className="text-acento hover:underline">
                      Ver costeo
                    </Link>
                  </td>
                </tr>
              )
            })}
            {visibles.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-gray-400">
                  {filas.length === 0 ? 'Aún no hay cotizaciones costeadas.' : 'Ningún costeo coincide con los filtros.'}
                </td>
              </tr>
            )}
          </tbody>
          {visibles.length > 0 && (
            <tfoot className="border-t-2 border-marca font-semibold text-marca">
              <tr>
                <td className="p-3" colSpan={4}>
                  Total ({visibles.length} {visibles.length === 1 ? 'costeo' : 'costeos'})
                </td>
                <td className="whitespace-nowrap p-3 text-right font-mono">L. {formatearMoneda(totalCosto)}</td>
                <td className="whitespace-nowrap p-3 text-right font-mono">L. {formatearMoneda(totalPrecio)}</td>
                <td className="whitespace-nowrap p-3 text-right">
                  <Ganancia valor={gananciaTotal} />
                  <span className="block font-mono text-xs">{formatearPorcentaje(margenTotal)}</span>
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Celular: tarjetas */}
      <div className="space-y-3 md:hidden">
        {visibles.map((f) => {
          const aviso = AVISOS[nivelAviso(f.precioCotizado, f.costoEstimado, f.margenObjetivo)]
          const est = infoEstado(ESTADOS_COTIZACION, f.estado)
          return (
            <Link
              key={f.id}
              href={conVolver(`/dashboard/cotizaciones/${f.cotizacionId}/costeo`, origen)}
              className="block rounded-lg bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono font-semibold text-marca">{f.numero}</p>
                  <p className="text-sm text-gray-600">{f.cliente || '—'}</p>
                  <p className="text-xs text-gray-400">
                    {formatearFecha(f.fecha)} · {etiquetaRubro(f.rubro)} · <span className={est.color}>{est.etiqueta}</span>
                  </p>
                  {f.facturaNumero && <p className="font-mono text-xs text-gray-400">Factura {f.facturaNumero}</p>}
                </div>
                <span className={`shrink-0 rounded px-2 py-0.5 font-mono text-xs font-semibold ${aviso.caja} ${aviso.texto}`}>
                  {formatearPorcentaje(margenReal(f.precioCotizado, f.costoEstimado))}
                </span>
              </div>
              <div className="mt-2 flex justify-between text-sm">
                <span className="text-gray-500">
                  Costo <span className="font-mono text-gray-700">L. {formatearMoneda(f.costoEstimado)}</span>
                </span>
                <span className="text-gray-500">
                  Precio <span className="font-mono text-gray-700">L. {formatearMoneda(f.precioCotizado)}</span>
                </span>
              </div>
              <div className="mt-1 flex justify-between text-sm">
                <span className="text-gray-500">{f.precioCotizado - f.costoEstimado < 0 ? 'Pérdida' : 'Ganancia'}</span>
                <Ganancia valor={f.precioCotizado - f.costoEstimado} />
              </div>
            </Link>
          )
        })}
        {visibles.length === 0 && (
          <p className="rounded-lg bg-white p-6 text-center text-sm text-gray-400 shadow-sm">
            {filas.length === 0 ? 'Aún no hay cotizaciones costeadas.' : 'Ningún costeo coincide con los filtros.'}
          </p>
        )}
        {visibles.length > 0 && (
          <div className="rounded-lg bg-white p-4 text-sm font-semibold text-marca shadow-sm">
            <p>Total ({visibles.length})</p>
            <div className="mt-1 flex justify-between font-mono text-xs">
              <span>Costo L. {formatearMoneda(totalCosto)}</span>
              <span>Precio L. {formatearMoneda(totalPrecio)}</span>
            </div>
            <div className="mt-1 flex justify-between font-mono text-xs">
              <span>{gananciaTotal < 0 ? 'Pérdida' : 'Ganancia'} L. {formatearMoneda(Math.abs(gananciaTotal))}</span>
              <span>{formatearPorcentaje(margenTotal)}</span>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// Ganancia en lempiras (sin ISV); en rojo y con signo menos si es pérdida
function Ganancia({ valor }: { valor: number }) {
  return (
    <span className={`block font-mono text-sm font-semibold ${valor < 0 ? 'text-red-700' : 'text-marca'}`}>
      {valor < 0 ? '-' : ''}L. {formatearMoneda(Math.abs(valor))}
    </span>
  )
}
