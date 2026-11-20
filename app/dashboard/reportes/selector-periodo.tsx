'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { estiloBoton, estiloInput } from '@/lib/estilos'

type Opcion = { valor: string; etiqueta: string }

// Elegir el período: mes anterior / mes actual (un clic), cualquier otro mes,
// un año completo (para la declaración de renta) o un rango de fechas libre.
export default function SelectorPeriodo({
  tipo,
  mesSeleccionado,
  anioSeleccionado,
  desde,
  hasta,
  mesAnterior,
  mesActual,
  mesPorDeclarar,
  meses,
  anios,
}: {
  tipo: 'mes' | 'anio' | 'rango'
  mesSeleccionado: string | null
  anioSeleccionado: string | null
  desde: string
  hasta: string
  mesAnterior: Opcion
  mesActual: Opcion
  mesPorDeclarar: string
  meses: Opcion[]
  anios: Opcion[]
}) {
  const router = useRouter()
  const ir = (query: string) => router.push(`/dashboard/reportes?${query}`)

  const Atajo = ({ opcion, titulo }: { opcion: Opcion; titulo: string }) => {
    const activo = tipo === 'mes' && mesSeleccionado === opcion.valor
    return (
      <Link
        href={`/dashboard/reportes?mes=${opcion.valor}`}
        className={`rounded-lg border px-3 py-2 text-sm ${
          activo ? 'border-acento bg-acento text-white' : 'border-gray-300 bg-white text-marca hover:bg-gray-50'
        }`}
      >
        <span className={`block text-xs ${activo ? 'text-white/80' : 'text-gray-400'}`}>{titulo}</span>
        <span className="font-semibold">{opcion.etiqueta}</span>
        {opcion.valor === mesPorDeclarar && (
          <span
            className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
              activo ? 'bg-white/20 text-white' : 'bg-red-50 text-red-700'
            }`}
          >
            Por declarar
          </span>
        )}
      </Link>
    )
  }

  return (
    <div className="mb-6 space-y-3 rounded-lg bg-white p-4 shadow-sm print:hidden">
      <div className="flex flex-wrap items-end gap-2">
        <Atajo opcion={mesAnterior} titulo="Mes anterior" />
        <Atajo opcion={mesActual} titulo="Mes actual" />

        <div>
          <label className="mb-1 block text-xs text-gray-500">Otro mes</label>
          <select
            value={tipo === 'mes' && mesSeleccionado && ![mesAnterior.valor, mesActual.valor].includes(mesSeleccionado) ? mesSeleccionado : ''}
            onChange={(e) => e.target.value && ir(`mes=${e.target.value}`)}
            className={`${estiloInput} text-sm`}
          >
            <option value="">Elegir mes…</option>
            {meses.map((m) => (
              <option key={m.valor} value={m.valor}>
                {m.etiqueta}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs text-gray-500">Año completo (renta)</label>
          <select
            value={tipo === 'anio' && anioSeleccionado ? anioSeleccionado : ''}
            onChange={(e) => e.target.value && ir(`anio=${e.target.value}`)}
            className={`${estiloInput} text-sm`}
          >
            <option value="">Elegir año…</option>
            {anios.map((a) => (
              <option key={a.valor} value={a.valor}>
                {a.etiqueta}
              </option>
            ))}
          </select>
        </div>
      </div>

      <details open={tipo === 'rango'} className="text-sm">
        <summary className="cursor-pointer text-gray-500">Rango de fechas personalizado</summary>
        <form method="get" action="/dashboard/reportes" className="mt-2 flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-gray-500">Desde</label>
            <input type="date" name="desde" defaultValue={desde} className={`${estiloInput} text-sm`} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Hasta</label>
            <input type="date" name="hasta" defaultValue={hasta} className={`${estiloInput} text-sm`} />
          </div>
          <button type="submit" className={estiloBoton}>
            Ver rango
          </button>
        </form>
      </details>
    </div>
  )
}
