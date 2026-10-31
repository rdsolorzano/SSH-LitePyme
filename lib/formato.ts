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