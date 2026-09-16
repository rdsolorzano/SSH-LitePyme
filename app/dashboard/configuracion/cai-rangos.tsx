'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { crearCaiRango, actualizarCaiRango, alternarActivoCaiRango } from './actions'

type CaiRango = {
  id: string
  cai: string
  tipo_documento: string
  punto_emision: string | null
  rango_inicial: number
  rango_final: number
  correlativo_actual: number
  fecha_limite_emision: string
  activo: boolean
}

export default function CaiRangos({ caiRangos }: { caiRangos: CaiRango[] }) {
  const [mostrarForm, setMostrarForm] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [editando, setEditando] = useState<string | null>(null)
  const router = useRouter()

  async function handleCrear(formData: FormData) {
    setError('')
    setGuardando(true)
    const resultado = await crearCaiRango(formData)
    setGuardando(false)
    if (resultado?.error) return setError(resultado.error)
    setMostrarForm(false)
    router.refresh()
  }

  async function handleActualizar(id: string, formData: FormData) {
    setGuardando(true)
    await actualizarCaiRango(id, formData)
    setGuardando(false)
    setEditando(null)
    router.refresh()
  }

  async function toggleActivo(id: string, activo: boolean) {
    await alternarActivoCaiRango(id, !activo)
    router.refresh()
  }

  const hoy = new Date().toISOString().split('T')[0]

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-[#1B2430]">CAI y rangos de facturación</h2>
        <button onClick={() => setMostrarForm((v) => !v)} className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50">
          {mostrarForm ? 'Cancelar' : '+ Agregar CAI'}
        </button>
      </div>

      {mostrarForm && (
        <form action={handleCrear} className="mb-6 grid grid-cols-1 gap-3 rounded-lg bg-gray-50 p-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-gray-500">CAI (código completo del SAR)</label>
            <input name="cai" required className="w-full rounded border px-3 py-2 font-mono text-sm" placeholder="0000-0000-0000-0000000000-00" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Punto de emisión</label>
            <input name="punto_emision" required className="w-full rounded border px-3 py-2 font-mono text-sm" placeholder="000-001-01" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Tipo de documento</label>
            <select name="tipo_documento" defaultValue="Factura" className="w-full rounded border px-3 py-2 text-sm">
              <option value="Factura">Factura</option>
              <option value="Nota de Crédito">Nota de Crédito</option>
              <option value="Nota de Débito">Nota de Débito</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Rango inicial</label>
            <input name="rango_inicial" type="number" required className="w-full rounded border px-3 py-2 font-mono text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Rango final</label>
            <input name="rango_final" type="number" required className="w-full rounded border px-3 py-2 font-mono text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Fecha límite de emisión</label>
            <input name="fecha_limite_emision" type="date" required className="w-full rounded border px-3 py-2 text-sm" />
          </div>

          {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}

          <div className="sm:col-span-2">
            <button type="submit" disabled={guardando} className="rounded bg-[#0E7C86] px-4 py-2 text-sm text-white hover:bg-[#0c6971] disabled:opacity-50">
              {guardando ? 'Guardando...' : 'Guardar CAI'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {caiRangos.map((c) => {
          const disponibles = c.rango_final - c.correlativo_actual
          const vencido = c.fecha_limite_emision < hoy
          return (
            <div key={c.id} className={`rounded-lg border p-3 ${!c.activo ? 'opacity-50' : vencido ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
              {editando === c.id ? (
                <form action={(fd) => handleActualizar(c.id, fd)} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <input name="punto_emision" defaultValue={c.punto_emision || ''} className="rounded border px-2 py-1.5 font-mono text-sm" />
                  <input name="fecha_limite_emision" type="date" defaultValue={c.fecha_limite_emision} className="rounded border px-2 py-1.5 text-sm" />
                  <div className="flex gap-2">
                    <button type="submit" disabled={guardando} className="rounded bg-[#0E7C86] px-3 py-1.5 text-xs text-white hover:bg-[#0c6971]">Guardar</button>
                    <button type="button" onClick={() => setEditando(null)} className="rounded border px-3 py-1.5 text-xs hover:bg-gray-50">Cancelar</button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-mono text-sm text-[#1B2430]">{c.cai}</p>
                    <p className="text-xs text-gray-500">
                      {c.tipo_documento} · Punto emisión: {c.punto_emision} · Rango: {c.rango_inicial}-{c.rango_final}
                    </p>
                    <p className={`text-xs ${vencido ? 'font-medium text-red-600' : 'text-gray-500'}`}>
                      Disponibles: {disponibles} · Vence: {c.fecha_limite_emision} {vencido && '(VENCIDO)'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setEditando(c.id)} className="text-xs text-[#0E7C86] hover:underline">Editar</button>
                    <button onClick={() => toggleActivo(c.id, c.activo)} className="text-xs text-gray-500 hover:underline">
                      {c.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {caiRangos.length === 0 && <p className="text-sm text-gray-400">Todavía no has agregado ningún CAI.</p>}
      </div>
    </div>
  )
}