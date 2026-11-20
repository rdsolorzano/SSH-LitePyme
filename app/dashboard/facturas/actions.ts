'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { obtenerEmpresaActiva } from '@/lib/empresa'
import { exigirPermiso } from '@/lib/permisos'
import { type DatosExoneracion } from '@/lib/exoneracion'

export type ItemFactura = {
  productoId: string
  descripcion: string
  cantidad: number
  precioUnitario: number
  tasaIsv: number
}

// Mensajes de la función crear_factura de la base de datos
const MENSAJES: Record<string, string> = {
  SIN_PERMISO: 'Tu usuario no tiene permiso para facturar.',
  SIN_ACCESO: 'No tienes acceso a esta empresa.',
  NO_AUTENTICADO: 'Tu sesión expiró. Vuelve a ingresar.',
  SIN_ITEMS: 'Agrega al menos una línea a la factura.',
  CLIENTE_INVALIDO: 'El cliente no pertenece a esta empresa.',
  FALTAN_DATOS_EXONERACION: 'Cliente exonerado: indica No. Constancia Exonerado y No. Orden de Compra Exenta.',
  COTIZACION_NO_ENCONTRADA: 'No se encontró la cotización.',
  COTIZACION_YA_CONVERTIDA: 'Esta cotización ya se convirtió en factura.',
  CAI_NO_ENCONTRADO: 'No se encontró el rango CAI.',
  CAI_INACTIVO: 'El rango CAI está inactivo.',
  CAI_VENCIDO: 'El CAI venció. Debes solicitar uno nuevo ante el SAR.',
  CAI_AGOTADO: 'Se agotó el rango autorizado de este CAI. Solicita uno nuevo.',
  CANTIDAD_INVALIDA: 'Hay una línea con cantidad en cero o negativa.',
  PRECIO_INVALIDO: 'Hay una línea con precio negativo.',
  PRODUCTO_INVALIDO: 'Hay un producto que no pertenece a esta empresa.',
}

function mensajeError(error: { message?: string; code?: string } | null) {
  const texto = error?.message || ''
  if (error?.code === 'PGRST202' || /could not find the function/i.test(texto)) {
    return 'Falta ejecutar la migración 2026-11-21_seguridad_facturacion.sql en Supabase.'
  }
  const codigo = Object.keys(MENSAJES).find((c) => texto.includes(c))
  return codigo ? MENSAJES[codigo] : 'No se pudo guardar la factura. No se usó ningún número del CAI.'
}

// Crea la factura en UNA sola operación de la base de datos (función crear_factura):
// encabezado, líneas, inventario y correlativo del CAI se guardan juntos o no se guarda nada.
// La base de datos calcula los totales, bloquea el CAI mientras numera y usa la fecha de Honduras.
export async function crearFactura(
  clienteId: string,
  caiRangoId: string,
  items: ItemFactura[],
  exoneracion?: DatosExoneracion,
  cotizacionId?: string
) {
  const { empresaActiva } = await obtenerEmpresaActiva()
  if (!empresaActiva || items.length === 0) return { error: 'Datos incompletos' }

  const bloqueo = await exigirPermiso('ventas')
  if (bloqueo) return { error: bloqueo }

  const supabase = await createClient()

  const { data: facturaId, error } = await supabase.rpc('crear_factura', {
    p_empresa_id: empresaActiva.id,
    p_cliente_id: clienteId,
    p_cai_rango_id: caiRangoId,
    p_items: items.map((item) => ({
      producto_id: item.productoId,
      descripcion: item.descripcion || null,
      cantidad: item.cantidad,
      precio_unitario: item.precioUnitario,
      tasa_isv: item.tasaIsv,
    })),
    p_exoneracion: exoneracion
      ? {
          no_constancia: exoneracion.noConstancia,
          no_registro_sag: exoneracion.noRegistroSag,
          no_orden_compra: exoneracion.noOrdenCompra,
        }
      : null,
    p_cotizacion_id: cotizacionId ?? null,
  })

  if (error || !facturaId) return { error: mensajeError(error) }

  revalidatePath('/dashboard/facturas')
  revalidatePath('/dashboard/productos')
  revalidatePath('/dashboard')

  return { facturaId: facturaId as string }
}
