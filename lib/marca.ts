// Datos de la aplicación en un solo lugar.
// Al publicar una versión nueva, cambia SOLO "version" aquí.
// Formato MAYOR.MENOR.PARCHE:
//   MAYOR  -> cambio grande o módulo nuevo (5.3.1 -> 6.0.0)
//   MENOR  -> funcionalidad nueva dentro de un módulo (6.0.0 -> 6.1.0)
//   PARCHE -> corrección o ajuste pequeño (6.1.0 -> 6.1.1)
export const MARCA = {
  nombre: 'LitePyme',
  firma: 'SSH',
  nombreCompleto: 'SSH>_ LitePyme',
  tituloPestana: 'SSH>_ LitePyme',
  descripcion: 'Sistema de gestión de inventario, compras, clientes y facturación',
  version: '6.1.0',
  colorTema: '#2563eb',
} as const

// Fecha y hora de la publicación. Se genera sola al compilar (ver next.config.ts).
export const FECHA_PUBLICACION = process.env.NEXT_PUBLIC_FECHA_PUBLICACION ?? ''
