// Gastos operativos que NO son inventario (combustible, alquiler, servicios, etc.)
// Las categorías siguen los rubros de la declaración de Impuesto sobre la Renta
// y los gastos que menciona el Reglamento de la Ley ISR (arts. 41 al 57).

export type CategoriaGasto = {
  valor: string
  etiqueta: string
  ayuda?: string
}

export const CATEGORIAS_GASTO: CategoriaGasto[] = [
  { valor: 'combustible', etiqueta: 'Combustible', ayuda: 'Gasolina, diésel, kerosene y gas LPG están exentos de ISV (art. 15 Ley ISV): escribe el monto en "Exento". Lubricantes y aceites sí llevan ISV 15%.' },
  { valor: 'lubricantes', etiqueta: 'Lubricantes y aceites', ayuda: 'Normalmente gravados con ISV 15%.' },
  { valor: 'alquileres', etiqueta: 'Alquileres' },
  { valor: 'servicios_publicos', etiqueta: 'Energía, agua, teléfono e internet' },
  { valor: 'reparaciones', etiqueta: 'Reparación y mantenimiento', ayuda: 'De vehículos, equipo y bienes que usas para generar ingresos.' },
  { valor: 'honorarios', etiqueta: 'Honorarios profesionales', ayuda: 'Contador, abogado, técnicos independientes, etc.' },
  { valor: 'sueldos', etiqueta: 'Sueldos y salarios', ayuda: 'Normalmente se respaldan con planilla o recibo, no con factura.' },
  { valor: 'viajes', etiqueta: 'Viáticos y gastos de viaje', ayuda: 'El Reglamento ISR (art. 53) limita los gastos de viaje a pasaje, alojamiento y alimentación razonables.' },
  { valor: 'publicidad', etiqueta: 'Publicidad y mercadeo' },
  { valor: 'seguros', etiqueta: 'Seguros' },
  { valor: 'intereses', etiqueta: 'Intereses y comisiones bancarias' },
  { valor: 'impuestos_municipales', etiqueta: 'Impuestos y tasas municipales', ayuda: 'El ISR y las multas no son deducibles (Reglamento ISR art. 50).' },
  { valor: 'papeleria', etiqueta: 'Papelería y útiles de oficina' },
  { valor: 'servicios', etiqueta: 'Otros servicios contratados' },
  { valor: 'otros', etiqueta: 'Otros gastos' },
]

export function etiquetaCategoria(valor: string) {
  return CATEGORIAS_GASTO.find((c) => c.valor === valor)?.etiqueta ?? valor
}

export const TIPOS_DOCUMENTO_GASTO = [
  { valor: 'factura', etiqueta: 'Factura (con CAI)' },
  { valor: 'recibo', etiqueta: 'Recibo' },
  { valor: 'planilla', etiqueta: 'Planilla' },
  { valor: 'otro', etiqueta: 'Otro documento' },
] as const

export type Gasto = {
  id: string
  fecha: string
  tipo_documento: string
  numero_documento: string | null
  nombre_proveedor: string
  rtn_proveedor: string | null
  categoria: string
  descripcion: string | null
  subtotal_gravado_15: number
  subtotal_gravado_18: number
  subtotal_exento: number
  subtotal_exonerado: number
  isv_15: number
  isv_18: number
  total: number
  deducible_isr: boolean
}

export type TotalesFiscales = {
  gravado15: number
  gravado18: number
  exento: number
  exonerado: number
  isv15: number
  isv18: number
  total: number
}

export const TOTALES_VACIOS: TotalesFiscales = { gravado15: 0, gravado18: 0, exento: 0, exonerado: 0, isv15: 0, isv18: 0, total: 0 }

// Suma documentos (facturas, compras o gastos) que tengan los campos fiscales estándar
export function sumarDocumentos(
  docs: {
    subtotal_gravado_15?: number | null
    subtotal_gravado_18?: number | null
    subtotal_exento?: number | null
    subtotal_exonerado?: number | null
    isv_15?: number | null
    isv_18?: number | null
    total?: number | null
  }[]
): TotalesFiscales {
  return docs.reduce<TotalesFiscales>(
    (acc, d) => ({
      gravado15: acc.gravado15 + Number(d.subtotal_gravado_15 || 0),
      gravado18: acc.gravado18 + Number(d.subtotal_gravado_18 || 0),
      exento: acc.exento + Number(d.subtotal_exento || 0),
      exonerado: acc.exonerado + Number(d.subtotal_exonerado || 0),
      isv15: acc.isv15 + Number(d.isv_15 || 0),
      isv18: acc.isv18 + Number(d.isv_18 || 0),
      total: acc.total + Number(d.total || 0),
    }),
    { ...TOTALES_VACIOS }
  )
}

export function sumarTotales(a: TotalesFiscales, b: TotalesFiscales): TotalesFiscales {
  return {
    gravado15: a.gravado15 + b.gravado15,
    gravado18: a.gravado18 + b.gravado18,
    exento: a.exento + b.exento,
    exonerado: a.exonerado + b.exonerado,
    isv15: a.isv15 + b.isv15,
    isv18: a.isv18 + b.isv18,
    total: a.total + b.total,
  }
}

export type ResumenCategoria = {
  categoria: string
  etiqueta: string
  cantidad: number
  totalSinIsv: number
  sinFactura: number // cuántos no tienen factura (pueden no ser aceptados como deducción)
}

// Resumen para la declaración de renta: gasto sin ISV por categoría.
// Solo incluye los marcados como deducibles (gastos del negocio).
export function resumirPorCategoria(gastos: Gasto[]): ResumenCategoria[] {
  const mapa = new Map<string, ResumenCategoria>()
  for (const g of gastos) {
    if (!g.deducible_isr) continue
    const r = mapa.get(g.categoria) ?? {
      categoria: g.categoria,
      etiqueta: etiquetaCategoria(g.categoria),
      cantidad: 0,
      totalSinIsv: 0,
      sinFactura: 0,
    }
    r.cantidad += 1
    r.totalSinIsv += Number(g.total || 0) - Number(g.isv_15 || 0) - Number(g.isv_18 || 0)
    if (g.tipo_documento !== 'factura') r.sinFactura += 1
    mapa.set(g.categoria, r)
  }
  const orden = CATEGORIAS_GASTO.map((c) => c.valor)
  return [...mapa.values()].sort((a, b) => orden.indexOf(a.categoria) - orden.indexOf(b.categoria))
}
