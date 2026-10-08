'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { crearCompra, type ItemCompra } from './actions'
import { crearProductoRapido } from '../productos/actions'
import { formatearMoneda } from '@/lib/formato'

type Producto = { id: string; descripcion: string; precio_unitario: number | null; serie: string | null }
type Proveedor = { id: string; nombre: string }

type Fila = {
  productoId: string
  serie: string
  cantidad: string
  costoIngresado: string
  sinIsv: boolean
  tasaIsv: string
  margenPorcentaje: string
  precioVenta: string
  creandoProducto: boolean
  nuevoNombre: string
  nuevaSerie: string
  nuevoTipo: string
  nuevoTasaIsv: string
  creandoAhora: boolean
}

function filaVacia(): Fila {
  return {
    productoId: '',
    serie: '',
    cantidad: '1',
    costoIngresado: '',
    sinIsv: false,
    tasaIsv: '15',
    margenPorcentaje: '30',
    precioVenta: '',
    creandoProducto: false,
    nuevoNombre: '',
    nuevaSerie: '',
    nuevoTipo: 'producto',
    nuevoTasaIsv: '15',
    creandoAhora: false,
  }
}

function calcularCostoConImpuesto(fila: Fila) {
  const costo = parseFloat(fila.costoIngresado) || 0
  if (fila.tasaIsv === '0') return costo
  return fila.sinIsv ? costo * (1 + parseFloat(fila.tasaIsv) / 100) : costo
}

