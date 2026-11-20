import { createClient } from '@/lib/supabase/server'
import { obtenerEmpresaActiva } from '@/lib/empresa'
import Link from 'next/link'
import type { Metadata } from 'next'
import BotonVolver from '@/components/BotonVolver'
import HojaCosteo from './hoja-costeo'
import { formatearFecha } from '@/lib/formato'
import { ESTADOS_COTIZACION, infoEstado } from '@/lib/estados'
import { rutaConOrigen } from '@/lib/navegacion'
import { lineaDesdeBd, parametrosDesdeBd, precioSinIsv } from '@/lib/costeo'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('cotizaciones').select('numero').eq('id', id).single()
  return { title: `Costeo ${data?.numero ?? ''}`.trim() }
}

// Hoja de costos interna de una cotización. Nunca se imprime ni se envía al cliente.
export default async function CosteoCotizacionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ volver?: string }>
}) {
  const { id } = await params
  const { volver } = await searchParams
  const { empresaActiva } = await obtenerEmpresaActiva()
  if (!empresaActiva) return <div className="p-8">Primero selecciona una empresa.</div>

  const supabase = await createClient()

  const { data: cotizacion } = await supabase
    .from('cotizaciones')
    .select('id, numero, fecha, estado, subtotal_gravado_15, subtotal_gravado_18, subtotal_exento, subtotal_exonerado, clientes(nombre)')
    .eq('id', id)
    .single()

  if (!cotizacion) return <div className="p-8">Cotización no encontrada.</div>

  const { data: detalle } = await supabase
    .from('detalle_cotizaciones')
    .select('producto_id, descripcion, cantidad, productos_servicios(descripcion, costo_unitario, tipo)')
    .eq('cotizacion_id', id)

  const { data: costeo } = await supabase
    .from('costeos_cotizacion')
    .select('*')
    .eq('cotizacion_id', id)
    .maybeSingle()

  const { data: lineasBd } = costeo
    ? await supabase.from('costeo_lineas').select('*').eq('costeo_id', costeo.id).order('orden')
    : { data: [] }

  const { data: parametrosEmpresa } = await supabase
    .from('parametros_costeo')
    .select('*')
    .eq('empresa_id', empresaActiva.id)
    .maybeSingle()

  const { data: productos } = await supabase
    .from('productos_servicios')
    .select('id, descripcion, costo_unitario, tipo')
    .eq('empresa_id', empresaActiva.id)
    .eq('activo', true)
    .order('descripcion')

  const unoSolo = <T,>(v: T | T[] | null | undefined) => (Array.isArray(v) ? v[0] : v) ?? null
  const cliente = unoSolo(cotizacion.clientes as { nombre: string } | { nombre: string }[] | null)
  const estado = infoEstado(ESTADOS_COTIZACION, cotizacion.estado)
  const soloLectura = !!costeo?.estimado_cerrado || cotizacion.estado === 'convertida'

  // Materiales sugeridos: los productos (no servicios) de la cotización, a su último costo de compra
  const materialesCotizacion = (detalle || [])
    .map((d: any) => {
      const prod = unoSolo(d.productos_servicios) as { descripcion: string; costo_unitario: number | null; tipo: string } | null
      return {
        productoId: d.producto_id as string,
        descripcion: (d.descripcion || prod?.descripcion || '') as string,
        cantidad: Number(d.cantidad) || 0,
        costoUnitario: Number(prod?.costo_unitario) || 0,
        esProducto: prod?.tipo === 'producto',
      }
    })
    .filter((m) => m.esProducto)

  const rutaCotizacion = rutaConOrigen(`/dashboard/cotizaciones/${id}`, volver)

  return (
    <div className="mx-auto max-w-6xl p-4 print:hidden">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <BotonVolver href={`/dashboard/cotizaciones/${id}`} />
        <Link href={rutaCotizacion} className="text-sm text-acento hover:underline">
          Ver cotización {cotizacion.numero}
        </Link>
      </div>

      <div className="mb-4">
        <p className="text-xs uppercase tracking-wide text-gray-400">Costeo interno · no lo ve el cliente</p>
        <h1 className="text-2xl font-bold text-marca">
          Costeo de <span className="font-mono">{cotizacion.numero}</span>
        </h1>
        <p className="text-sm text-gray-500">
          {cliente?.nombre || 'Sin cliente'} · {formatearFecha(cotizacion.fecha)} ·{' '}
          <span className={estado.color}>{estado.etiqueta}</span>
        </p>
      </div>

      {!parametrosEmpresa && !costeo && (
        <div className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-300">
          Aún no configuras tus parámetros de costeo (costo por hora, gastos fijos, margen…).{' '}
          <Link href="/dashboard/configuracion" className="font-semibold underline">
            Configúralos aquí
          </Link>{' '}
          para que el cálculo sea completo. Mientras tanto puedes costear con valores en cero.
        </div>
      )}

      <HojaCosteo
        cotizacionId={id}
        precioCotizado={precioSinIsv(cotizacion)}
        soloLectura={soloLectura}
        existe={!!costeo}
        rubroInicial={costeo?.rubro ?? 'general'}
        notasIniciales={costeo?.notas ?? ''}
        parametrosHoja={parametrosDesdeBd(costeo ?? parametrosEmpresa ?? null)}
        parametrosActuales={parametrosEmpresa ? parametrosDesdeBd(parametrosEmpresa) : null}
        lineasIniciales={(lineasBd || []).map(lineaDesdeBd)}
        materialesCotizacion={materialesCotizacion}
        productos={(productos || []).map((p: any) => ({
          id: p.id as string,
          descripcion: p.descripcion as string,
          costoUnitario: Number(p.costo_unitario) || 0,
        }))}
      />
    </div>
  )
}
