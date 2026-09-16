'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { obtenerEmpresaActiva } from '@/lib/empresa'

export async function actualizarEmpresa(formData: FormData) {
  const { empresaActiva } = await obtenerEmpresaActiva()
  if (!empresaActiva) return

  const supabase = await createClient()

  await supabase
    .from('empresas')
    .update({
      razon_social: formData.get('razon_social') as string,
      nombre_comercial: formData.get('nombre_comercial') as string,
      nombre_impresion: formData.get('nombre_impresion') as string,
      nombre_documento_origen: formData.get('nombre_documento_origen') as string,
      rtn: formData.get('rtn') as string,
      direccion: formData.get('direccion') as string,
      telefono: formData.get('telefono') as string,
      correo_electronico: formData.get('correo_electronico') as string,
      sitio_web: formData.get('sitio_web') as string,
      regimen_fiscal: formData.get('regimen_fiscal') as string,
    })
    .eq('id', empresaActiva.id)

  revalidatePath('/dashboard', 'layout')
}

export async function actualizarLogo(empresaId: string, logoUrl: string) {
  const supabase = await createClient()
  await supabase.from('empresas').update({ logo_url: logoUrl }).eq('id', empresaId)
  revalidatePath('/dashboard', 'layout')
}
export async function crearCaiRango(formData: FormData) {
  const { empresaActiva } = await obtenerEmpresaActiva()
  if (!empresaActiva) return { error: 'No hay empresa activa' }

  const supabase = await createClient()

  const rangoInicial = Number(formData.get('rango_inicial'))
  const rangoFinal = Number(formData.get('rango_final'))

  if (!rangoInicial || !rangoFinal || rangoFinal < rangoInicial) {
    return { error: 'El rango final debe ser mayor o igual al rango inicial' }
  }

  const { error } = await supabase.from('cai_rangos').insert({
    empresa_id: empresaActiva.id,
    cai: formData.get('cai') as string,
    tipo_documento: formData.get('tipo_documento') as string,
    punto_emision: formData.get('punto_emision') as string,
    rango_inicial: rangoInicial,
    rango_final: rangoFinal,
    correlativo_actual: rangoInicial - 1,
    fecha_limite_emision: formData.get('fecha_limite_emision') as string,
  })

  if (error) return { error: 'No se pudo guardar el CAI' }

  revalidatePath('/dashboard/configuracion')
  return { ok: true }
}

export async function actualizarCaiRango(id: string, formData: FormData) {
  const supabase = await createClient()

  await supabase
    .from('cai_rangos')
    .update({
      fecha_limite_emision: formData.get('fecha_limite_emision') as string,
      punto_emision: formData.get('punto_emision') as string,
    })
    .eq('id', id)

  revalidatePath('/dashboard/configuracion')
  return { ok: true }
}

export async function alternarActivoCaiRango(id: string, activo: boolean) {
  const supabase = await createClient()
  await supabase.from('cai_rangos').update({ activo }).eq('id', id)
  revalidatePath('/dashboard/configuracion')
}