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

// Nombre corto y estándar para guardar facturas: "000-001-01-00000005" -> "Fac-0005"
// (usa 4 dígitos mínimo; si el correlativo pasa de 9999 usa los que hagan falta)
export function nombreArchivoFactura(numeroCorrelativo: string | null | undefined) {
  const ultimo = (numeroCorrelativo || '').split('-').pop() || ''
  const numero = parseInt(ultimo, 10)
  if (Number.isNaN(numero)) return 'Factura'
  return `Fac-${String(numero).padStart(4, '0')}`
}
