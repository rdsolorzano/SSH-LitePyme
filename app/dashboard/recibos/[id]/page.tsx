import { createClient } from '@/lib/supabase/server'
import { obtenerEmpresaActiva, nombreDocumento } from '@/lib/empresa'
import Link from 'next/link'
import DescargarPdfBoton from './descargar-pdf-boton'

export default async function DetalleReciboPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { empresaActiva } = await obtenerEmpresaActiva()
  if (!empresaActiva) return <div>Primero selecciona una empresa.</div>

  const { data: recibo } = await supabase.from('recibos').select('*, clientes(nombre)').eq('id', id).single()
  const { data: empresa } = await supabase
    .from('empresas')
    .select('razon_social, nombre_comercial, nombre_impresion, nombre_documento_origen, direccion, telefono, correo_electronico, logo_url')
    .eq('id', empresaActiva.id)
    .single()
  const { data: items } = await supabase.from('detalle_recibos').select('*').eq('recibo_id', id)

  if (!recibo || !empresa) return <div>Recibo no encontrado.</div>

  return (
    <>
      <div className="mb-4 flex justify-between print:hidden">
        <Link href="/dashboard/recibos" className="text-sm text-[#0E7C86] hover:underline">← Volver</Link>
        <DescargarPdfBoton
          empresa={{ nombre: nombreDocumento(empresa), direccion: empresa.direccion, telefono: empresa.telefono, correo_electronico: empresa.correo_electronico, logo_url: empresa.logo_url }}
          cliente={{ nombre: recibo.clientes?.nombre }}
          recibo={recibo}
          items={(items || []).map((i) => ({ descripcion: i.descripcion, cantidad: i.cantidad, precio_unitario: i.precio_unitario, subtotal: i.subtotal }))}
        />
      </div>
      <p className="text-sm text-gray-500">Recibo {recibo.numero} — Total: L. {recibo.total}</p>
    </>
  )
}