'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { guardarDeclaracion, quitarDeclaracion } from './actions'
import { estiloBoton, estiloBotonSecundario, estiloInput } from '@/lib/estilos'
import { formatearFecha, formatearMoneda } from '@/lib/formato'

export type Declaracion = {
  fecha_presentacion: string
  numero_constancia: string | null
  monto_calculado: number
  monto_pagado: number
  notas: string | null
}

// Estado de la declaración de ISV del mes: pendiente o declarado, con su registro.
export default function EstadoDeclaracion({
  mes,
  mesTitulo,
  declaracion,
  isvNetoActual,
  montoSugerido,
  limite,
  hoy,
  puedeEditar,
  disponible,
}: {
  mes: string
  mesTitulo: string
  declaracion: Declaracion | null
  isvNetoActual: number // débito − crédito del mes, calculado como el SAR
  montoSugerido: number // "Importe a pagar" del formulario 201
  limite: string
  hoy: string
  puedeEditar: boolean // solo Administrador
  disponible: boolean // false si falta la migración
}) {
  const router = useRouter()
  const [editando, setEditando] = useState(false)
  const [fecha, setFecha] = useState(declaracion?.fecha_presentacion ?? hoy)
  const [constancia, setConstancia] = useState(declaracion?.numero_constancia ?? '')
  const [monto, setMonto] = useState(String(declaracion?.monto_pagado ?? montoSugerido))
  const [notas, setNotas] = useState(declaracion?.notas ?? '')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [confirmarQuitar, setConfirmarQuitar] = useState(false)

  if (!disponible) {
    return (
      <div className="mb-6 rounded-lg bg-gray-50 p-4 text-sm text-gray-500 ring-1 ring-gray-200 print:hidden">
        Para registrar qué meses ya declaraste, ejecuta la migración <span className="font-mono">2026-11-22_declaraciones.sql</span> en Supabase.
      </div>
    )
  }

  const vencido = hoy > limite
  const diferencia = declaracion ? Math.round((isvNetoActual - Number(declaracion.monto_calculado)) * 100) / 100 : 0

  async function guardar() {
    setGuardando(true)
    setError('')
    const r = await guardarDeclaracion({
      mes,
      fechaPresentacion: fecha,
      numeroConstancia: constancia,
      montoPagado: parseFloat(monto) || 0,
      notas,
    })
    setGuardando(false)
    if (r?.error) return setError(r.error)
    setEditando(false)
    router.refresh()
  }

  async function quitar() {
    if (!confirmarQuitar) return setConfirmarQuitar(true)
    setGuardando(true)
    const r = await quitarDeclaracion(mes)
    setGuardando(false)
    setConfirmarQuitar(false)
    if (r?.error) return setError(r.error)
    router.refresh()
  }

  const formulario = (
    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        <label className="mb-1 block text-xs text-gray-500">Fecha en que la presentaste</label>
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={`${estiloInput} w-full text-sm`} />
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray-500">No. de declaración o constancia (opcional)</label>
        <input value={constancia} onChange={(e) => setConstancia(e.target.value)} className={`${estiloInput} w-full font-mono text-sm`} />
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray-500">Monto pagado (L.)</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          className={`${estiloInput} w-full font-mono text-sm`}
        />
        <p className="mt-0.5 text-xs text-gray-400">Importe a pagar según el formulario 201: L. {formatearMoneda(montoSugerido)}.</p>
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray-500">Notas (opcional)</label>
        <input value={notas} onChange={(e) => setNotas(e.target.value)} className={`${estiloInput} w-full text-sm`} />
      </div>
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <button type="button" onClick={guardar} disabled={guardando} className={estiloBoton}>
          {guardando ? 'Guardando...' : declaracion ? 'Guardar cambios' : 'Marcar como declarado'}
        </button>
        <button type="button" onClick={() => setEditando(false)} className={estiloBotonSecundario}>
          Cancelar
        </button>
      </div>
    </div>
  )

  if (declaracion) {
    return (
      <div className="mb-6 rounded-lg bg-green-50 p-4 text-sm ring-1 ring-green-600 print:hidden">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-green-800">✓ {mesTitulo} declarado el {formatearFecha(declaracion.fecha_presentacion)}</p>
            <p className="mt-1 text-green-900">
              Pagado: <span className="font-mono font-semibold">L. {formatearMoneda(declaracion.monto_pagado)}</span>
              {declaracion.numero_constancia && (
                <>
                  {' '}· Constancia <span className="font-mono">{declaracion.numero_constancia}</span>
                </>
              )}
            </p>
            {declaracion.notas && <p className="mt-1 text-green-900">{declaracion.notas}</p>}
          </div>
          {puedeEditar && !editando && (
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditando(true)} className={estiloBotonSecundario}>
                Editar
              </button>
              <button type="button" onClick={quitar} disabled={guardando} className={`${estiloBotonSecundario} text-red-600`}>
                {confirmarQuitar ? '¿Seguro? Quitar marca' : 'Quitar marca'}
              </button>
            </div>
          )}
        </div>
        {Math.abs(diferencia) >= 0.01 && (
          <p className="mt-3 rounded bg-amber-50 p-2 text-amber-800 ring-1 ring-amber-300">
            Los documentos de este mes cambiaron después de declarar: el ISV neto era L.{' '}
            {formatearMoneda(declaracion.monto_calculado)} y ahora es L. {formatearMoneda(isvNetoActual)} (diferencia L.{' '}
            {formatearMoneda(diferencia)}). Revisa con tu contador si hace falta una declaración rectificativa.
          </p>
        )}
        {editando && formulario}
        {error && <p className="mt-2 text-red-600">{error}</p>}
      </div>
    )
  }

  return (
    <div
      className={`mb-6 rounded-lg p-4 text-sm print:hidden ${vencido ? 'bg-red-50 ring-1 ring-red-600' : 'bg-white shadow-sm'}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={`font-semibold ${vencido ? 'text-red-700' : 'text-marca'}`}>
          {vencido ? `${mesTitulo}: sin marcar como declarado (la fecha límite ya pasó)` : `${mesTitulo}: pendiente de declarar`}
        </p>
        {puedeEditar && !editando && (
          <button type="button" onClick={() => setEditando(true)} className={estiloBoton}>
            Marcar como declarado
          </button>
        )}
      </div>
      {!puedeEditar && <p className="mt-1 text-xs text-gray-500">Solo un administrador puede registrar la declaración.</p>}
      {editando && formulario}
      {error && <p className="mt-2 text-red-600">{error}</p>}
    </div>
  )
}
