export function formatearMoneda(valor: number | null | undefined) {
  return new Intl.NumberFormat('es-HN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor ?? 0)
}
// "2026-10-31" -> "31/10/2026". Sin conversión de zona horaria, para que la fecha no se corra un día.
export function formatearFecha(fecha: string | null | undefined) {
  if (!fecha) return ''
  const [anio, mes, dia] = fecha.slice(0, 10).split('-')
  if (!anio || !mes || !dia) return fecha
  return `${dia}/${mes}/${anio}`
}

export function formatearNumeroDocumento(puntoEmision: string | null | undefined, numero: number | null | undefined) {
  const base = puntoEmision || '000-001-01'
  const correlativo = String(numero ?? 0).padStart(8, '0')
  return `${base}-${correlativo}`
}

// Nombres cortos y estándar para guardar documentos en las carpetas de clientes:
//   Factura    "000-001-01-00000005" -> "Fac-0005"
//   Cotización "COT-0012"            -> "Cot-0012"
//   Recibo     "REC-0004"            -> "Rec-0004"
// Usa 4 dígitos mínimo; si el número pasa de 9999 usa los que hagan falta.
function nombreCorto(prefijo: string, numeroDocumento: string | null | undefined, respaldo: string) {
  const ultimo = (numeroDocumento || '').split('-').pop() || ''
  const numero = parseInt(ultimo, 10)
  if (Number.isNaN(numero)) return respaldo
  return `${prefijo}-${String(numero).padStart(4, '0')}`
}

export const nombreArchivoFactura = (numero: string | null | undefined) => nombreCorto('Fac', numero, 'Factura')
export const nombreArchivoCotizacion = (numero: string | null | undefined) => nombreCorto('Cot', numero, 'Cotizacion')
export const nombreArchivoRecibo = (numero: string | null | undefined) => nombreCorto('Rec', numero, 'Recibo')

// Compara números de documento respetando el valor numérico:
// "COT-0009" < "COT-0010" < "COT-10000" y "000-001-01-00000009" < "000-001-01-00000010"
export function compararNumeroDocumento(a: string | null | undefined, b: string | null | undefined) {
  return (a || '').localeCompare(b || '', 'es', { numeric: true })
}
