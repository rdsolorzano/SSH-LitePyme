// Costeo de cotizaciones: cuánto cuesta realmente un trabajo.
// Herramienta interna: NO es información fiscal y no toca Gastos, Compras ni reportes.
// Todo en este archivo es cálculo puro (sin base de datos) para que la pantalla
// lo muestre al instante y se pueda probar con números conocidos.
// Todos los montos son SIN ISV.

export type TipoLinea = 'material' | 'mano_obra' | 'traslado' | 'tercero' | 'otro'

export const TIPOS_LINEA: { valor: TipoLinea; titulo: string; unidad: string; ayuda: string }[] = [
  { valor: 'material', titulo: 'Materiales', unidad: 'und', ayuda: 'Lo que queda instalado, a su costo de compra (no al precio de venta).' },
  { valor: 'mano_obra', titulo: 'Mano de obra', unidad: 'h', ayuda: 'Técnicos × horas × costo por hora. Suma también los gastos fijos por hora.' },
  { valor: 'traslado', titulo: 'Traslado', unidad: 'km', ayuda: 'Kilómetros, viajes, peajes, viáticos y parqueo.' },
  { valor: 'tercero', titulo: 'Terceros', unidad: 'und', ayuda: 'Subcontratos, alquiler de equipo, fletes.' },
  { valor: 'otro', titulo: 'Otros', unidad: 'und', ayuda: 'Cualquier otro costo del trabajo.' },
]

export const RUBROS = [
  { valor: 'seguridad', etiqueta: 'Seguridad electrónica' },
  { valor: 'redes', etiqueta: 'Redes' },
  { valor: 'refrigeracion', etiqueta: 'Refrigeración' },
  { valor: 'general', etiqueta: 'General' },
] as const

export function etiquetaRubro(valor: string | null | undefined) {
  return RUBROS.find((r) => r.valor === valor)?.etiqueta ?? 'General'
}

// Parámetros con los que se calcula una hoja (se congelan al guardarla)
export type ParametrosCosteo = {
  indirectoHora: number // gastos fijos mensuales / horas facturables
  tarifaHora: number
  costoKm: number
  pctConsumibles: number // 5 = 5 %
  pctImprevistos: number
  margenObjetivo: number // 25 = 25 % del precio
}

export type LineaCosteo = {
  tipo: TipoLinea
  descripcion: string
  productoId: string | null
  unidad: string | null
  tecnicos: number // solo mano de obra
  cantidad: number
  costoUnitario: number
  cantidadReal: number | null
  costoUnitarioReal: number | null
  soloReal: boolean // apareció en el trabajo, no estaba previsto
}

export type Modo = 'estimado' | 'real'

export type Desglose = {
  materiales: number
  consumibles: number
  manoObra: number
  horasHombre: number
  indirectos: number
  traslado: number
  terceros: number
  otros: number
  subtotal: number
  imprevistos: number
  total: number
}

const n = (v: unknown) => {
  const x = Number(v)
  return Number.isFinite(x) ? x : 0
}

export const redondear = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100

// Gastos fijos que debe absorber cada hora facturable
export function costoIndirectoHora(gastosFijosMensuales: number, horasFacturablesMes: number) {
  const horas = n(horasFacturablesMes)
  return horas > 0 ? redondear(n(gastosFijosMensuales) / horas) : 0
}

// Cantidad y costo de un renglón según el modo. En "real", lo vacío usa lo estimado.
function valores(l: LineaCosteo, modo: Modo) {
  if (modo === 'estimado') {
    if (l.soloReal) return { cantidad: 0, costo: 0 }
    return { cantidad: n(l.cantidad), costo: n(l.costoUnitario) }
  }
  return {
    cantidad: l.cantidadReal ?? n(l.cantidad),
    costo: l.costoUnitarioReal ?? n(l.costoUnitario),
  }
}

// Horas-hombre de un renglón de mano de obra (técnicos × horas)
export function horasHombreLinea(l: LineaCosteo, modo: Modo = 'estimado') {
  if (l.tipo !== 'mano_obra') return 0
  return Math.max(n(l.tecnicos), 0) * valores(l, modo).cantidad
}

// Importe de un renglón (sin consumibles, gastos fijos ni imprevistos)
export function importeLinea(l: LineaCosteo, modo: Modo = 'estimado') {
  const { cantidad, costo } = valores(l, modo)
  const unidades = l.tipo === 'mano_obra' ? Math.max(n(l.tecnicos), 0) * cantidad : cantidad
  return redondear(unidades * costo)
}

