export type DatosExoneracion = {
  noConstancia: string
  noRegistroSag: string
  noOrdenCompra: string
}

export const exoneracionVacia: DatosExoneracion = {
  noConstancia: '',
  noRegistroSag: '',
  noOrdenCompra: '',
}

// Campos extra que traen facturas y cotizaciones desde la base de datos
export type ExoneracionDoc = {
  exonerado?: boolean | null
  subtotal_exonerado?: number | null
  no_constancia_exonerado?: string | null
  no_registro_sag?: string | null
  no_orden_compra_exenta?: string | null
}

export function calcularTotales(
  items: { precioUnitario: number; cantidad: number; tasaIsv: number }[],
  exonerado: boolean
) {
  let gravado15 = 0
  let gravado18 = 0
  let exento = 0
  let importeExonerado = 0

  for (const it of items) {
    const s = it.precioUnitario * it.cantidad
    if (exonerado) importeExonerado += s
    else if (it.tasaIsv === 15) gravado15 += s
    else if (it.tasaIsv === 18) gravado18 += s
    else exento += s
  }

  const isv15 = gravado15 * 0.15
  const isv18 = gravado18 * 0.18
  const total = gravado15 + gravado18 + exento + importeExonerado + isv15 + isv18

  return { gravado15, gravado18, exento, exonerado: importeExonerado, isv15, isv18, total }
}