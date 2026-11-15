// Navegación de "Volver" sin depender del historial del navegador.
//
// Cada pantalla de detalle sabe a dónde regresar:
//   1. Si el enlace que la abrió trae "?volver=/ruta", regresa exactamente ahí
//      (por ejemplo a una lista filtrada o a la ficha de un producto).
//   2. Si no, regresa a su pantalla "padre" (detalle -> lista, edición -> detalle).
// Como nunca se usa "atrás" del navegador, no se pueden formar ciclos.

// Solo se aceptan rutas internas del sistema (evita redirigir a sitios externos)
export function destinoVolver(valor: string | null | undefined, porDefecto: string) {
  if (valor && valor.startsWith('/dashboard') && !valor.startsWith('//')) return valor
  return porDefecto
}

// Agrega "?volver=<origen>" a un enlace
export function conVolver(href: string, origen: string | null | undefined) {
  if (!origen) return href
  const separador = href.includes('?') ? '&' : '?'
  return `${href}${separador}volver=${encodeURIComponent(origen)}`
}

// Ruta + filtros actuales, para usarla como origen (ej. "/dashboard/productos?q=cable")
export function rutaConFiltros(ruta: string, filtros: Record<string, string | null | undefined>) {
  const params = new URLSearchParams()
  for (const [clave, valor] of Object.entries(filtros)) if (valor) params.set(clave, valor)
  const query = params.toString()
  return query ? `${ruta}?${query}` : ruta
}

// Ruta de una pantalla de detalle conservando su propio origen,
// para que al abrir otra pantalla desde aquí y volver, se mantenga la cadena completa.
export function rutaConOrigen(ruta: string, volver: string | null | undefined) {
  const origen = volver ? destinoVolver(volver, '') : ''
  return conVolver(ruta, origen || null)
}