export function calcularCosteo(lineas: LineaCosteo[], p: ParametrosCosteo, modo: Modo = 'estimado'): Desglose {
  const suma = (tipo: TipoLinea) =>
    redondear(lineas.filter((l) => l.tipo === tipo).reduce((s, l) => s + importeLinea(l, modo), 0))

  const materiales = suma('material')
  const manoObra = suma('mano_obra')
  const traslado = suma('traslado')
  const terceros = suma('tercero')
  const otros = suma('otro')
  const horasHombre = lineas.reduce((s, l) => s + horasHombreLinea(l, modo), 0)

  const consumibles = redondear((materiales * n(p.pctConsumibles)) / 100)
  const indirectos = redondear(horasHombre * n(p.indirectoHora))
  const subtotal = redondear(materiales + consumibles + manoObra + indirectos + traslado + terceros + otros)
  const imprevistos = redondear((subtotal * n(p.pctImprevistos)) / 100)
  const total = redondear(subtotal + imprevistos)

  return { materiales, consumibles, manoObra, horasHombre, indirectos, traslado, terceros, otros, subtotal, imprevistos, total }
}

// Precio (sin ISV) que deja el margen objetivo SOBRE EL PRECIO: costo / (1 − margen)
export function precioSugerido(costoTotal: number, margenObjetivo: number) {
  const m = n(margenObjetivo)
  if (m < 0 || m >= 100) return 0
  return redondear(n(costoTotal) / (1 - m / 100))
}

// Margen real en % del precio. null si no hay precio.
export function margenReal(precio: number, costoTotal: number) {
  const pr = n(precio)
  if (pr <= 0) return null
  return ((pr - n(costoTotal)) / pr) * 100
}

export type NivelAviso = 'sin_datos' | 'perdida' | 'bajo' | 'ok'

export function nivelAviso(precio: number, costoTotal: number, margenObjetivo: number): NivelAviso {
  if (n(costoTotal) <= 0) return 'sin_datos'
  if (n(precio) < n(costoTotal)) return 'perdida'
  const m = margenReal(precio, costoTotal) ?? 0
  return m + 1e-9 < n(margenObjetivo) ? 'bajo' : 'ok'
}

export const AVISOS: Record<NivelAviso, { etiqueta: string; caja: string; texto: string }> = {
  sin_datos: { etiqueta: 'Sin costos todavía', caja: 'bg-gray-50 ring-1 ring-gray-200', texto: 'text-gray-500' },
  perdida: { etiqueta: 'Pierdes dinero: el precio no cubre el costo', caja: 'bg-red-50 ring-2 ring-red-600', texto: 'text-red-700' },
  bajo: { etiqueta: 'Cubres el costo, pero bajo tu margen objetivo', caja: 'bg-amber-50 ring-2 ring-amber-500', texto: 'text-amber-800' },
  ok: { etiqueta: 'Alcanza tu margen objetivo', caja: 'bg-green-50 ring-2 ring-green-600', texto: 'text-green-700' },
}

// Precio cotizado sin ISV, a partir de los subtotales de la cotización
export function precioSinIsv(c: {
  subtotal_gravado_15?: number | null
  subtotal_gravado_18?: number | null
  subtotal_exento?: number | null
  subtotal_exonerado?: number | null
}) {
  return redondear(n(c.subtotal_gravado_15) + n(c.subtotal_gravado_18) + n(c.subtotal_exento) + n(c.subtotal_exonerado))
}

export function formatearPorcentaje(valor: number | null | undefined) {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return '—'
  return `${valor.toFixed(1)} %`
}

// Fila de la base -> renglón
export function lineaDesdeBd(r: {
  tipo: string
  descripcion: string | null
  producto_id: string | null
  unidad: string | null
  tecnicos: number | null
  cantidad: number | null
  costo_unitario: number | null
  cantidad_real: number | null
  costo_unitario_real: number | null
  solo_real: boolean | null
}): LineaCosteo {
  return {
    tipo: (TIPOS_LINEA.some((t) => t.valor === r.tipo) ? r.tipo : 'otro') as TipoLinea,
    descripcion: r.descripcion || '',
    productoId: r.producto_id,
    unidad: r.unidad,
    tecnicos: r.tecnicos === null ? 1 : n(r.tecnicos),
    cantidad: n(r.cantidad),
    costoUnitario: n(r.costo_unitario),
    cantidadReal: r.cantidad_real === null ? null : n(r.cantidad_real),
    costoUnitarioReal: r.costo_unitario_real === null ? null : n(r.costo_unitario_real),
    soloReal: !!r.solo_real,
  }
}

// Fila de la base -> parámetros
export function parametrosDesdeBd(r: {
  indirecto_hora?: number | null
  gastos_fijos_mensuales?: number | null
  horas_facturables_mes?: number | null
  tarifa_hora?: number | null
  costo_km?: number | null
  pct_consumibles?: number | null
  pct_imprevistos?: number | null
  margen_objetivo?: number | null
} | null): ParametrosCosteo {
  return {
    indirectoHora:
      r?.indirecto_hora !== undefined && r?.indirecto_hora !== null
        ? n(r.indirecto_hora)
        : costoIndirectoHora(n(r?.gastos_fijos_mensuales), n(r?.horas_facturables_mes)),
    tarifaHora: n(r?.tarifa_hora),
    costoKm: n(r?.costo_km),
    pctConsumibles: r ? n(r.pct_consumibles) : 5,
    pctImprevistos: r ? n(r.pct_imprevistos) : 5,
    margenObjetivo: r ? n(r.margen_objetivo) : 25,
  }
}
