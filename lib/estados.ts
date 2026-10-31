// Estados de cada módulo en un solo lugar: valor guardado, texto visible y color.

export type Estado = {
  valor: string
  etiqueta: string
  color: string
  seleccionable: boolean // false = lo asigna el sistema, no aparece en el selector
}

export const ESTADOS_COTIZACION: Estado[] = [
  { valor: 'pendiente', etiqueta: 'Pendiente', color: 'text-amber-600', seleccionable: true },
  { valor: 'enviada', etiqueta: 'Enviada', color: 'text-blue-600', seleccionable: true },
  { valor: 'aprobada', etiqueta: 'Aprobada', color: 'text-green-600', seleccionable: true },
  { valor: 'rechazada', etiqueta: 'Rechazada', color: 'text-red-600', seleccionable: true },
  { valor: 'convertida', etiqueta: 'Convertida', color: 'text-acento', seleccionable: false },
]

export const ESTADOS_ORDEN: Estado[] = [
  { valor: 'pendiente', etiqueta: 'Pendiente', color: 'text-amber-600', seleccionable: true },
  { valor: 'en_proceso', etiqueta: 'En proceso', color: 'text-blue-600', seleccionable: true },
  { valor: 'completado', etiqueta: 'Completado', color: 'text-green-600', seleccionable: true },
  { valor: 'cancelado', etiqueta: 'Cancelado', color: 'text-red-600', seleccionable: true },
]

// Devuelve la información de un estado; si no existe, muestra el valor tal cual
export function infoEstado(lista: Estado[], valor: string): Estado {
  return lista.find((e) => e.valor === valor) ?? { valor, etiqueta: valor, color: '', seleccionable: false }
}
