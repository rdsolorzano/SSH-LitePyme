'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { crearFactura, type ItemFactura } from './actions'
import { formatearMoneda } from '@/lib/formato'

type Producto = { id: string; descripcion: string; precio_unitario: number; tasa_isv: number }
type Cliente = { id: string; nombre: string }
type CaiRango = { id: string; cai: string; punto_emision: string | null }

type Fila = {
  productoId: string
  cantidad: string
  precioUnitario: string
  tasaIsv: string
}

function filaVacia(): Fila {
  return { productoId: '', cantidad: '1', precioUnitario: '0', tasaIsv: '15' }
}

export default function NuevaFacturaForm({
  productos,
  clientes,
  caiRangos,
}: {
  productos: Producto[]
  clientes: Cliente[]
  caiRangos: CaiRango[]
}) {
  const [clienteId, setClienteId] = useState('')
  const [caiRangoId, setCaiRangoId] = useState(caiRangos[0]?.id || '')
  const [filas, setFilas] = useState<Fila[]>([filaVacia()])
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  function actualizarFila(index: number, cambios: Partial<Fila>) {
    setFilas((prev) => prev.map((f, i) => (i === index ? { ...f, ...cambios } : f)))
  }

  function seleccionarProducto(index: number, productoId: string) {
    const producto = productos.find((p) => p.id === productoId)
    if (!producto) return actualizarFila(index, { productoId: '' })
    actualizarFila(index, {
      productoId,
      precioUnitario: String(producto.precio_unitario),
      tasaIsv: String(producto.tasa_isv),
    })
  }

  function agregarFila() {
    setFilas((prev) => [...prev, filaVacia()])
  }

  function quitarFila(index: number) {
    setFilas((prev) => prev.filter((_, i) => i !== index))
  }

  const gravado15 = filas.filter((f) => f.tasaIsv === '15')
    .reduce((acc, f) => acc + (parseFloat(f.precioUnitario) || 0) * (parseFloat(f.cantidad) || 0), 0)
  const gravado18 = filas.filter((f) => f.tasaIsv === '18')
    .reduce((acc, f) => acc + (parseFloat(f.precioUnitario) || 0) * (parseFloat(f.cantidad) || 0), 0)
  const exento = filas.filter((f) => f.tasaIsv === '0')
    .reduce((acc, f) => acc + (parseFloat(f.precioUnitario) || 0) * (parseFloat(f.cantidad) || 0), 0)
  const isv15 = gravado15 * 0.15
  const isv18 = gravado18 * 0.18
  const total = gravado15 + gravado18 + exento + isv15 + isv18

  async function guardar() {
    setError('')
    if (!clienteId) return setError('Selecciona un cliente.')
    if (!caiRangoId) return setError('No hay un rango CAI configurado.')

    const items: ItemFactura[] = filas
      .filter((f) => f.productoId && parseFloat(f.cantidad) > 0)
      .map((f) => ({
        productoId: f.productoId,
        cantidad: parseFloat(f.cantidad),
        precioUnitario: parseFloat(f.precioUnitario) || 0,
        tasaIsv: parseFloat(f.tasaIsv),
      }))

    if (items.length === 0) return setError('Agrega al menos un producto o servicio.')

    setGuardando(true)
    const resultado = await crearFactura(clienteId, caiRangoId, items)
    setGuardando(false)

    if (resultado?.error) return setError(resultado.error)
    if (resultado?.facturaId) router.push(`/dashboard/facturas/${resultado.facturaId}`)
  }

  return (
    <div className="mb-8 rounded-lg bg-white p-6 shadow">
      <div className="mb-4 grid max-w-2xl grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-gray-500">Cliente</label>
          <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="w-full rounded border px-3 py-2 text-sm">
            <option value="">-- Selecciona cliente --</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">CAI</label>
          <select value={caiRangoId} onChange={(e) => setCaiRangoId(e.target.value)} className="w-full rounded border px-3 py-2 text-sm">
            {caiRangos.length === 0 && <option value="">-- Sin CAI configurado --</option>}
            {caiRangos.map((c) => <option key={c.id} value={c.id}>{c.cai}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {filas.map((fila, index) => (
          <div key={index} className="grid grid-cols-12 items-end gap-2 border-b pb-3">
            <div className="col-span-4">
              <label className="mb-1 block text-xs text-gray-500">Producto/Servicio</label>
              <select value={fila.productoId} onChange={(e) => seleccionarProducto(index, e.target.value)} className="w-full rounded border px-2 py-1.5 text-sm">
                <option value="">-- Elegir --</option>
                {productos.map((p) => <option key={p.id} value={p.id}>{p.descripcion}</option>)}
              </select>
            </div>
            <div className="col-span-1">
              <label className="mb-1 block text-xs text-gray-500">Cant.</label>
              <input type="number" step="0.01" value={fila.cantidad} onChange={(e) => actualizarFila(index, { cantidad: e.target.value })} className="w-full rounded border px-2 py-1.5 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-gray-500">Precio unit.</label>
              <input type="number" step="0.01" value={fila.precioUnitario} onChange={(e) => actualizarFila(index, { precioUnitario: e.target.value })} className="w-full rounded border px-2 py-1.5 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-gray-500">ISV</label>
              <select value={fila.tasaIsv} onChange={(e) => actualizarFila(index, { tasaIsv: e.target.value })} className="w-full rounded border px-2 py-1.5 text-sm">
                <option value="15">15%</option>
                <option value="18">18%</option>
                <option value="0">Exento</option>
              </select>
            </div>
            <div className="col-span-2 text-xs text-gray-500">
              <label className="mb-1 block">Subtotal</label>
              <div className="rounded bg-gray-50 px-2 py-1.5">
                {formatearMoneda((parseFloat(fila.precioUnitario) || 0) * (parseFloat(fila.cantidad) || 0))}
              </div>
            </div>
            <div className="col-span-1">
              <button type="button" onClick={() => quitarFila(index)} className="text-xs text-red-500 hover:underline">Quitar</button>
            </div>
          </div>
        ))}
      </div>

      <button type="button" onClick={agregarFila} className="mt-3 rounded border px-4 py-2 text-sm hover:bg-gray-50">
        + Agregar línea
      </button>

      <div className="mt-6 ml-auto max-w-xs space-y-1 text-sm">
        <div className="flex justify-between"><span>Gravado 15%</span><span>L. {formatearMoneda(gravado15)}</span></div>
        <div className="flex justify-between"><span>Gravado 18%</span><span>L. {formatearMoneda(gravado18)}</span></div>
        <div className="flex justify-between"><span>Exento</span><span>L. {formatearMoneda(exento)}</span></div>
        <div className="flex justify-between"><span>ISV 15%</span><span>L. {formatearMoneda(isv15)}</span></div>
        <div className="flex justify-between"><span>ISV 18%</span><span>L. {formatearMoneda(isv18)}</span></div>
        <div className="flex justify-between border-t pt-1 font-bold"><span>Total</span><span>L. {formatearMoneda(total)}</span></div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <button type="button" onClick={guardar} disabled={guardando} className="mt-4 rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
        {guardando ? 'Emitiendo...' : 'Emitir factura'}
      </button>
    </div>
  )
}