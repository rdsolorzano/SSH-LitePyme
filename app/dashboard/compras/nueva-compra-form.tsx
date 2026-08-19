'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { crearCompra, type ItemCompra } from './actions'

type Producto = { id: string; descripcion: string }
type Proveedor = { id: string; nombre: string }

type Fila = {
  productoId: string
  cantidad: string
  costoIngresado: string
  sinIsv: boolean
  margenPorcentaje: string
  precioVenta: string
}

function filaVacia(): Fila {
  return {
    productoId: '',
    cantidad: '1',
    costoIngresado: '',
    sinIsv: false,
    margenPorcentaje: '30',
    precioVenta: '',
  }
}

function calcularCostoConImpuesto(fila: Fila) {
  const costo = parseFloat(fila.costoIngresado) || 0
  return fila.sinIsv ? costo * 1.15 : costo
}

export default function NuevaCompraForm({
  productos,
  proveedores,
}: {
  productos: Producto[]
  proveedores: Proveedor[]
}) {
  const [proveedorId, setProveedorId] = useState('')
  const [filas, setFilas] = useState<Fila[]>([filaVacia()])
  const [guardando, setGuardando] = useState(false)
  const router = useRouter()

  function actualizarFila(index: number, cambios: Partial<Fila>) {
    setFilas((prev) =>
      prev.map((fila, i) => (i === index ? { ...fila, ...cambios } : fila))
    )
  }

  // Cuando cambia el costo o el checkbox de ISV, mantenemos el % de margen
  // y recalculamos el precio de venta con el nuevo costo.
  function handleCostoOISV(index: number, cambios: Partial<Fila>) {
    setFilas((prev) =>
      prev.map((fila, i) => {
        if (i !== index) return fila
        const nuevaFila = { ...fila, ...cambios }
        const costoConImpuesto = calcularCostoConImpuesto(nuevaFila)
        const margen = parseFloat(nuevaFila.margenPorcentaje) || 0
        nuevaFila.precioVenta = (costoConImpuesto * (1 + margen / 100)).toFixed(2)
        return nuevaFila
      })
    )
  }

  // El usuario escribe el % -> recalculamos el precio de venta
  function handleMargenChange(index: number, valor: string) {
    setFilas((prev) =>
      prev.map((fila, i) => {
        if (i !== index) return fila
        const costoConImpuesto = calcularCostoConImpuesto(fila)
        const margen = parseFloat(valor) || 0
        const precio = (costoConImpuesto * (1 + margen / 100)).toFixed(2)
        return { ...fila, margenPorcentaje: valor, precioVenta: precio }
      })
    )
  }

  // El usuario escribe el precio final -> recalculamos el %
  function handlePrecioChange(index: number, valor: string) {
    setFilas((prev) =>
      prev.map((fila, i) => {
        if (i !== index) return fila
        const costoConImpuesto = calcularCostoConImpuesto(fila)
        const precio = parseFloat(valor) || 0
        const margen =
          costoConImpuesto > 0
            ? (((precio - costoConImpuesto) / costoConImpuesto) * 100).toFixed(2)
            : '0'
        return { ...fila, precioVenta: valor, margenPorcentaje: margen }
      })
    )
  }

  function agregarFila() {
    setFilas((prev) => [...prev, filaVacia()])
  }

  function quitarFila(index: number) {
    setFilas((prev) => prev.filter((_, i) => i !== index))
  }

  async function guardar() {
    if (!proveedorId || filas.length === 0) return
    setGuardando(true)

    const items: ItemCompra[] = filas
      .filter((f) => f.productoId && parseFloat(f.cantidad) > 0)
      .map((f) => ({
        productoId: f.productoId,
        cantidad: parseFloat(f.cantidad),
        costoUnitario: calcularCostoConImpuesto(f),
        precioVenta: parseFloat(f.precioVenta) || 0,
      }))

    await crearCompra(proveedorId, items)

    setGuardando(false)
    setProveedorId('')
    setFilas([filaVacia()])
    router.refresh()
  }

  return (
    <div className="mb-8 rounded-lg bg-white p-6 shadow">
      <select
        value={proveedorId}
        onChange={(e) => setProveedorId(e.target.value)}
        className="mb-4 w-full max-w-sm rounded border px-3 py-2"
      >
        <option value="">-- Selecciona proveedor --</option>
        {proveedores.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nombre}
          </option>
        ))}
      </select>

      <div className="space-y-4">
        {filas.map((fila, index) => (
          <div key={index} className="grid grid-cols-12 items-end gap-2 border-b pb-4">
            <div className="col-span-3">
              <label className="mb-1 block text-xs text-gray-500">Producto</label>
              <select
                value={fila.productoId}
                onChange={(e) => actualizarFila(index, { productoId: e.target.value })}
                className="w-full rounded border px-2 py-1.5 text-sm"
              >
                <option value="">-- Elegir --</option>
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.descripcion}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-1">
              <label className="mb-1 block text-xs text-gray-500">Cant.</label>
              <input
                type="number"
                step="0.01"
                value={fila.cantidad}
                onChange={(e) => actualizarFila(index, { cantidad: e.target.value })}
                className="w-full rounded border px-2 py-1.5 text-sm"
              />
            </div>

            <div className="col-span-2">
              <label className="mb-1 block text-xs text-gray-500">Costo ingresado</label>
              <input
                type="number"
                step="0.01"
                value={fila.costoIngresado}
                onChange={(e) => handleCostoOISV(index, { costoIngresado: e.target.value })}
                className="w-full rounded border px-2 py-1.5 text-sm"
              />
            </div>

            <div className="col-span-1 flex items-center gap-1 pb-1.5">
              <input
                type="checkbox"
                checked={fila.sinIsv}
                onChange={(e) => handleCostoOISV(index, { sinIsv: e.target.checked })}
                id={`sinisv-${index}`}
              />
              <label htmlFor={`sinisv-${index}`} className="text-xs text-gray-500">
                +15% ISV
              </label>
            </div>

            <div className="col-span-1 text-xs text-gray-500">
              <label className="mb-1 block">Costo c/ISV</label>
              <div className="rounded bg-gray-50 px-2 py-1.5">
                {calcularCostoConImpuesto(fila).toFixed(2)}
              </div>
            </div>

            <div className="col-span-2">
              <label className="mb-1 block text-xs text-gray-500">Margen %</label>
              <input
                type="number"
                step="0.01"
                value={fila.margenPorcentaje}
                onChange={(e) => handleMargenChange(index, e.target.value)}
                className="w-full rounded border px-2 py-1.5 text-sm"
              />
            </div>

            <div className="col-span-1">
              <label className="mb-1 block text-xs text-gray-500">Precio venta</label>
              <input
                type="number"
                step="0.01"
                value={fila.precioVenta}
                onChange={(e) => handlePrecioChange(index, e.target.value)}
                className="w-full rounded border px-2 py-1.5 text-sm"
              />
            </div>

            <div className="col-span-1">
              <button
                type="button"
                onClick={() => quitarFila(index)}
                className="text-xs text-red-500 hover:underline"
              >
                Quitar
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={agregarFila}
          className="rounded border px-4 py-2 text-sm hover:bg-gray-50"
        >
          + Agregar línea
        </button>
        <button
          type="button"
          onClick={guardar}
          disabled={guardando || !proveedorId}
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {guardando ? 'Guardando...' : 'Guardar compra'}
        </button>
      </div>
    </div>
  )
}