import { createClient } from '@/lib/supabase/server'
import { obtenerEmpresaActiva } from '@/lib/empresa'
import NuevaFacturaForm from './nueva-factura-form'
import Link from 'next/link'
import { formatearMoneda } from '@/lib/formato'
import ListaFacturas from './lista-facturas'

export default async function FacturasPage() {
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

  const { data: caiRangos } = await supabase
    .from('cai_rangos')
    .select('id, cai, punto_emision')
    .eq('empresa_id', empresaActiva.id)
    .eq('activo', true)

  const { data: facturas } = await supabase
    .from('facturas')
    .select('id, numero_correlativo, fecha, total, clientes(nombre)')
    .eq('empresa_id', empresaActiva.id)
    .order('fecha', { ascending: false })
    .limit(200)

  return (
    <>

      <h1 className="my-4 text-2xl font-bold">Facturación</h1>

      {(!caiRangos || caiRangos.length === 0) && (
        <p className="mb-4 text-sm text-amber-600">
          No tienes un rango CAI activo. No podrás emitir facturas hasta que se configure uno.
        </p>
      )}

      <NuevaFacturaForm productos={productos || []} clientes={clientes || []} caiRangos={caiRangos || []} />

      <h2 className="mb-2 text-lg font-semibold">Facturas emitidas</h2>
      <ListaFacturas
        facturas={(facturas || []).map((f: any) => ({
          id: f.id,
          numero_correlativo: f.numero_correlativo,
          fecha: f.fecha,
          total: f.total,
          clientes: f.clientes ? { nombre: Array.isArray(f.clientes) ? f.clientes[0]?.nombre : f.clientes.nombre } : null,
        }))}
      />
    </>
  )
}