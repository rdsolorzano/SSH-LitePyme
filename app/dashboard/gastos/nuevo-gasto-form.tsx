'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import CampoNumerico from '@/app/campo-numerico'
import { estiloBoton, estiloBotonSecundario, estiloInput } from '@/lib/estilos'
import { formatearMoneda } from '@/lib/formato'
import { CATEGORIAS_GASTO, TIPOS_DOCUMENTO_GASTO } from '@/lib/gastos'
import { crearGasto } from './actions'

type Proveedor = { nombre: string; rtn: string | null }

const hoy = () => new Date().toISOString().split('T')[0]
const n = (v: string) => parseFloat(v) || 0
const dos = (v: number) => (Math.round(v * 100) / 100).toFixed(2)

function estadoInicial() {
  return {
    fecha: hoy(),
    tipoDocumento: 'factura',
    numeroDocumento: '',
    nombreProveedor: '',
    rtnProveedor: '',
    categoria: '',
    descripcion: '',
    gravado15: '',
    isv15: '',
    gravado18: '',
    isv18: '',
    exento: '',
    exonerado: '',
    deducibleIsr: true,
  }
}

export default function NuevoGastoForm({ proveedores }: { proveedores: Proveedor[] }) {
  const [f, setF] = useState(estadoInicial)
  const [totalRapido, setTotalRapido] = useState('')
  const [tasaRapida, setTasaRapida] = useState('15')
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState<{ texto: string; error: boolean } | null>(null)
  const router = useRouter()

  const cambiar = (cambios: Partial<ReturnType<typeof estadoInicial>>) => setF((prev) => ({ ...prev, ...cambios }))

  // El ISV se calcula solo al escribir la base, pero se puede corregir a mano (por centavos de la factura)
  const cambiarGravado15 = (v: string) => cambiar({ gravado15: v, isv15: v ? dos(n(v) * 0.15) : '' })
  const cambiarGravado18 = (v: string) => cambiar({ gravado18: v, isv18: v ? dos(n(v) * 0.18) : '' })

  function elegirProveedor(nombre: string) {
    const p = proveedores.find((x) => x.nombre === nombre)
    cambiar({ nombreProveedor: nombre, ...(p?.rtn ? { rtnProveedor: p.rtn } : {}) })
  }

  // "Solo tengo el total": separa base e ISV
  function desglosarTotal() {
    const total = n(totalRapido)
    if (total <= 0) return
    if (tasaRapida === 'exento') {
      cambiar({ exento: dos(total), gravado15: '', isv15: '', gravado18: '', isv18: '' })
    } else {
      const tasa = tasaRapida === '18' ? 0.18 : 0.15
      const base = total / (1 + tasa)
      const isv = total - base
      if (tasaRapida === '18') cambiar({ gravado18: dos(base), isv18: dos(isv), gravado15: '', isv15: '', exento: '' })
      else cambiar({ gravado15: dos(base), isv15: dos(isv), gravado18: '', isv18: '', exento: '' })
    }
    setTotalRapido('')
  }

  const total = n(f.gravado15) + n(f.isv15) + n(f.gravado18) + n(f.isv18) + n(f.exento) + n(f.exonerado)
  const ayudaCategoria = CATEGORIAS_GASTO.find((c) => c.valor === f.categoria)?.ayuda

  async function guardar() {
    setGuardando(true)
    setMensaje(null)
    const r = await crearGasto({
      fecha: f.fecha,
      tipoDocumento: f.tipoDocumento,
      numeroDocumento: f.numeroDocumento,
      nombreProveedor: f.nombreProveedor,
      rtnProveedor: f.rtnProveedor,
      categoria: f.categoria,
      descripcion: f.descripcion,
      gravado15: n(f.gravado15),
      gravado18: n(f.gravado18),
      exento: n(f.exento),
      exonerado: n(f.exonerado),
      isv15: n(f.isv15),
      isv18: n(f.isv18),
      deducibleIsr: f.deducibleIsr,
    })
    setGuardando(false)
    if (r?.error) {
      setMensaje({ texto: r.error, error: true })
      return
    }
    setMensaje({ texto: `Gasto guardado por L. ${formatearMoneda(total)}.`, error: false })
    setF((prev) => ({ ...estadoInicial(), fecha: prev.fecha, categoria: prev.categoria }))
    router.refresh()
  }

  return (
    <div className="mb-8 rounded-lg bg-white p-4 shadow-sm sm:p-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs text-gray-500">Fecha del documento</label>
          <input type="date" value={f.fecha} onChange={(e) => cambiar({ fecha: e.target.value })} className={`${estiloInput} w-full text-sm`} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Tipo de documento</label>
          <select value={f.tipoDocumento} onChange={(e) => cambiar({ tipoDocumento: e.target.value })} className={`${estiloInput} w-full text-sm`}>
            {TIPOS_DOCUMENTO_GASTO.map((t) => (
              <option key={t.valor} value={t.valor}>{t.etiqueta}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">No. de documento</label>
          <input
            value={f.numeroDocumento}
            onChange={(e) => cambiar({ numeroDocumento: e.target.value })}
            placeholder={f.tipoDocumento === 'factura' ? '000-001-01-00012345' : 'Opcional'}
            className={`${estiloInput} w-full font-mono text-sm`}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-gray-500">Proveedor (a quién le pagaste)</label>
          <input
            list="lista-proveedores-gastos"
            value={f.nombreProveedor}
            onChange={(e) => elegirProveedor(e.target.value)}
            placeholder="Ej: Gasolinera Puma El Progreso"
            className={`${estiloInput} w-full text-sm`}
          />
          <datalist id="lista-proveedores-gastos">
            {proveedores.map((p) => (
              <option key={p.nombre} value={p.nombre} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">RTN del proveedor</label>
          <input value={f.rtnProveedor} onChange={(e) => cambiar({ rtnProveedor: e.target.value })} className={`${estiloInput} w-full font-mono text-sm`} />
        </div>

        <div>
          <label className="mb-1 block text-xs text-gray-500">Categoría</label>
          <select value={f.categoria} onChange={(e) => cambiar({ categoria: e.target.value })} className={`${estiloInput} w-full text-sm`}>
            <option value="">-- Elige una categoría --</option>
            {CATEGORIAS_GASTO.map((c) => (
              <option key={c.valor} value={c.valor}>{c.etiqueta}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-gray-500">Descripción (opcional)</label>
          <input
            value={f.descripcion}
            onChange={(e) => cambiar({ descripcion: e.target.value })}
            placeholder="Ej: Diésel pick-up placa HAA-1234, visita a cliente"
            className={`${estiloInput} w-full text-sm`}
          />
        </div>
      </div>

      {ayudaCategoria && <p className="mt-3 rounded bg-amber-50 p-2 text-xs text-amber-800">{ayudaCategoria}</p>}

      <div className="mt-4 rounded-lg bg-gray-50 p-3">
        <p className="mb-2 text-xs text-gray-500">¿Solo tienes el total? Escríbelo y lo separo en base e ISV:</p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-40">
            <CampoNumerico value={totalRapido} onChange={setTotalRapido} placeholder="Total del documento" />
          </div>
          <select value={tasaRapida} onChange={(e) => setTasaRapida(e.target.value)} className={`${estiloInput} text-sm`}>
            <option value="15">Incluye ISV 15%</option>
            <option value="18">Incluye ISV 18%</option>
            <option value="exento">Exento (sin ISV)</option>
          </select>
          <button type="button" onClick={desglosarTotal} className={estiloBotonSecundario}>
            Desglosar
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-6">
        <div>
          <label className="mb-1 block text-xs text-gray-500">Gravado 15% (sin ISV)</label>
          <CampoNumerico value={f.gravado15} onChange={cambiarGravado15} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">ISV 15%</label>
          <CampoNumerico value={f.isv15} onChange={(v) => cambiar({ isv15: v })} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Gravado 18% (sin ISV)</label>
          <CampoNumerico value={f.gravado18} onChange={cambiarGravado18} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">ISV 18%</label>
          <CampoNumerico value={f.isv18} onChange={(v) => cambiar({ isv18: v })} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Exento</label>
          <CampoNumerico value={f.exento} onChange={(v) => cambiar({ exento: v })} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Exonerado</label>
          <CampoNumerico value={f.exonerado} onChange={(v) => cambiar({ exonerado: v })} />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={f.deducibleIsr} onChange={(e) => cambiar({ deducibleIsr: e.target.checked })} />
          Es gasto del negocio (deducible para renta). Desmárcalo si es de uso personal.
        </label>
        <p className="text-sm text-gray-500">
          Total: <span className="font-mono text-lg font-bold text-marca">L. {formatearMoneda(total)}</span>
        </p>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button type="button" onClick={guardar} disabled={guardando} className={estiloBoton}>
          {guardando ? 'Guardando...' : 'Guardar gasto'}
        </button>
        {mensaje && <p className={`text-sm ${mensaje.error ? 'text-red-600' : 'text-green-700'}`}>{mensaje.texto}</p>}
      </div>
    </div>
  )
}
