'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { guardarParametrosCosteo } from './actions'
import { estiloBoton, estiloInput } from '@/lib/estilos'
import { formatearMoneda } from '@/lib/formato'
import { costoIndirectoHora } from '@/lib/costeo'

export type ParametrosGuardados = {
  gastos_fijos_mensuales: number
  horas_facturables_mes: number
  tarifa_hora: number
  costo_km: number
  pct_consumibles: number
  pct_imprevistos: number
  margen_objetivo: number
}

// Valores de costeo de la empresa. Son estimados tuyos, escritos a mano:
// no salen del módulo de Gastos ni aparecen en ningún reporte fiscal.
export default function ParametrosCosteo({ parametros }: { parametros: ParametrosGuardados | null }) {
  const [gastosFijos, setGastosFijos] = useState(String(parametros?.gastos_fijos_mensuales ?? ''))
  const [horas, setHoras] = useState(String(parametros?.horas_facturables_mes ?? ''))
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const router = useRouter()

  const indirecto = costoIndirectoHora(Number(gastosFijos) || 0, Number(horas) || 0)

  async function handleGuardar(formData: FormData) {
    setGuardando(true)
    const resultado = await guardarParametrosCosteo(formData)
    setGuardando(false)
    setMensaje(resultado?.error ? resultado.error : 'Parámetros guardados.')
    router.refresh()
    setTimeout(() => setMensaje(''), 4000)
  }

  const campo = (name: keyof ParametrosGuardados, etiqueta: string, ayuda: string, porDefecto: number | '' = '') => (
    <div>
      <label className="mb-1 block text-xs text-gray-500">{etiqueta}</label>
      <input
        name={name}
        type="number"
        min="0"
        step="any"
        defaultValue={parametros?.[name] ?? porDefecto}
        className={`${estiloInput} w-full font-mono text-sm`}
      />
      <p className="mt-0.5 text-xs text-gray-400">{ayuda}</p>
    </div>
  )

  return (
    <form action={handleGuardar} className="max-w-xl space-y-4 rounded-lg bg-white p-6 shadow-sm">
      <div>
        <h2 className="font-semibold text-marca">Costeo de cotizaciones</h2>
        <p className="mt-1 text-xs text-gray-500">
          Valores aproximados para calcular cuánto te cuesta un trabajo. Son solo para cotizar: no se toman del
          módulo de Gastos ni salen en reportes fiscales.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-gray-500">Gastos fijos mensuales (L.)</label>
          <input
            name="gastos_fijos_mensuales"
            type="number"
            min="0"
            step="any"
            value={gastosFijos}
            onChange={(e) => setGastosFijos(e.target.value)}
            className={`${estiloInput} w-full font-mono text-sm`}
          />
          <p className="mt-0.5 text-xs text-gray-400">Alquiler, luz, internet, teléfono, contador, vehículo, herramientas…</p>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Horas facturables al mes</label>
          <input
            name="horas_facturables_mes"
            type="number"
            min="0"
            step="any"
            value={horas}
            onChange={(e) => setHoras(e.target.value)}
            className={`${estiloInput} w-full font-mono text-sm`}
          />
          <p className="mt-0.5 text-xs text-gray-400">Las que realmente cobras; suelen ser 60–70 % de las trabajadas.</p>
        </div>
      </div>

      <div className="rounded-lg bg-acento/10 px-4 py-3 text-sm">
        Cada hora de trabajo debe absorber{' '}
        <strong className="font-mono text-marca">L. {formatearMoneda(indirecto)}</strong> de gastos fijos.
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {campo('tarifa_hora', 'Costo por hora de técnico (L.)', 'Salario + 13.º y 14.º mes, IHSS, RAP y vacaciones, entre horas trabajadas.')}
        {campo('costo_km', 'Costo por kilómetro (L.)', 'Combustible + desgaste del vehículo.')}
        {campo('pct_consumibles', 'Consumibles (% sobre materiales)', 'Cinta, tornillos, conectores, bridas…', 5)}
        {campo('pct_imprevistos', 'Imprevistos (% sobre el costo)', 'Visitas de regreso, piezas que fallan, retrasos.', 5)}
        {campo('margen_objetivo', 'Margen objetivo (% del precio)', 'Lo que quieres ganar sobre el precio sin ISV. Menor que 100.', 25)}
      </div>

      {mensaje && <p className="text-sm text-acento">{mensaje}</p>}

      <button type="submit" disabled={guardando} className={estiloBoton}>
        {guardando ? 'Guardando...' : 'Guardar parámetros'}
      </button>
    </form>
  )
}
