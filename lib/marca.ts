// Datos de la aplicación en un solo lugar.
// Al publicar una versión nueva, cambia SOLO "version" aquí.
// Formato MAYOR.MENOR.PARCHE (al subir uno, los de la derecha vuelven a 0):
//   MAYOR  -> cambio grande: módulo nuevo, o algo que cambia cómo funciona lo que ya
//             existe (migración que cambia la facturación, permisos nuevos, pantallas
//             que se mueven o se renombran). Los usuarios lo notan.   (6.7.0 -> 7.0.0)
//   MENOR  -> función nueva dentro de un módulo, sin cambiar lo existente
//             (una columna, un filtro, un botón, un indicador).        (7.0.0 -> 7.1.0)
//   PARCHE -> corrección o ajuste pequeño: un error, un texto, un color,
//             una alineación.                                          (7.1.0 -> 7.1.1)
export const MARCA = {
  nombre: 'LitePyme',
  firma: 'SSH',
  nombreCompleto: 'SSH>_ LitePyme',
  tituloPestana: 'SSH>_ LitePyme',
  descripcion: 'Sistema de gestión de inventario, compras, clientes y facturación',
  version: '7.1.1',
  colorTema: '#2563eb',
} as const

// Fecha y hora de la publicación. Se genera sola al compilar (ver next.config.ts).
export const FECHA_PUBLICACION = process.env.NEXT_PUBLIC_FECHA_PUBLICACION ?? ''
