'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import CampoNumerico from '@/app/campo-numerico'
import { guardarCosteo } from './actions'
import { estiloBoton, estiloBotonSecundario, estiloInput } from '@/lib/estilos'
import { formatearMoneda } from '@/lib/formato'
import {
  AVISOS,
  RUBROS,
  TIPOS_LINEA,
  calcularCosteo,
  formatearPorcentaje,
  importeLinea,
  margenReal,
  nivelAviso,
  precioSugerido,
  type LineaCosteo,
  type ParametrosCosteo,
  type TipoLinea,
} from '@/lib/costeo'

type Producto = { id: string; descripcion: string; costoUnitario: number }
type MaterialCotizacion = { productoId: string; descripcion: string; cantidad: number; costoUnitario: number }

// En pantalla los números se editan como texto (para poder escribir "1." o borrar el campo)
type Fila = {
  clave: number
  tipo: TipoLinea
  descripcion: string
  productoId: string | null
  unidad: string
  tecnicos: string
  cantidad: string
  costoUnitario: string
}

type ParametrosTexto = Record<keyof ParametrosCosteo, string>

const aTexto = (v: number) => (v ? String(v) : '')
const aNumero = (v: string) => {
  const x = parseFloat(v)
  return Number.isFinite(x) && x > 0 ? x : 0
}

const ETIQUETAS_PARAMETROS: { clave: keyof ParametrosCosteo; etiqueta: string }[] = [
  { clave: 'tarifaHora', etiqueta: 'Costo por hora (L.)' },
  { clave: 'indirectoHora', etiqueta: 'Gastos fijos por hora (L.)' },
  { clave: 'costoKm', etiqueta: 'Costo por km (L.)' },
  { clave: 'pctConsumibles', etiqueta: 'Consumibles (%)' },
  { clave: 'pctImprevistos', etiqueta: 'Imprevistos (%)' },
  { clave: 'margenObjetivo', etiqueta: 'Margen objetivo (%)' },
]

