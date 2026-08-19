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