function calcularBaseGravada(fila: Fila) {
  const costo = parseFloat(fila.costoIngresado) || 0
  if (fila.tasaIsv === '0') return costo
  const tasa = parseFloat(fila.tasaIsv) / 100
  return fila.sinIsv ? costo : costo / (1 + tasa)
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
  const [fecha, setFecha] = useState(() => new Date().toISOString().split('T')[0])
  const [filas, setFilas] = useState<Fila[]>([filaVacia()])
  const [guardando, setGuardando] = useState(false)
  const router = useRouter()

  function precioActualDe(productoId: string) {
    return listaProductos.find((p) => p.id === productoId)?.precio_unitario
  }

  function actualizarFila(index: number, cambios: Partial<Fila>) {
    setFilas((prev) => prev.map((fila, i) => (i === index ? { ...fila, ...cambios } : fila)))
  }

  function recalcular(index: number, cambios: Partial<Fila>) {
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
      actualizarFila(index, { productoId: '', creandoProducto: true, serie: '' })
      return
    }
    const producto = listaProductos.find((p) => p.id === valor)
    actualizarFila(index, { productoId: valor, creandoProducto: false, serie: producto?.serie || '' })
  }

  async function crearProductoEnLinea(index: number) {
    const fila = filas[index]
    if (!fila.nuevoNombre.trim()) return

    actualizarFila(index, { creandoAhora: true })

    const formData = new FormData()
    formData.set('descripcion', fila.nuevoNombre)
    formData.set('serie', fila.nuevaSerie)
    formData.set('tipo', fila.nuevoTipo)
    formData.set('tasa_isv', fila.nuevoTasaIsv)

    const resultado = await crearProductoRapido(formData)

    if (resultado?.producto) {
      setListaProductos((prev) => [
        ...prev,
        {
          id: resultado.producto.id,
          descripcion: resultado.producto.descripcion,
          precio_unitario: resultado.producto.precio_unitario,
          serie: resultado.producto.serie,
        },
      ])
      actualizarFila(index, {
        productoId: resultado.producto.id,
        serie: resultado.producto.serie || '',
        creandoProducto: false,
        creandoAhora: false,
      })
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
        baseGravada: calcularBaseGravada(f),
        tasaIsv: parseFloat(f.tasaIsv),
        precioVenta: parseFloat(f.precioVenta) || 0,
        serie: f.serie,
      }))

    await crearCompra(proveedorId, items, numeroFactura, fecha)

    setGuardando(false)
    setProveedorId('')
    setNumeroFactura('')
    setFecha(new Date().toISOString().split('T')[0])
    setFilas([filaVacia()])
    router.refresh()
  }

  return (
    <div className="mb-8 rounded-lg bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-4 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
        <select
          value={proveedorId}
          onChange={(e) => setProveedorId(e.target.value)}
          className="w-full rounded border px-3 py-2 text-sm"
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
        <div>
          <label className="mb-1 block text-xs text-gray-500">Fecha de la factura del proveedor</label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="space-y-3">
        {filas.map((fila, index) => (
          <div key={index} className="border-b pb-4">
            {fila.creandoProducto ? (
              <div className="grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-3 sm:grid-cols-12 sm:items-end sm:gap-2">
                <div className="col-span-2 sm:col-span-4">
                  <label className="mb-1 block text-xs text-gray-500">Nombre del producto nuevo</label>
                  <input
                    value={fila.nuevoNombre}
                    onChange={(e) => actualizarFila(index, { nuevoNombre: e.target.value })}
                    className="w-full rounded border px-2 py-2 text-sm"
                    placeholder="Ej: Gabinete 12U"
                  />
                </div>
                <div className="col-span-2 sm:col-span-2">
                  <label className="mb-1 block text-xs text-gray-500">Serie (opcional)</label>
                  <input
                    value={fila.nuevaSerie}
                    onChange={(e) => actualizarFila(index, { nuevaSerie: e.target.value })}
                    className="w-full rounded border px-2 py-2 font-mono text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs text-gray-500">Tipo</label>
                  <select
                    value={fila.nuevoTipo}
                    onChange={(e) => actualizarFila(index, { nuevoTipo: e.target.value })}
                    className="w-full rounded border px-2 py-2 text-sm"
                  >
                    <option value="producto">Producto</option>
                    <option value="servicio">Servicio</option>
                  </select>
                </div>
                <div className="sm:col-span-1">
                  <label className="mb-1 block text-xs text-gray-500">ISV</label>
                  <select
                    value={fila.nuevoTasaIsv}
                    onChange={(e) => actualizarFila(index, { nuevoTasaIsv: e.target.value })}
                    className="w-full rounded border px-2 py-2 text-sm"
                  >
                    <option value="15">15%</option>
                    <option value="18">18%</option>
                    <option value="0">Exento</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={() => crearProductoEnLinea(index)}
                    disabled={fila.creandoAhora}
                    className="w-full rounded bg-[#0E7C86] px-3 py-2 text-sm text-white hover:bg-[#0c6971] disabled:opacity-50"
                  >
                    {fila.creandoAhora ? 'Creando...' : 'Crear'}
                  </button>
                </div>
                <div className="col-span-2 flex justify-end sm:col-span-1 sm:block">
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
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-gray-200 p-3 sm:grid-cols-12 sm:items-end sm:gap-2 sm:rounded-none sm:border-0 sm:p-0">
                <div className="col-span-2 sm:col-span-3">
                  <label className="mb-1 block text-xs text-gray-500">Producto</label>
                  <select
                    value={fila.productoId}
                    onChange={(e) => seleccionarProducto(index, e.target.value)}
                    className="w-full rounded border px-2 py-2 text-sm"
                  >
                    <option value="">-- Elegir --</option>
                    <option value="__nuevo__">+ Crear nuevo producto...</option>
                    {listaProductos.map((p) => (
                      <option key={p.id} value={p.id}>{p.descripcion}</option>
                    ))}
                  </select>
                  {fila.productoId && (
                    <input
                      value={fila.serie}
                      onChange={(e) => actualizarFila(index, { serie: e.target.value })}
                      placeholder="Serie (opcional)"
                      className="mt-1 w-full rounded border px-2 py-1.5 font-mono text-xs"
                    />
                  )}
                </div>

                <div className="sm:col-span-1">
                  <label className="mb-1 block text-xs text-gray-500">Cant.</label>
                  <input
                    type="number" step="0.01"
                    value={fila.cantidad}
                    onChange={(e) => actualizarFila(index, { cantidad: e.target.value })}
                    className="w-full rounded border px-2 py-2 text-sm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs text-gray-500">Costo ingresado</label>
                  <input
                    type="number" step="0.01"
                    value={fila.costoIngresado}
                    onChange={(e) => recalcular(index, { costoIngresado: e.target.value })}
                    className="w-full rounded border px-2 py-2 text-sm"
                  />
                </div>

                <div className="sm:col-span-1">
                  <label className="mb-1 block text-xs text-gray-500">ISV</label>
                  <select
                    value={fila.tasaIsv}
                    onChange={(e) => recalcular(index, { tasaIsv: e.target.value })}
                    className="w-full rounded border px-2 py-2 text-sm"
                  >
                    <option value="15">15%</option>
                    <option value="18">18%</option>
                    <option value="0">Exento</option>
                  </select>
                </div>

                {fila.tasaIsv !== '0' && (
                  <div className="flex items-center gap-1 pb-1 sm:col-span-1 sm:pb-1.5">
                    <input
                      type="checkbox"
                      checked={fila.sinIsv}
                      onChange={(e) => recalcular(index, { sinIsv: e.target.checked })}
                      id={`sinisv-${index}`}
                    />
                    <label htmlFor={`sinisv-${index}`} className="text-xs text-gray-500">Costo sin ISV</label>
                  </div>
                )}

                <div className="text-xs text-gray-500 sm:col-span-1">
                  <label className="mb-1 block">Costo c/ISV</label>
                  <div className="rounded bg-gray-50 px-2 py-2">{formatearMoneda(calcularCostoConImpuesto(fila))}</div>
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs text-gray-500">Margen %</label>
                  <input
                    type="number" step="0.01"
                    value={fila.margenPorcentaje}
                    onChange={(e) => handleMargenChange(index, e.target.value)}
                    className="w-full rounded border px-2 py-2 text-sm"
                  />
                </div>

                <div className="sm:col-span-1">
                  <label className="mb-1 block text-xs text-gray-500">Precio venta</label>
                  <input
                    type="number" step="0.01"
                    value={fila.precioVenta}
                    onChange={(e) => handlePrecioChange(index, e.target.value)}
                    className="w-full rounded border px-2 py-2 text-sm"
                  />
                  {fila.productoId && (
                    <p className="mt-1 text-[10px] leading-tight text-gray-500">
                      Actual: L. {formatearMoneda(precioActualDe(fila.productoId))}
                    </p>
                  )}
                </div>

                <div className="col-span-2 flex justify-end sm:col-span-1 sm:block">
                  <button type="button" onClick={() => quitarFila(index)} className="text-xs text-red-500 hover:underline">
                    Quitar
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
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