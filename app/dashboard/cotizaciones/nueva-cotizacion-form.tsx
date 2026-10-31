'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { crearCotizacion, type ItemCotizacion } from './actions'
import { formatearMoneda } from '@/lib/formato'
import CampoNumerico from '@/app/campo-numerico'
import BloqueExoneracion from '@/app/dashboard/bloque-exoneracion'
import { calcularTotales, exoneracionVacia, type DatosExoneracion } from '@/lib/exoneracion'
import { estiloBoton, estiloInput } from '@/lib/estilos'

type Producto = { id: string; descripcion: string; precio_unitario: number; tasa_isv: number }
type Cliente = { id: string; nombre: string; exonerado?: boolean | null; no_constancia_exonerado?: string | null; no_registro_sag?: string | null }

type Fila = { productoId: string; descripcion: string; cantidad: string; precioUnitario: string; tasaIsv: string }

function filaVacia(): Fila {
  return { productoId: '', descripcion: '', cantidad: '1', precioUnitario: '0', tasaIsv: '15' }
}

export default function NuevaCotizacionForm({
  productos,
  clientes,
}: {
  productos: Producto[]
  clientes: Cliente[]
}) {
  const [clienteId, setClienteId] = useState('')
  const [exoneracion, setExoneracion] = useState<DatosExoneracion>(exoneracionVacia)
  const esExonerado = !!clientes.find((c) => c.id === clienteId)?.exonerado

  function seleccionarCliente(id: string) {
    setClienteId(id)
    const c = clientes.find((x) => x.id === id)
    setExoneracion({
      noConstancia: c?.no_constancia_exonerado || '',
      noRegistroSag: c?.no_registro_sag || '',
      noOrdenCompra: '',
    })
  }
  const [validezDias, setValidezDias] = useState('15')
  const [notas, setNotas] = useState('')
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
      descripcion: producto.descripcion,
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

  const t = calcularTotales(
    filas.map((f) => ({
      precioUnitario: parseFloat(f.precioUnitario) || 0,
      cantidad: parseFloat(f.cantidad) || 0,
      tasaIsv: parseFloat(f.tasaIsv),
    })),
    esExonerado
  )
  const gravado15 = t.gravado15
  const gravado18 = t.gravado18
  const exento = t.exento
  const isv15 = t.isv15
  const isv18 = t.isv18
  const total = t.total

  async function guardar() {
    setError('')
    if (!clienteId) return setError('Selecciona un cliente.')

    const items: ItemCotizacion[] = filas
      .filter((f) => f.productoId && parseFloat(f.cantidad) > 0)
      .map((f) => ({
        productoId: f.productoId,
        descripcion: f.descripcion,
        cantidad: parseFloat(f.cantidad),
        precioUnitario: parseFloat(f.precioUnitario) || 0,
        tasaIsv: parseFloat(f.tasaIsv),
      }))

    if (items.length === 0) return setError('Agrega al menos un producto o servicio.')

    if (esExonerado && (!exoneracion.noConstancia.trim() || !exoneracion.noOrdenCompra.trim())) {
      return setError('Cliente exonerado: indica No. Constancia Exonerado y No. Orden de Compra Exenta.')
    }

    setGuardando(true)
    const resultado = await crearCotizacion(clienteId, items, parseInt(validezDias) || 15, notas, esExonerado ? exoneracion : undefined)
    setGuardando(false)

    if (resultado?.error) return setError(resultado.error)
    if (resultado?.cotizacionId) router.push(`/dashboard/cotizaciones/${resultado.cotizacionId}`)
  }

  return (
    <div className="mb-8 rounded-lg bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-4 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs text-gray-500">Cliente</label>
          <select value={clienteId} onChange={(e) => seleccionarCliente(e.target.value)} className={`${estiloInput} w-full text-sm`}>
            <option value="">-- Selecciona cliente --</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Validez (días)</label>
          <input type="number" value={validezDias} onChange={(e) => setValidezDias(e.target.value)} className={`${estiloInput} w-full text-sm`} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Notas (opcional)</label>
          <input value={notas} onChange={(e) => setNotas(e.target.value)} className={`${estiloInput} w-full text-sm`} />
        </div>
      </div>

      {esExonerado && <BloqueExoneracion datos={exoneracion} onChange={setExoneracion} />}

      <div className="space-y-3">
        {filas.map((fila, index) => (
          <div
            key={index}
            className="grid grid-cols-2 gap-3 rounded-lg border border-gray-200 p-3 sm:grid-cols-12 sm:items-end sm:gap-2 sm:rounded-none sm:border-0 sm:border-b sm:p-0 sm:pb-3"
          >
            <div className="col-span-2 sm:col-span-4">
              <label className="mb-1 block text-xs text-gray-500">Producto/Servicio</label>
              <select value={fila.productoId} onChange={(e) => seleccionarProducto(index, e.target.value)} className="w-full rounded border px-2 py-2 text-sm">
                <option value="">-- Elegir --</option>
                {productos.map((p) => <option key={p.id} value={p.id}>{p.descripcion}</option>)}
              </select>
              <input
                value={fila.descripcion}
                onChange={(e) => actualizarFila(index, { descripcion: e.target.value })}
                placeholder="Descripción para este documento (editable)"
                className="mt-1 w-full rounded border px-2 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-1">
              <label className="mb-1 block text-xs text-gray-500">Cant.</label>
              <CampoNumerico value={fila.cantidad} onChange={(v) => actualizarFila(index, { cantidad: v })} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-gray-500">ISV</label>
              <select value={fila.tasaIsv} onChange={(e) => actualizarFila(index, { tasaIsv: e.target.value })} className="w-full rounded border px-2 py-2 text-sm">
                <option value="15">15%</option>
                <option value="18">18%</option>
                <option value="0">Exento</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-gray-500">Precio unit.</label>
              <CampoNumerico value={fila.precioUnitario} onChange={(v) => actualizarFila(index, { precioUnitario: v })} />
            </div>
            <div className="sm:col-span-2 text-xs text-gray-500">
              <label className="mb-1 block">Subtotal</label>
              <div className="rounded bg-gray-50 px-2 py-2">
                {formatearMoneda((parseFloat(fila.precioUnitario) || 0) * (parseFloat(fila.cantidad) || 0))}
              </div>
            </div>
            <div className="col-span-2 flex justify-end sm:col-span-1 sm:block">
              <button type="button" onClick={() => quitarFila(index)} className="text-xs text-red-500 hover:underline">Quitar</button>
            </div>
          </div>
        ))}
      </div>

      <button type="button" onClick={agregarFila} className="mt-3 w-full rounded border px-4 py-2 text-sm hover:bg-gray-50 sm:w-auto">
        + Agregar línea
      </button>

      <div className="mt-6 w-full space-y-1 text-sm sm:ml-auto sm:max-w-xs">
        {esExonerado && (
          <div className="flex justify-between"><span>Importe Exonerado</span><span>L. {formatearMoneda(t.exonerado)}</span></div>
        )}
        <div className="flex justify-between"><span>Gravado 15%</span><span>L. {formatearMoneda(gravado15)}</span></div>
        <div className="flex justify-between"><span>Gravado 18%</span><span>L. {formatearMoneda(gravado18)}</span></div>
        <div className="flex justify-between"><span>Exento</span><span>L. {formatearMoneda(exento)}</span></div>
        <div className="flex justify-between"><span>ISV 15%</span><span>L. {formatearMoneda(isv15)}</span></div>
        <div className="flex justify-between"><span>ISV 18%</span><span>L. {formatearMoneda(isv18)}</span></div>
        <div className="flex justify-between border-t pt-1 font-bold"><span>Total</span><span>L. {formatearMoneda(total)}</span></div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <button type="button" onClick={guardar} disabled={guardando} className={`${estiloBoton} mt-4 w-full sm:w-auto`}>
        {guardando ? 'Guardando...' : 'Crear cotización'}
      </button>
    </div>
  )
}