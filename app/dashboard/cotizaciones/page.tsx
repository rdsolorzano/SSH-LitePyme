import { createClient } from '@/lib/supabase/server'
import { obtenerEmpresaActiva } from '@/lib/empresa'
import NuevaCotizacionForm from './nueva-cotizacion-form'
import Link from 'next/link'
import { formatearMoneda } from '@/lib/formato'
import ListaCotizaciones from './lista-cotizaciones'

export default async function CotizacionesPage() {
  const { empresaActiva } = await obtenerEmpresaActiva()
  if (!empresaActiva) {
    return <div className="p-8">Primero selecciona una empresa desde el dashboard.</div>
  }

  const supabase = await createClient()

  const { data: productos } = await supabase
    .from('productos_servicios')
    .select('id, descripcion, precio_unitario, tasa_isv')
    .eq('empresa_id', empresaActiva.id)
    .eq('activo', true)
    .order('descripcion')

  const { data: clientes } = await supabase
    .from('clientes')
    .select('id, nombre')
    .eq('empresa_id', empresaActiva.id)
    .eq('activo', true)
    .order('nombre')

  const { data: cotizaciones } = await supabase
    .from('cotizaciones')
    .select('id, numero, fecha, total, estado, clientes(nombre)')
    .eq('empresa_id', empresaActiva.id)
    .order('fecha', { ascending: false })
    .limit(200)

  const colorEstado: Record<string, string> = {
    pendiente: 'text-amber-600',
    aprobada: 'text-green-600',
    rechazada: 'text-red-600',
    convertida: 'text-blue-600',
  }

  return (
    <>

      <h1 className="my-4 text-2xl font-bold">Cotizaciones</h1>

      <NuevaCotizacionForm productos={productos || []} clientes={clientes || []} />

      <h2 className="mb-2 text-lg font-semibold">Cotizaciones recientes</h2>
      <ListaCotizaciones
        cotizaciones={(cotizaciones || []).map((c: any) => ({
          id: c.id,
          numero: c.numero,
          fecha: c.fecha,
          total: c.total,
          estado: c.estado,
          clientes: c.clientes ? { nombre: Array.isArray(c.clientes) ? c.clientes[0]?.nombre : c.clientes.nombre } : null,
        }))}
      />
    </>
  )
}