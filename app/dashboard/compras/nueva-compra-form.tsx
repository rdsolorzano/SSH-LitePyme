'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { crearCompra, type ItemCompra } from './actions'
import { crearProductoRapido } from '../productos/actions'
import { formatearMoneda } from '@/lib/formato'

type Producto = { id: string; descripcion: string }
type Proveedor = { id: string; nombre: string }

type Fila = {
  productoId: string
  cantidad: string
  costoIngresado: string
  sinIsv: boolean
  margenPorcentaje: string
  precioVenta: string
  creandoProducto: boolean
  nuevoNombre: string
  nuevoTipo: string
  nuevoTasaIsv: string
  creandoAhora: boolean
}

function filaVacia(): Fila {
  return {
    productoId: '',
    cantidad: '1',
    costoIngresado: '',
    sinIsv: false,
    margenPorcentaje: '30',
    precioVenta: '',
    creandoProducto: false,
    nuevoNombre: '',
    nuevoTipo: 'producto',
    nuevoTasaIsv: '15',
    creandoAhora: false,
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
  const [listaProductos, setListaProductos] = useState<Producto[]>(productos)
  const [proveedorId, setProveedorId] = useState('')
  const [numeroFactura, setNumeroFactura] = useState('')
  const [filas, setFilas] = useState<Fila[]>([filaVacia()])
  const [guardando, setGuardando] = useState(false)
  const router = useRouter()

  function actualizarFila(index: number, cambios: Partial<Fila>) {
    setFilas((prev) => prev.map((fila, i) => (i === index ? { ...fila, ...cambios } : fila)))
  }

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

  function handlePrecioChange(index: number, valor: string) {
    setFilas((prev) =>
      prev.map((fila, i) => {
        if (i !== index) return fila
        const costoConImpuesto = calcularCostoConImpuesto(fila)
        const precio = parseFloat(valor) || 0
        const margen =
          costoConImpuesto > 0 ? (((precio - costoConImpuesto) / costoConImpuesto) * 100).toFixed(2) : '0'
        return { ...fila, precioVenta: valor, margenPorcentaje: margen }
      })
    )
  }

  function seleccionarProducto(index: number, valor: string) {
    if (valor === '__nuevo__') {
      actualizarFila(index, { productoId: '', creandoProducto: true })
      return
    }
    actualizarFila(index, { productoId: valor, creandoProducto: false })
  }

  async function crearProductoEnLinea(index: number) {
    const fila = filas[index]
    if (!fila.nuevoNombre.trim()) return

    actualizarFila(index, { creandoAhora: true })

    const formData = new FormData()
    formData.set('descripcion', fila.nuevoNombre)
    formData.set('tipo', fila.nuevoTipo)
    formData.set('tasa_isv', fila.nuevoTasaIsv)

    const resultado = await crearProductoRapido(formData)

    if (resultado?.producto) {
      setListaProductos((prev) => [...prev, { id: resultado.producto.id, descripcion: resultado.producto.descripcion }])
      actualizarFila(index, { productoId: resultado.producto.id, creandoProducto: false, creandoAhora: false })
    } else {
      actualizarFila(index, { creandoAhora: false })
    }
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

    await crearCompra(proveedorId, items, numeroFactura)

    setGuardando(false)
    setProveedorId('')
    setNumeroFactura('')
    setFilas([filaVacia()])
    router.refresh()
  }

  return (
    <div className="mb-8 rounded-lg bg-white p-6 shadow-sm">
      <div className="mb-4 flex max-w-xl gap-3">
        <select
          value={proveedorId}
          onChange={(e) => setProveedorId(e.target.value)}
          className="w-full rounded border px-3 py-2"
        >
          <option value="">-- Selecciona proveedor --</option>
          {proveedores.map((p) => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </select>
        <input
          value={numeroFactura}
          onChange={(e) => setNumeroFactura(e.target.value)}
          placeholder="No. Factura del proveedor"
          className="w-full rounded border px-3 py-2 font-mono text-sm"
        />
      </div>

      <div className="space-y-4">
        {filas.map((fila, index) => (
          <div key={index} className="border-b pb-4">
            {fila.creandoProducto ? (
              <div className="grid grid-cols-12 items-end gap-2 rounded bg-gray-50 p-3">
                <div className="col-span-5">
                  <label className="mb-1 block text-xs text-gray-500">Nombre del producto nuevo</label>
                  <input
                    value={fila.nuevoNombre}
                    onChange={(e) => actualizarFila(index, { nuevoNombre: e.target.value })}
                    className="w-full rounded border px-2 py-1.5 text-sm"
                    placeholder="Ej: Gabinete 12U"
                  />
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-xs text-gray-500">Tipo</label>
                  <select
                    value={fila.nuevoTipo}
                    onChange={(e) => actualizarFila(index, { nuevoTipo: e.target.value })}
                    className="w-full rounded border px-2 py-1.5 text-sm"
                  >
                    <option value="producto">Producto</option>
                    <option value="servicio">Servicio</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-xs text-gray-500">ISV</label>
                  <select
                    value={fila.nuevoTasaIsv}
                    onChange={(e) => actualizarFila(index, { nuevoTasaIsv: e.target.value })}
                    className="w-full rounded border px-2 py-1.5 text-sm"
                  >
                    <option value="15">15%</option>
                    <option value="18">18%</option>
                    <option value="0">Exento</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <button
                    type="button"
                    onClick={() => crearProductoEnLinea(index)}
                    disabled={fila.creandoAhora}
                    className="rounded bg-[#0E7C86] px-3 py-1.5 text-sm text-white hover:bg-[#0c6971] disabled:opacity-50"
                  >
                    {fila.creandoAhora ? 'Creando...' : 'Crear'}
                  </button>
                </div>
                <div className="col-span-1">
                  <button
                    type="button"
                    onClick={() => actualizarFila(index, { creandoProducto: false })}
                    className="text-xs text-gray-400 hover:underline"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-12 items-end gap-2">
                <div className="col-span-3">
                  <label className="mb-1 block text-xs text-gray-500">Producto</label>
                  <select
                    value={fila.productoId}
                    onChange={(e) => seleccionarProducto(index, e.target.value)}
                    className="w-full rounded border px-2 py-1.5 text-sm"
                  >
                    <option value="">-- Elegir --</option>
                    <option value="__nuevo__">+ Crear nuevo producto...</option>
                    {listaProductos.map((p) => (
                      <option key={p.id} value={p.id}>{p.descripcion}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-1">
                  <label className="mb-1 block text-xs text-gray-500">Cant.</label>
                  <input
                    type="number" step="0.01"
                    value={fila.cantidad}
                    onChange={(e) => actualizarFila(index, { cantidad: e.target.value })}
                    className="w-full rounded border px-2 py-1.5 text-sm"
                  />
                </div>

                <div className="col-span-2">
                  <label className="mb-1 block text-xs text-gray-500">Costo ingresado</label>
                  <input
                    type="number" step="0.01"
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
                  <label htmlFor={`sinisv-${index}`} className="text-xs text-gray-500">+15% ISV</label>
                </div>

                <div className="col-span-1 text-xs text-gray-500">
                  <label className="mb-1 block">Costo c/ISV</label>
                  <div className="rounded bg-gray-50 px-2 py-1.5">{formatearMoneda(calcularCostoConImpuesto(fila))}</div>
                </div>

                <div className="col-span-2">
                  <label className="mb-1 block text-xs text-gray-500">Margen %</label>
                  <input
                    type="number" step="0.01"
                    value={fila.margenPorcentaje}
                    onChange={(e) => handleMargenChange(index, e.target.value)}
                    className="w-full rounded border px-2 py-1.5 text-sm"
                  />
                </div>

                <div className="col-span-1">
                  <label className="mb-1 block text-xs text-gray-500">Precio venta</label>
                  <input
                    type="number" step="0.01"
                    value={fila.precioVenta}
                    onChange={(e) => handlePrecioChange(index, e.target.value)}
                    className="w-full rounded border px-2 py-1.5 text-sm"
                  />
                </div>

                <div className="col-span-1">
                  <button type="button" onClick={() => quitarFila(index)} className="text-xs text-red-500 hover:underline">
                    Quitar
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-3">
        <button type="button" onClick={agregarFila} className="rounded border px-4 py-2 text-sm hover:bg-gray-50">
          + Agregar línea
        </button>
        <button
          type="button"
          onClick={guardar}
          disabled={guardando || !proveedorId}
          className="rounded bg-[#0E7C86] px-4 py-2 text-sm text-white hover:bg-[#0c6971] disabled:opacity-50"
        >
          {guardando ? 'Guardando...' : 'Guardar compra'}
        </button>
      </div>
    </div>
  )
}