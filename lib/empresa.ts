import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export async function obtenerEmpresaActiva() {
  const supabase = await createClient()

  const { data: empresas } = await supabase
    .from('empresas')
    .select('id, razon_social, nombre_comercial, logo_url')

  if (!empresas || empresas.length === 0) {
    return { empresas: [], empresaActiva: null }
  }

  const cookieStore = await cookies()
  const empresaActivaId = cookieStore.get('empresa_activa')?.value

  const empresaActiva = empresas.find((e) => e.id === empresaActivaId) || empresas[0]

  return { empresas, empresaActiva }
}
export function nombreDocumento(empresa: {
  razon_social: string
  nombre_comercial?: string | null
  nombre_impresion?: string | null
  nombre_documento_origen?: string | null
}) {
  if (empresa.nombre_documento_origen === 'nombre_comercial' && empresa.nombre_comercial) {
    return empresa.nombre_comercial
  }
  if (empresa.nombre_documento_origen === 'nombre_impresion' && empresa.nombre_impresion) {
    return empresa.nombre_impresion
  }
  return empresa.razon_social
}