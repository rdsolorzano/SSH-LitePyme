import { obtenerEmpresaActiva } from '@/lib/empresa'
import { createClient } from '@/lib/supabase/server'
import DashboardCharts from './dashboard-charts'

export default async function DashboardPage() {
  const { empresaActiva } = await obtenerEmpresaActiva()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const nombreCompleto = user?.user_metadata?.full_name as string | undefined
  const identificacionUsuario = nombreCompleto ? `${nombreCompleto} — ${user?.email}` : user?.email

  if (!empresaActiva) {
    return (
      <div className="rounded-lg bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-[#1B2430]">No tienes ninguna empresa asignada</h1>
        <p className="mt-2 text-sm text-gray-500">Contacta al administrador para que te vincule a una.</p>
      </div>
    )
  }

  const seisMesesAtras = new Date()
  seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 5)
  seisMesesAtras.setDate(1)
  const fechaSeisMeses = seisMesesAtras.toISOString().split('T')[0]

  const { data: facturasSeisMeses } = await supabase
    .from('facturas')
    .select('fecha, total')
    .eq('empresa_id', empresaActiva.id)
    .gte('fecha', fechaSeisMeses)

  const nombresMes = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const mapaMeses: Record<string, number> = {}
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const clave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    mapaMeses[clave] = 0
  }
  for (const f of facturasSeisMeses || []) {
    const clave = f.fecha.slice(0, 7)
    if (clave in mapaMeses) mapaMeses[clave] += f.total || 0
  }
  const ventasPorMes = Object.entries(mapaMeses).map(([clave, total]) => {
    const mes = parseInt(clave.split('-')[1], 10) - 1
    return { mes: nombresMes[mes], total }
  })

  const primerDiaMesActual = new Date()
  primerDiaMesActual.setDate(1)
  const fechaMesActual = primerDiaMesActual.toISOString().split('T')[0]

  const { data: facturasMesActual } = await supabase
    .from('facturas')
    .select('subtotal_gravado_15, subtotal_gravado_18, subtotal_exento')
    .eq('empresa_id', empresaActiva.id)
    .gte('fecha', fechaMesActual)

  const totalesIsv = (facturasMesActual || []).reduce(
    (acc, f) => ({
      gravado15: acc.gravado15 + (f.subtotal_gravado_15 || 0),
      gravado18: acc.gravado18 + (f.subtotal_gravado_18 || 0),
      exento: acc.exento + (f.subtotal_exento || 0),
    }),
    { gravado15: 0, gravado18: 0, exento: 0 }
  )
  const distribucionIsv = [
    { name: 'Gravado 15%', value: totalesIsv.gravado15 },
    { name: 'Gravado 18%', value: totalesIsv.gravado18 },
    { name: 'Exento', value: totalesIsv.exento },
  ].filter((d) => d.value > 0)

  const noventaDiasAtras = new Date()
  noventaDiasAtras.setDate(noventaDiasAtras.getDate() - 90)
  const fecha90 = noventaDiasAtras.toISOString().split('T')[0]

  const { data: facturas90 } = await supabase
    .from('facturas')
    .select('total, clientes(nombre)')
    .eq('empresa_id', empresaActiva.id)
    .gte('fecha', fecha90)

  const totalesPorCliente: Record<string, number> = {}
  for (const f of (facturas90 || []) as any[]) {
    const nombre = f.clientes?.nombre || 'Sin nombre'
    totalesPorCliente[nombre] = (totalesPorCliente[nombre] || 0) + (f.total || 0)
  }
  const topClientes = Object.entries(totalesPorCliente)
    .map(([nombre, total]) => ({ nombre, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  const { data: ordenes } = await supabase
    .from('ordenes_trabajo')
    .select('estado')
    .eq('empresa_id', empresaActiva.id)

  const conteoEstados: Record<string, number> = {}
  for (const o of ordenes || []) {
    conteoEstados[o.estado] = (conteoEstados[o.estado] || 0) + 1
  }
  const etiquetasEstado: Record<string, string> = {
    pendiente: 'Pendiente',
    en_proceso: 'En proceso',
    completado: 'Completado',
    cancelado: 'Cancelado',
  }
  const ordenesPorEstado = Object.entries(conteoEstados).map(([estado, cantidad]) => ({
    estado: etiquetasEstado[estado] || estado,
    cantidad,
  }))

  return (
    <div>
      <div className="flex items-center gap-4">
        {empresaActiva.logo_url && (
          <img src={empresaActiva.logo_url} alt="" className="h-46 w-46 object-contain" />
        )}
        <h1 className="text-4xl font-bold text-[#1B2430]">
          {empresaActiva.nombre_comercial || empresaActiva.razon_social}
        </h1>
      </div>
      <p className="mt-1 text-sm text-gray-500">&nbsp;&nbsp;Ver. 4.2.4</p>
      <p className="mt-1 text-sm text-gray-500">&nbsp;&nbsp;17:44 | 04.10.26</p>
      <p className="mt-1 text-sm text-gray-500">&nbsp;&nbsp;</p>
      <p className="mt-1 text-2xl text-gray-500">Bienvenido a tu panel de control</p>
      <p className="mt-1 text-2xl text-gray-500">Usuario: {identificacionUsuario}</p>
      <p className="mt-1 text-sm text-gray-500">&nbsp;&nbsp;</p>
      <p className="mt-1 text-sm text-gray-500">&nbsp;&nbsp;</p>

      <DashboardCharts
        ventasPorMes={ventasPorMes}
        distribucionIsv={distribucionIsv}
        topClientes={topClientes}
        ordenesPorEstado={ordenesPorEstado}
      />
    </div>
  )
}