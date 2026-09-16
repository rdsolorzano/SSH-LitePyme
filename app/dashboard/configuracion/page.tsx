import { createClient } from '@/lib/supabase/server'
import { obtenerEmpresaActiva } from '@/lib/empresa'
import ConfiguracionForm from './configuracion-form'
import CaiRangos from './cai-rangos'

export default async function ConfiguracionPage() {
  const { empresaActiva } = await obtenerEmpresaActiva()
  if (!empresaActiva) return <div>Primero selecciona una empresa.</div>

  const supabase = await createClient()
  const { data: empresa } = await supabase
    .from('empresas')
    .select('id, razon_social, nombre_comercial, nombre_impresion, nombre_documento_origen, rtn, direccion, telefono, correo_electronico, sitio_web, regimen_fiscal, logo_url')
    .eq('id', empresaActiva.id)
    .single()
  const { data: caiRangos } = await supabase
    .from('cai_rangos')
    .select('id, cai, tipo_documento, punto_emision, rango_inicial, rango_final, correlativo_actual, fecha_limite_emision, activo')
    .eq('empresa_id', empresaActiva.id)
    .order('created_at', { ascending: false })

  if (!empresa) return <div>No se encontró la empresa.</div>

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold text-[#1B2430]">Configuración de empresa</h1>
      <ConfiguracionForm empresa={empresa} />
      <div className="mt-6">
        <CaiRangos caiRangos={caiRangos || []} />
      </div>
    </>
  )
}