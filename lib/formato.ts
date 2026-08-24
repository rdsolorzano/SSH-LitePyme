export function formatearMoneda(valor: number | null | undefined) {
  return new Intl.NumberFormat('es-HN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor ?? 0)
}