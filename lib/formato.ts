export function formatearMoneda(valor: number | null | undefined) {
  return new Intl.NumberFormat('es-HN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor ?? 0)
}
export function formatearNumeroDocumento(puntoEmision: string | null | undefined, numero: number | null | undefined) {
  const base = puntoEmision || '000-001-01'
  const correlativo = String(numero ?? 0).padStart(8, '0')
  return `${base}-${correlativo}`
}