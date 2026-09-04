'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { crearOrden } from './actions'

type Cliente = { id: string; nombre: string }

export default function NuevaOrdenForm({ clientes }: { clientes: Cliente[] }) {
  const [clienteId, setClienteId] = useState('')
  const [titulo, setTitulo] = useState('')
  const [prioridad, setPrioridad] = useState('media')
  const [fechaCompromiso, setFechaCompromiso] = useState('')
  const [notas, setNotas] = useState('')
  const [items, setItems] = useState([''])
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  function actualizarItem(index: number, valor: string) {
    setItems((prev) => prev.map((it, i) => (i === index ? valor : it)))
  }

  function agregarItem() {
    setItems((prev) => [...prev, ''])
  }

  function quitarItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  async function guardar() {
    setError('')
    if (!titulo.trim()) return setError('Ponle un nombre de referencia a la hoja (ej: nombre del cliente o de la visita).')

    const itemsValidos = items.filter((i) => i.trim())
    if (itemsValidos.length === 0) return setError('Agrega al menos una petición o pendiente.')

    setGuardando(true)
    const resultado = await crearOrden(clienteId, titulo, prioridad, fechaCompromiso, notas, itemsValidos)
    setGuardando(false)

    if (resultado?.error) return setError(resultado.error)

    setClienteId('')
    setTitulo('')
    setPrioridad('media')
    setFechaCompromiso('')
    setNotas('')
    setItems([''])
    router.refresh()
  }

  return (
    <div className="mb-6 rounded-lg bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-gray-500">Referencia de la hoja</label>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej: Visita Cliente Fulano - zona 1" className="w-full rounded border px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Cliente (opcional)</label>
          <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="w-full rounded border px-3 py-2 text-sm">
            <option value="">-- Sin cliente específico --</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Prioridad</label>
          <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)} className="w-full rounded border px-3 py-2 text-sm">
            <option value="baja">Baja</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Fecha compromiso (opcional)</label>
          <input type="date" value={fechaCompromiso} onChange={(e) => setFechaCompromiso(e.target.value)} className="w-full rounded border px-3 py-2 text-sm" />
        </div>
      </div>

      <label className="mb-1 block text-xs text-gray-500">Peticiones / pendientes</label>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex gap-2">
            <input
              value={item}
              onChange={(e) => actualizarItem(index, e.target.value)}
              placeholder="Ej: Instalar tomacorriente en oficina"
              className="w-full rounded border px-3 py-2 text-sm"
            />
            {items.length > 1 && (
              <button type="button" onClick={() => quitarItem(index)} className="text-xs text-red-500 hover:underline">Quitar</button>
            )}
          </div>
        ))}
      </div>
      <button type="button" onClick={agregarItem} className="mt-2 rounded border px-3 py-1.5 text-xs hover:bg-gray-50">
        + Agregar otra petición
      </button>

      <div className="mt-3">
        <label className="mb-1 block text-xs text-gray-500">Notas generales (opcional)</label>
        <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} className="w-full rounded border px-3 py-2 text-sm" />
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <button type="button" onClick={guardar} disabled={guardando} className="mt-4 w-full rounded bg-[#0E7C86] px-4 py-2 text-sm text-white hover:bg-[#0c6971] disabled:opacity-50 sm:w-auto">
        {guardando ? 'Guardando...' : 'Crear hoja de requerimiento'}
      </button>
    </div>
  )
}