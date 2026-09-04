'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { actualizarOrden, alternarItem } from '../actions'

type Cliente = { id: string; nombre: string }
type Item = { id: string; descripcion: string; completado: boolean }
type Orden = {
  cliente_id: string | null
  titulo: string
  prioridad: string
  fecha_compromiso: string | null
  notas: string | null
}

export default function EditarOrdenForm({
  ordenId,
  orden,
  itemsIniciales,
  clientes,
}: {
  ordenId: string
  orden: Orden
  itemsIniciales: Item[]
  clientes: Cliente[]
}) {
  const [clienteId, setClienteId] = useState(orden.cliente_id || '')
  const [titulo, setTitulo] = useState(orden.titulo)
  const [prioridad, setPrioridad] = useState(orden.prioridad)
  const [fechaCompromiso, setFechaCompromiso] = useState(orden.fecha_compromiso || '')
  const [notas, setNotas] = useState(orden.notas || '')
  const [items, setItems] = useState<{ id?: string; descripcion: string; completado: boolean }[]>(
    itemsIniciales.length > 0 ? itemsIniciales : [{ descripcion: '', completado: false }]
  )
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  function actualizarItem(index: number, cambios: Partial<{ descripcion: string; completado: boolean }>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...cambios } : it)))
  }

  async function alternarYGuardarItem(index: number) {
    const item = items[index]
    const nuevoValor = !item.completado
    actualizarItem(index, { completado: nuevoValor })
    if (item.id) await alternarItem(item.id, nuevoValor)
  }

  function agregarItem() {
    setItems((prev) => [...prev, { descripcion: '', completado: false }])
  }

  function quitarItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  async function guardar() {
    setError('')
    if (!titulo.trim()) return setError('Ponle un nombre de referencia a la hoja.')

    const itemsValidos = items.filter((i) => i.descripcion.trim())
    if (itemsValidos.length === 0) return setError('Agrega al menos una petición.')

    setGuardando(true)
    const resultado = await actualizarOrden(ordenId, clienteId, titulo, prioridad, fechaCompromiso, notas, itemsValidos)
    setGuardando(false)

    if (resultado?.error) return setError(resultado.error)
    router.push('/dashboard/ordenes')
  }

  return (
    <div className="rounded-lg bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-gray-500">Referencia de la hoja</label>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className="w-full rounded border px-3 py-2 text-sm" />
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
          <div key={item.id || index} className="flex items-center gap-2">
            <input type="checkbox" checked={item.completado} onChange={() => alternarYGuardarItem(index)} />
            <input
              value={item.descripcion}
              onChange={(e) => actualizarItem(index, { descripcion: e.target.value })}
              className={`w-full rounded border px-3 py-2 text-sm ${item.completado ? 'text-gray-400 line-through' : ''}`}
            />
            <button type="button" onClick={() => quitarItem(index)} className="text-xs text-red-500 hover:underline">Quitar</button>
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
        {guardando ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </div>
  )
}