export default function HojaCosteo({
  cotizacionId,
  precioCotizado,
  soloLectura,
  existe,
  rubroInicial,
  notasIniciales,
  parametrosHoja,
  parametrosActuales,
  lineasIniciales,
  materialesCotizacion,
  productos,
}: {
  cotizacionId: string
  precioCotizado: number
  soloLectura: boolean
  existe: boolean
  rubroInicial: string
  notasIniciales: string
  parametrosHoja: ParametrosCosteo
  parametrosActuales: ParametrosCosteo | null
  lineasIniciales: LineaCosteo[]
  materialesCotizacion: MaterialCotizacion[]
  productos: Producto[]
}) {
  const router = useRouter()
  const [rubro, setRubro] = useState(rubroInicial)
  const [notas, setNotas] = useState(notasIniciales)
  const [parametros, setParametros] = useState<ParametrosTexto>(() => paramsATexto(parametrosHoja))
  const [siguienteClave, setSiguienteClave] = useState(lineasIniciales.length + 1)
  const [filas, setFilas] = useState<Fila[]>(() =>
    lineasIniciales.map((l, i) => ({
      clave: i + 1,
      tipo: l.tipo,
      descripcion: l.descripcion,
      productoId: l.productoId,
      unidad: l.unidad || unidadPorDefecto(l.tipo),
      tecnicos: String(l.tecnicos || 1),
      cantidad: aTexto(l.cantidad),
      costoUnitario: aTexto(l.costoUnitario),
    }))
  )
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState<{ texto: string; error: boolean } | null>(null)

  const p: ParametrosCosteo = useMemo(
    () => ({
      indirectoHora: aNumero(parametros.indirectoHora),
      tarifaHora: aNumero(parametros.tarifaHora),
      costoKm: aNumero(parametros.costoKm),
      pctConsumibles: aNumero(parametros.pctConsumibles),
      pctImprevistos: aNumero(parametros.pctImprevistos),
      margenObjetivo: aNumero(parametros.margenObjetivo),
    }),
    [parametros]
  )

  const lineas: LineaCosteo[] = useMemo(() => filas.map(filaALinea), [filas])
  const desglose = useMemo(() => calcularCosteo(lineas, p), [lineas, p])
  const sugerido = precioSugerido(desglose.total, p.margenObjetivo)
  const margen = margenReal(precioCotizado, desglose.total)
  const aviso = AVISOS[nivelAviso(precioCotizado, desglose.total, p.margenObjetivo)]
  const faltante = sugerido - precioCotizado
  const ganancia = precioCotizado - desglose.total // en lempiras, sin ISV
  const gananciaObjetivo = sugerido - desglose.total

  const parametrosCambiaron =
    !!parametrosActuales &&
    ETIQUETAS_PARAMETROS.some(({ clave }) => Math.abs(parametrosActuales[clave] - p[clave]) > 0.004)

  function nuevaClave() {
    const clave = siguienteClave
    setSiguienteClave((c) => c + 1)
    return clave
  }

  function agregar(tipo: TipoLinea) {
    const costo = tipo === 'mano_obra' ? p.tarifaHora : tipo === 'traslado' ? p.costoKm : 0
    setFilas((f) => [
      ...f,
      {
        clave: nuevaClave(),
        tipo,
        descripcion: tipo === 'mano_obra' ? 'Técnico' : tipo === 'traslado' ? 'Traslado ida y vuelta' : '',
        productoId: null,
        unidad: unidadPorDefecto(tipo),
        tecnicos: '1',
        cantidad: '',
        costoUnitario: aTexto(costo),
      },
    ])
  }

  function traerMateriales() {
    const yaEstan = new Set(filas.filter((f) => f.productoId).map((f) => f.productoId))
    const nuevos = materialesCotizacion.filter((m) => !yaEstan.has(m.productoId))
    if (nuevos.length === 0) {
      setMensaje({ texto: 'Los materiales de la cotización ya están en la hoja.', error: false })
      return
    }
    let clave = siguienteClave
    setFilas((f) => [
      ...f,
      ...nuevos.map((m) => ({
        clave: clave++,
        tipo: 'material' as TipoLinea,
        descripcion: m.descripcion,
        productoId: m.productoId,
        unidad: 'und',
        tecnicos: '1',
        cantidad: aTexto(m.cantidad),
        costoUnitario: aTexto(m.costoUnitario),
      })),
    ])
    setSiguienteClave(clave)
    const sinCosto = nuevos.filter((m) => !m.costoUnitario).length
    setMensaje({
      texto: sinCosto
        ? `Se agregaron ${nuevos.length} materiales; ${sinCosto === 1 ? '1 no tiene' : `${sinCosto} no tienen`} costo de compra registrado: escríbelo a mano.`
        : `Se agregaron ${nuevos.length} materiales con su último costo de compra.`,
      error: false,
    })
  }

  function cambiar(clave: number, cambios: Partial<Fila>) {
    setFilas((f) => f.map((fila) => (fila.clave === clave ? { ...fila, ...cambios } : fila)))
  }

  // Al escribir la descripción de un material: si coincide con un producto, toma su costo de compra
  function cambiarDescripcionMaterial(fila: Fila, texto: string) {
    const producto = productos.find((pr) => pr.descripcion === texto.toLocaleUpperCase('es-HN'))
    if (producto) {
      cambiar(fila.clave, {
        descripcion: producto.descripcion,
        productoId: producto.id,
        costoUnitario: aNumero(fila.costoUnitario) ? fila.costoUnitario : aTexto(producto.costoUnitario),
      })
    } else {
      cambiar(fila.clave, { descripcion: texto, productoId: null })
    }
  }

  function quitar(clave: number) {
    setFilas((f) => f.filter((fila) => fila.clave !== clave))
  }

  async function guardar() {
    if (p.margenObjetivo >= 100) {
      setMensaje({ texto: 'El margen objetivo debe ser menor que 100 %.', error: true })
      return
    }
    setGuardando(true)
    setMensaje(null)
    const resultado = await guardarCosteo(cotizacionId, { rubro, parametros: p, lineas, notas })
    setGuardando(false)
    if (resultado?.error) {
      setMensaje({ texto: resultado.error, error: true })
      return
    }
    setMensaje({ texto: 'Costeo guardado.', error: false })
    router.refresh()
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_20rem]">
      <div className="min-w-0 space-y-4">
        {soloLectura && (
          <div className="rounded-lg bg-gray-100 p-3 text-sm text-gray-600 ring-1 ring-gray-200">
            Esta cotización ya se convirtió en factura: su costeo estimado queda en <strong>solo lectura</strong> como
            registro de con qué números cotizaste.
          </div>
        )}

        {/* Rubro y parámetros */}
        <div className="space-y-3 rounded-lg bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs text-gray-500">Rubro del trabajo</label>
              <select
                value={rubro}
                onChange={(e) => setRubro(e.target.value)}
                disabled={soloLectura}
                className={`${estiloInput} text-sm disabled:bg-gray-50`}
              >
                {RUBROS.map((r) => (
                  <option key={r.valor} value={r.valor}>
                    {r.etiqueta}
                  </option>
                ))}
              </select>
            </div>
            {parametrosCambiaron && !soloLectura && (
              <button
                type="button"
                onClick={() => parametrosActuales && setParametros(paramsATexto(parametrosActuales))}
                className={estiloBotonSecundario}
              >
                Usar mis parámetros actuales
              </button>
            )}
          </div>

          <details className="rounded border border-gray-200 px-3 py-2 text-sm" open={!existe && !soloLectura}>
            <summary className="cursor-pointer text-gray-600">
              Parámetros de esta hoja{' '}
              <span className="text-xs text-gray-400">
                (L. {formatearMoneda(p.tarifaHora)}/h · fijos L. {formatearMoneda(p.indirectoHora)}/h · margen{' '}
                {formatearPorcentaje(p.margenObjetivo)})
              </span>
            </summary>
            <p className="mt-2 text-xs text-gray-400">
              Se copian de Configuración al crear la hoja y quedan guardados con ella: si después cambias tus
              parámetros, esta cotización conserva los suyos. Puedes ajustarlos solo para este trabajo.
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ETIQUETAS_PARAMETROS.map(({ clave, etiqueta }) => (
                <div key={clave}>
                  <label className="mb-1 block text-xs text-gray-500">{etiqueta}</label>
                  {soloLectura ? (
                    <p className="font-mono">{parametros[clave] || '0'}</p>
                  ) : (
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={parametros[clave]}
                      onChange={(e) => setParametros((pr) => ({ ...pr, [clave]: e.target.value }))}
                      className={`${estiloInput} w-full font-mono text-sm`}
                    />
                  )}
                </div>
              ))}
            </div>
          </details>
        </div>

        {/* Un bloque por tipo de costo */}
        {TIPOS_LINEA.map((tipo) => {
          const delTipo = filas.filter((f) => f.tipo === tipo.valor)
          const subtotal = delTipo.reduce((s, f) => s + importeLinea(filaALinea(f)), 0)
          const esManoObra = tipo.valor === 'mano_obra'
          return (
            <section key={tipo.valor} className="rounded-lg bg-white p-4 shadow-sm">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-marca">{tipo.titulo}</h2>
                  <p className="text-xs text-gray-400">{tipo.ayuda}</p>
                </div>
                <span className="font-mono text-sm text-gray-600">L. {formatearMoneda(subtotal)}</span>
              </div>

              {delTipo.length > 0 && (
                <div className="divide-y divide-gray-100">
                  {delTipo.map((fila) => (
                    <div key={fila.clave} className="space-y-2 py-3 first:pt-0">
                      {/* Línea 1: descripción completa */}
                      <div className="flex items-center gap-2">
                        <div className="min-w-0 flex-1">
                          {soloLectura ? (
                            <p className="text-sm font-medium">{fila.descripcion || '—'}</p>
                          ) : (
                            <input
                              value={fila.descripcion}
                              onChange={(e) =>
                                tipo.valor === 'material'
                                  ? cambiarDescripcionMaterial(fila, e.target.value)
                                  : cambiar(fila.clave, { descripcion: e.target.value })
                              }
                              list={tipo.valor === 'material' ? 'productos-costeo' : undefined}
                              placeholder={tipo.valor === 'material' ? 'Escribe o elige un producto' : 'Descripción'}
                              className={`${estiloInput} w-full text-sm`}
                            />
                          )}
                        </div>
                        {!soloLectura && (
                          <button
                            type="button"
                            onClick={() => quitar(fila.clave)}
                            title="Quitar renglón"
                            className="px-1 text-gray-400 hover:text-red-600"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      {/* Línea 2: cantidades, costo e importe */}
                      <div className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[7rem_7rem_8rem_1fr]">
                        {esManoObra ? (
                          <Numero
                            etiqueta="Técnicos"
                            valor={fila.tecnicos}
                            soloLectura={soloLectura}
                            onChange={(v) => cambiar(fila.clave, { tecnicos: v })}
                          />
                        ) : (
                          <Numero
                            etiqueta="Cantidad"
                            valor={fila.cantidad}
                            soloLectura={soloLectura}
                            onChange={(v) => cambiar(fila.clave, { cantidad: v })}
                          />
                        )}
                        {esManoObra ? (
                          <Numero
                            etiqueta="Horas c/u"
                            valor={fila.cantidad}
                            soloLectura={soloLectura}
                            onChange={(v) => cambiar(fila.clave, { cantidad: v })}
                          />
                        ) : (
                          <div>
                            <span className="text-xs text-gray-400">Unidad</span>
                            {soloLectura ? (
                              <p className="text-sm">{fila.unidad}</p>
                            ) : (
                              <input
                                value={fila.unidad}
                                onChange={(e) => cambiar(fila.clave, { unidad: e.target.value })}
                                className={`${estiloInput} w-full px-2 text-sm`}
                              />
                            )}
                          </div>
                        )}
                        <Numero
                          etiqueta={esManoObra ? 'Costo por hora' : 'Costo unitario'}
                          valor={fila.costoUnitario}
                          soloLectura={soloLectura}
                          onChange={(v) => cambiar(fila.clave, { costoUnitario: v })}
                        />
                        <div className="text-right">
                          <span className="block text-xs text-gray-400">Importe</span>
                          <span className="font-mono text-sm leading-9">L. {formatearMoneda(importeLinea(filaALinea(fila)))}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!soloLectura && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => agregar(tipo.valor)} className={estiloBotonSecundario}>
                    + Agregar
                  </button>
                  {tipo.valor === 'material' && materialesCotizacion.length > 0 && (
                    <button type="button" onClick={traerMateriales} className={estiloBotonSecundario}>
                      Traer materiales de la cotización ({materialesCotizacion.length})
                    </button>
                  )}
                </div>
              )}
              {esManoObra && desglose.horasHombre > 0 && (
                <p className="mt-2 text-xs text-gray-500">
                  {desglose.horasHombre} horas-hombre × L. {formatearMoneda(p.indirectoHora)} de gastos fijos = L.{' '}
                  {formatearMoneda(desglose.indirectos)} (se suma en el resumen).
                </p>
              )}
            </section>
          )
        })}

        <div className="rounded-lg bg-white p-4 shadow-sm">
          <label className="mb-1 block text-xs text-gray-500">Notas internas</label>
          {soloLectura ? (
            <p className="whitespace-pre-wrap text-sm text-gray-700">{notas || '—'}</p>
          ) : (
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              placeholder="Supuestos del trabajo, condiciones del sitio, lo que el cliente pone…"
              className={`${estiloInput} w-full text-sm`}
            />
          )}
        </div>

        <datalist id="productos-costeo">
          {productos.map((pr) => (
            <option key={pr.id} value={pr.descripcion} />
          ))}
        </datalist>
      </div>

      {/* Resumen */}
      <aside className="xl:sticky xl:top-4 xl:self-start">
        <div className="space-y-3 rounded-lg bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-marca">Resumen (sin ISV)</h2>
          <dl className="space-y-1 text-sm">
            <Renglon etiqueta="Materiales" valor={desglose.materiales} />
            <Renglon etiqueta={`Consumibles (${formatearPorcentaje(p.pctConsumibles)})`} valor={desglose.consumibles} />
            <Renglon etiqueta="Mano de obra" valor={desglose.manoObra} />
            <Renglon etiqueta={`Gastos fijos (${desglose.horasHombre} h-h)`} valor={desglose.indirectos} />
            <Renglon etiqueta="Traslado" valor={desglose.traslado} />
            <Renglon etiqueta="Terceros" valor={desglose.terceros} />
            <Renglon etiqueta="Otros" valor={desglose.otros} />
            <Renglon etiqueta={`Imprevistos (${formatearPorcentaje(p.pctImprevistos)})`} valor={desglose.imprevistos} />
            <div className="flex justify-between border-t-2 border-marca pt-2 text-base font-bold text-marca">
              <dt>Costo total</dt>
              <dd className="font-mono">L. {formatearMoneda(desglose.total)}</dd>
            </div>
          </dl>

          <dl className="space-y-1 border-t border-gray-200 pt-3 text-sm">
            <div className="flex justify-between text-gray-600">
              <dt>Precio sugerido ({formatearPorcentaje(p.margenObjetivo)})</dt>
              <dd className="font-mono font-semibold text-marca">L. {formatearMoneda(sugerido)}</dd>
            </div>
            <div className="flex justify-between text-gray-600">
              <dt>Precio cotizado</dt>
              <dd className="font-mono">L. {formatearMoneda(precioCotizado)}</dd>
            </div>
            <div className={`flex justify-between font-semibold ${ganancia < 0 ? 'text-red-700' : 'text-marca'}`}>
              <dt>{ganancia < 0 ? 'Pérdida' : 'Ganancia'}</dt>
              <dd className="font-mono">L. {formatearMoneda(Math.abs(ganancia))}</dd>
            </div>
            <div className="flex justify-between text-gray-600">
              <dt>Margen real</dt>
              <dd className="font-mono">{formatearPorcentaje(margen)}</dd>
            </div>
          </dl>

          <div className={`rounded-lg p-3 text-sm ${aviso.caja}`}>
            <p className={`font-semibold ${aviso.texto}`}>{aviso.etiqueta}</p>
            {desglose.total > 0 && faltante > 0.004 && (
              <p className={`mt-1 text-xs ${aviso.texto}`}>
                Para tu margen objetivo, el precio sin ISV debería subir L. {formatearMoneda(faltante)}. Con el
                precio sugerido ganarías L. {formatearMoneda(gananciaObjetivo)}.
              </p>
            )}
          </div>

          {!soloLectura && (
            <>
              <button type="button" onClick={guardar} disabled={guardando} className={`${estiloBoton} w-full`}>
                {guardando ? 'Guardando...' : existe ? 'Guardar cambios' : 'Guardar costeo'}
              </button>
              <p className="text-xs text-gray-400">
                El precio sugerido no cambia tu cotización: para ajustar precios, edita la cotización.
              </p>
            </>
          )}
          {mensaje && <p className={`text-sm ${mensaje.error ? 'text-red-600' : 'text-acento'}`}>{mensaje.texto}</p>}
        </div>
      </aside>
    </div>
  )
}

function Renglon({ etiqueta, valor }: { etiqueta: string; valor: number }) {
  return (
    <div className="flex justify-between text-gray-600">
      <dt>{etiqueta}</dt>
      <dd className="font-mono">L. {formatearMoneda(valor)}</dd>
    </div>
  )
}

function Numero({
  etiqueta,
  valor,
  soloLectura,
  onChange,
  paso = 1,
}: {
  etiqueta: string
  valor: string
  soloLectura: boolean
  onChange: (v: string) => void
  paso?: number
}) {
  return (
    <div>
      <span className="text-xs text-gray-400">{etiqueta}</span>
      {soloLectura ? (
        <p className="font-mono text-sm leading-9">{valor || '0'}</p>
      ) : (
        <CampoNumerico value={valor} onChange={onChange} paso={paso} placeholder="0" className="font-mono" />
      )}
    </div>
  )
}

function unidadPorDefecto(tipo: TipoLinea) {
  return TIPOS_LINEA.find((t) => t.valor === tipo)?.unidad ?? 'und'
}

function filaALinea(f: Fila): LineaCosteo {
  return {
    tipo: f.tipo,
    descripcion: f.descripcion,
    productoId: f.productoId,
    unidad: f.tipo === 'mano_obra' ? 'h' : f.unidad || null,
    tecnicos: f.tipo === 'mano_obra' ? aNumero(f.tecnicos) : 1,
    cantidad: aNumero(f.cantidad),
    costoUnitario: aNumero(f.costoUnitario),
    cantidadReal: null,
    costoUnitarioReal: null,
    soloReal: false,
  }
}

function paramsATexto(p: ParametrosCosteo): ParametrosTexto {
  return {
    indirectoHora: String(p.indirectoHora),
    tarifaHora: String(p.tarifaHora),
    costoKm: String(p.costoKm),
    pctConsumibles: String(p.pctConsumibles),
    pctImprevistos: String(p.pctImprevistos),
    margenObjetivo: String(p.margenObjetivo),
  }
}
