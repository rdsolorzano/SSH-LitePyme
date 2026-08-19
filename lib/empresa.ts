import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export async function obtenerEmpresaActiva() {
  const supabase = await createClient()

  const { data: empresas } = await supabase
    .from('empresas')
    .select('id, razon_social, nombre_comercial')

  if (!empresas || empresas.length === 0) {
    return { empresas: [], empresaActiva: null }
  }

  const cookieStore = await cookies()
  const empresaActivaId = cookieStore.get('empresa_activa')?.value

  let empresaActiva = empresas.find((e) => e.id === empresaActivaId) || null

  if (!empresaActiva && empresas.length === 1) {
    empresaActiva = empresas[0]
  }

  return { empresas, empresaActiva }
}