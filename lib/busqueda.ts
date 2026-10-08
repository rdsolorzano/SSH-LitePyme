export function limpiarBusqueda(texto: string | undefined) {
  return (texto || '').replace(/[,()*%\\"]/g, ' ').replace(/\s+/g, ' ').trim()
}