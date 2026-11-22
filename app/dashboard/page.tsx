import { obtenerEmpresaActiva } from '@/lib/empresa'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import DashboardCharts from './dashboard-charts'
import { MARCA, FECHA_PUBLICACION } from '@/lib/marca'
import { ESTADOS_ORDEN, infoEstado } from '@/lib/estados'
import { formatearFecha, formatearMoneda } from '@/lib/formato'
import { etiquetaCortaCategoria, normalizarCategoria, sumarDocumentos, sumarTotales } from '@/lib/gastos'
import { calcularFormulario201, gastoVaEnIsv } from '@/lib/formulario-isv'
import {
  claveMes,
  diasEntre,
  etiquetaMes,
  fechaLimiteIsv,
  hoyHonduras,
  netoSinIsv,
  nombreMes,
  restarDias,
  sumarMeses,
  totalesPorMes,
  ultimosMeses,
  variacion,
} from '@/lib/indicadores'

// ---------------------------------------------------------------------------
// Piezas visuales del panel
// ---------------------------------------------------------------------------

function Tendencia({ valor, invertir = false }: { valor: number | null; invertir?: boolean }) {
  if (valor === null) return <span className="text-xs text-gray-400">sin mes anterior para comparar</span>
  const sube = valor >= 0
  const bueno = invertir ? !sube : sube
  return (
    <span className={`text-xs font-medium ${bueno ? 'text-green-700' : 'text-red-600'}`}>
      {sube ? '▲' : '▼'} {Math.abs(valor).toFixed(1)}% <span className="font-normal text-gray-400">vs mes anterior</span>
    </span>
  )
}

// Colores para resaltar las tarjetas clave: ganancia (azul), egresos (amarillo) e impuesto (rojo)
const COLOR_KPI = {
  normal: { caja: 'bg-white', titulo: 'text-gray-400', valor: 'text-marca' },
  azul: { caja: 'bg-blue-50 ring-2 ring-blue-600', titulo: 'text-blue-700 font-semibold', valor: 'text-blue-800' },
  amarillo: { caja: 'bg-amber-50 ring-2 ring-amber-500', titulo: 'text-amber-700 font-semibold', valor: 'text-amber-800' },
  rojo: { caja: 'bg-red-50 ring-2 ring-red-600', titulo: 'text-red-700 font-semibold', valor: 'text-red-700' },
} as const

// href: la tarjeta completa abre la pantalla donde se ve el detalle de ESE número.
// No se usa en tarjetas que ya tienen un enlace adentro (no se anidan enlaces).
function Kpi({
  titulo,
  valor,
  detalle,
  color = 'normal',
  href,
  children,
}: {
  titulo: string
  valor: string
  detalle?: React.ReactNode
  color?: keyof typeof COLOR_KPI
  href?: string
  children?: React.ReactNode
}) {
  const c = COLOR_KPI[color]
  const contenido = (
    <>
      <p className={`text-xs uppercase tracking-wide ${c.titulo}`}>{titulo}</p>
      <p className={`mt-1 font-mono text-2xl font-bold ${c.valor}`}>{valor}</p>
      {detalle && <div className="mt-1 text-xs text-gray-500">{detalle}</div>}
      {children}
    </>
  )
  if (!href) return <div className={`rounded-lg p-4 shadow-sm ${c.caja}`}>{contenido}</div>
  return (
    <Link
      href={href}
      className={`group flex flex-col rounded-lg p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento ${c.caja}`}
    >
      {contenido}
      <span className="mt-auto pt-2 text-xs font-medium text-acento group-hover:underline">Ver detalle →</span>
    </Link>
  )
}

// Bloque con título que agrupa tarjetas del mismo tema ("Utilidad del mes", "SAR", ...)
function Grupo({
  titulo,
  subtitulo,
  columnas,
  className = '',
  children,
}: {
  titulo: string
  subtitulo?: string
  columnas: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-gray-100/80 p-3 ${className}`}>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 px-1">
        <h3 className="text-sm font-bold uppercase tracking-wide text-marca">{titulo}</h3>
        {subtitulo && <span className="text-xs text-gray-500">{subtitulo}</span>}
      </div>
      <div className={`grid grid-cols-1 gap-3 ${columnas}`}>{children}</div>
    </div>
  )
}

type Nivel = 'ok' | 'aviso' | 'alerta'
const COLOR_NIVEL: Record<Nivel, string> = {
  ok: 'border-l-green-600',
  aviso: 'border-l-amber-500',
  alerta: 'border-l-red-600',
}
const PUNTO_NIVEL: Record<Nivel, string> = { ok: 'bg-green-600', aviso: 'bg-amber-500', alerta: 'bg-red-600' }

function Obligacion({ titulo, nivel, children, href }: { titulo: string; nivel: Nivel; children: React.ReactNode; href?: string }) {
  return (
    <div className={`rounded-lg border-l-4 bg-white p-4 shadow-sm ${COLOR_NIVEL[nivel]}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-marca">
          <span className={`inline-block h-2 w-2 rounded-full ${PUNTO_NIVEL[nivel]}`} />
          {titulo}
        </p>
        {href && (
          <Link href={href} className="text-xs text-acento hover:underline">
            Ver →
          </Link>
        )}
      </div>
      <div className="mt-2 space-y-1 text-sm text-gray-600">{children}</div>
    </div>
  )
}

const L = (v: number) => `L. ${formatearMoneda(v)}`

// ---------------------------------------------------------------------------

export default async function DashboardPage() {
  const { empresaActiva } = await obtenerEmpresaActiva()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const nombreCompleto = user?.user_metadata?.full_name as string | undefined
  const identificacionUsuario = nombreCompleto ? `${nombreCompleto} — ${user?.email}` : user?.email

  if (!empresaActiva) {
    return (
      <div className="rounded-lg bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-marca">No tienes ninguna empresa asignada</h1>
        <p className="mt-2 text-sm text-gray-500">Contacta al administrador para que te vincule a una.</p>
      </div>
    )
  }

  // ---- Período: últimos 6 meses (hora de Honduras)
  const hoy = hoyHonduras()
  const meses = ultimosMeses(hoy, 6)
  const mesActual = claveMes(hoy)
  const mesAnterior = sumarMeses(mesActual, -1)
  const desde = `${meses[0]}-01`
  const hace90 = restarDias(hoy, 90)

  // ---- Datos (en paralelo)
  const [
    { data: facturas },
    { data: compras },
    { data: gastosData },
    { data: cotizaciones },
    { data: cai },
    { data: ordenes },
  ] = await Promise.all([
    supabase
      .from('facturas')
      .select('fecha, total, isv_15, isv_18, subtotal_gravado_15, subtotal_gravado_18, subtotal_exento, subtotal_exonerado, clientes(nombre)')
      .eq('empresa_id', empresaActiva.id)
      .gte('fecha', desde),
    supabase
      .from('compras')
      .select('fecha, total, isv_15, isv_18, subtotal_gravado_15, subtotal_gravado_18, subtotal_exento')
      .eq('empresa_id', empresaActiva.id)
      .gte('fecha', desde),
    supabase
      .from('gastos')
      .select('fecha, total, isv_15, isv_18, subtotal_gravado_15, subtotal_gravado_18, subtotal_exento, subtotal_exonerado, categoria, tipo_documento, deducible_isr')
      .eq('empresa_id', empresaActiva.id)
      .gte('fecha', desde),
    supabase.from('cotizaciones').select('fecha, total, estado').eq('empresa_id', empresaActiva.id).gte('fecha', desde),
    supabase
      .from('cai_rangos')
      .select('cai, rango_final, correlativo_actual, fecha_limite_emision')
      .eq('empresa_id', empresaActiva.id)
      .eq('activo', true),
    supabase.from('ordenes_trabajo').select('estado').eq('empresa_id', empresaActiva.id),
  ])

  const listaFacturas = (facturas || []) as any[]
  const listaGastos = (gastosData || []) as any[]
  const listaCompras = (compras || []) as any[]

  // ---- Totales por mes
  const ventasMes = totalesPorMes(listaFacturas, meses)
  const comprasMes = totalesPorMes(listaCompras, meses)
  const gastosMes = totalesPorMes(listaGastos, meses)
  const egresosMes = new Map(meses.map((m) => [m, sumarTotales(comprasMes.get(m)!, gastosMes.get(m)!)]))
  // Para el ISV: solo facturas del negocio y cálculo sobre totales, igual que el formulario 201 del SAR
  const gastosIsvMes = totalesPorMes(listaGastos.filter(gastoVaEnIsv), meses)
  const isvMes = (m: string) =>
    calcularFormulario201(ventasMes.get(m)!, sumarTotales(comprasMes.get(m)!, gastosIsvMes.get(m)!))

  const vActual = ventasMes.get(mesActual)!
  const vAnterior = ventasMes.get(mesAnterior)!
  const eActual = egresosMes.get(mesActual)!
  const eAnterior = egresosMes.get(mesAnterior)!

  const ventaNeta = netoSinIsv(vActual)
  const egresoNeto = netoSinIsv(eActual)
  const resultado = ventaNeta - egresoNeto
  const resultadoAnterior = netoSinIsv(vAnterior) - netoSinIsv(eAnterior)
  const isvMesActual = isvMes(mesActual).netoDelMes

  const facturasDelMes = listaFacturas.filter((f) => claveMes(f.fecha) === mesActual)
  const ticketPromedio = facturasDelMes.length ? ventaNeta / facturasDelMes.length : 0

  // ---- Cotizaciones
  const listaCot = (cotizaciones || []) as any[]
  const abiertas = listaCot.filter((c) => ['pendiente', 'enviada', 'aprobada'].includes(c.estado))
  const montoAbiertas = abiertas.reduce((s, c) => s + Number(c.total || 0), 0)
  const convertidas = listaCot.filter((c) => c.estado === 'convertida').length
  const tasaConversion = listaCot.length ? (convertidas / listaCot.length) * 100 : null

  // ---- Ganancia de trabajos facturados (según costeo interno; no es un dato contable)
  // Facturas del mes que salieron de una cotización con hoja de costos.
  // Consultas aparte: si la migración de costeo no está aplicada, el panel se muestra igual.
  const { data: facturasConOrigen } = await supabase
    .from('facturas')
    .select('fecha, cotizacion_id, total, isv_15, isv_18')
    .eq('empresa_id', empresaActiva.id)
    .gte('fecha', `${mesActual}-01`)
    .not('cotizacion_id', 'is', null)
  const facturasOrigenMes = ((facturasConOrigen || []) as any[]).filter((f) => claveMes(f.fecha) === mesActual)
  const idsCotizacion = facturasOrigenMes.map((f) => f.cotizacion_id as string)
  const { data: costeosMes } = idsCotizacion.length
    ? await supabase.from('costeos_cotizacion').select('cotizacion_id, costo_estimado, costo_real').in('cotizacion_id', idsCotizacion)
    : { data: [] }
  const costeoPorCotizacion = new Map(((costeosMes || []) as any[]).map((k) => [k.cotizacion_id as string, k]))
  let ventaCosteada = 0
  let costoTrabajos = 0
  let facturasCosteadas = 0
  let usaCostoEstimado = false
  for (const f of facturasOrigenMes) {
    const k = costeoPorCotizacion.get(f.cotizacion_id)
    if (!k) continue
    facturasCosteadas++
    ventaCosteada += Number(f.total || 0) - Number(f.isv_15 || 0) - Number(f.isv_18 || 0)
    // Cuando exista el costo real (etapa C) se usa ese; mientras tanto, el estimado
    if (k.costo_real === null || k.costo_real === undefined) usaCostoEstimado = true
    costoTrabajos += Number(k.costo_real ?? k.costo_estimado ?? 0)
  }
  const gananciaTrabajos = ventaCosteada - costoTrabajos
  const margenTrabajos = ventaCosteada > 0 ? (gananciaTrabajos / ventaCosteada) * 100 : null

  // ---- Obligación: próxima declaración de ISV
  // Hasta la fecha límite del mes anterior se muestra ese mes (salvo que ya se marcó como
  // declarado en Declaraciones SAR); después, el mes en curso (acumulado).
  const { data: registroDeclaraciones } = await supabase
    .from('declaraciones')
    .select('periodo, fecha_presentacion')
    .eq('empresa_id', empresaActiva.id)
    .eq('tipo', 'isv_mensual')
    .gte('periodo', sumarMeses(mesActual, -3))
  const listaDeclaraciones = (registroDeclaraciones || []) as { periodo: string; fecha_presentacion: string }[]
  const declAnterior = listaDeclaraciones.find((d) => d.periodo === mesAnterior)
  const limiteAnterior = fechaLimiteIsv(mesAnterior)
  // Aviso de atraso solo si la empresa ya registra sus declaraciones (para no alarmar a quien no lo usa)
  const anteriorSinMarcarVencido = listaDeclaraciones.length > 0 && !declAnterior && diasEntre(hoy, limiteAnterior) < 0
  const mesDeclararEsAnterior = !declAnterior && diasEntre(hoy, limiteAnterior) >= 0
  const mesIsv = mesDeclararEsAnterior ? mesAnterior : mesActual
  const isvPorDeclarar = mesDeclararEsAnterior ? isvMes(mesAnterior).netoDelMes : isvMesActual
  const venceIsv = fechaLimiteIsv(mesIsv)
  const diasIsv = diasEntre(hoy, venceIsv)
  const nivelIsv: Nivel = anteriorSinMarcarVencido ? 'alerta' : diasIsv <= 3 ? 'alerta' : diasIsv <= 10 ? 'aviso' : 'ok'

  // ---- CAI activo
  const rangosCai = (cai || []) as any[]
  const caiDisponibles = rangosCai.reduce((s, r) => s + Math.max(0, Number(r.rango_final) - Number(r.correlativo_actual)), 0)
  const caiVence = rangosCai.map((r) => r.fecha_limite_emision as string).filter(Boolean).sort()[0]
  const diasCai = caiVence ? diasEntre(hoy, caiVence) : null
  const nivelCai: Nivel =
    rangosCai.length === 0 || caiDisponibles === 0 || (diasCai !== null && diasCai < 0)
      ? 'alerta'
      : caiDisponibles <= 10 || (diasCai !== null && diasCai <= 30)
        ? 'aviso'
        : 'ok'

  // ---- Órdenes de trabajo
  const conteoEstados: Record<string, number> = {}
  for (const o of ordenes || []) conteoEstados[o.estado] = (conteoEstados[o.estado] || 0) + 1
  const ordenesAbiertas = (conteoEstados['pendiente'] || 0) + (conteoEstados['en_proceso'] || 0)
  const COLOR_ORDEN: Record<string, string> = { pendiente: '#C97A2B', en_proceso: '#14A3AF', completado: '#2F9E44', cancelado: '#C0392B' }
  const ordenesPorEstado = ESTADOS_ORDEN.filter((e) => conteoEstados[e.valor]).map((e) => ({
    estado: infoEstado(ESTADOS_ORDEN, e.valor).etiqueta,
    cantidad: conteoEstados[e.valor],
    color: COLOR_ORDEN[e.valor] ?? '#1B2430',
  }))

  // ---- Datos de gráficas
  const ventasVsEgresos = meses.map((m) => ({
    mes: etiquetaMes(m),
    ventas: netoSinIsv(ventasMes.get(m)!),
    egresos: netoSinIsv(egresosMes.get(m)!),
  }))
  const isvPorMes = meses.map((m) => {
    const f = isvMes(m)
    return { mes: etiquetaMes(m), cobrado: f.totalDebito, pagado: f.totalCreditoCompras, neto: f.netoDelMes }
  })
  const distribucionVentas = [
    { name: 'Gravado 15%', value: vActual.gravado15 },
    { name: 'Gravado 18%', value: vActual.gravado18 },
    { name: 'Exento', value: vActual.exento },
    { name: 'Exonerado', value: vActual.exonerado },
  ].filter((d) => d.value > 0)

  const gastosCat: Record<string, number> = {}
  for (const g of listaGastos.filter((g) => claveMes(g.fecha) === mesActual)) {
    const t = sumarDocumentos([g])
    const categoria = normalizarCategoria(g.categoria)
    gastosCat[categoria] = (gastosCat[categoria] || 0) + netoSinIsv(t)
  }
  const gastosPorCategoria = Object.entries(gastosCat)
    .map(([categoria, total]) => ({ categoria: etiquetaCortaCategoria(categoria), total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6)

  const porCliente: Record<string, number> = {}
  for (const f of listaFacturas.filter((f) => f.fecha >= hace90)) {
    const nombre = (Array.isArray(f.clientes) ? f.clientes[0]?.nombre : f.clientes?.nombre) || 'Sin nombre'
    porCliente[nombre] = (porCliente[nombre] || 0) + netoSinIsv(sumarDocumentos([f]))
  }
  const topClientes = Object.entries(porCliente)
    .map(([nombre, total]) => ({ nombre, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {empresaActiva.logo_url && <img src={empresaActiva.logo_url} alt="" className="h-16 w-16 object-contain" />}
          <div>
            <h1 className="text-3xl font-bold text-marca">{empresaActiva.nombre_comercial || empresaActiva.razon_social}</h1>
            <p className="text-sm text-gray-500">Panel de control · {nombreMes(mesActual)}</p>
          </div>
        </div>
        <div className="text-right text-xs text-gray-400">
          <p>{identificacionUsuario}</p>
          <p>
            Ver. {MARCA.version}
            {FECHA_PUBLICACION && ` · ${FECHA_PUBLICACION}`}
          </p>
        </div>
      </div>

      {/* Indicadores del mes, agrupados por tema */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Resumen de {nombreMes(mesActual)}</h2>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
          <Grupo titulo="Utilidad del mes" subtitulo="Montos sin ISV" columnas="sm:grid-cols-3" className="lg:col-span-3">
            <Kpi
              titulo="Ventas netas"
              valor={L(ventaNeta)}
              color="azul"
              href={`/dashboard/reportes?mes=${mesActual}#libro-ventas`}
              detalle={<Tendencia valor={variacion(ventaNeta, netoSinIsv(vAnterior))} />}
            />
            <Kpi
              titulo="Compras y gastos"
              valor={L(egresoNeto)}
              color="amarillo"
              href={`/dashboard/reportes?mes=${mesActual}#libro-compras`}
              detalle={<Tendencia valor={variacion(egresoNeto, netoSinIsv(eAnterior))} invertir />}
            />
            <Kpi
              titulo="Utilidad estimada"
              valor={L(resultado)}
              detalle={
                <>
                  <span className={resultado >= 0 ? 'text-green-700' : 'text-red-600'}>
                    {resultado >= 0 ? 'Ventas − compras y gastos' : 'Egresos mayores que ventas'}
                  </span>
                  <br />
                  <Tendencia valor={variacion(resultado, resultadoAnterior)} />
                </>
              }
            />
          </Grupo>

          <Grupo titulo="SAR" subtitulo="Impuesto por declarar" columnas="">
            <Kpi
              titulo="ISV estimado del mes"
              valor={L(isvMesActual)}
              color="rojo"
              href={`/dashboard/reportes?mes=${mesActual}`}
              detalle={
                <>
                  Cobrado {L(isvMes(mesActual).totalDebito)} − crédito {L(isvMes(mesActual).totalCreditoCompras)}
                  <br />
                  Se declara a más tardar el <strong>{formatearFecha(fechaLimiteIsv(mesActual))}</strong>
                </>
              }
            />
          </Grupo>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
        <Grupo titulo="Actividad comercial" columnas="sm:grid-cols-2 xl:grid-cols-4" className="lg:col-span-3">
          <Kpi titulo="Facturas emitidas" valor={String(facturasDelMes.length)} href="/dashboard/facturas" detalle={`Ticket promedio ${L(ticketPromedio)}`} />
          <Kpi
            titulo="Cotizaciones abiertas"
            valor={String(abiertas.length)}
            href="/dashboard/cotizaciones"
            detalle={`Por ${L(montoAbiertas)} (pendientes, enviadas y aprobadas)`}
          />
          <Kpi
            titulo="Conversión de cotizaciones"
            valor={tasaConversion === null ? '—' : `${tasaConversion.toFixed(0)}%`}
            detalle={`${convertidas} de ${listaCot.length} cotizaciones de los últimos 6 meses se facturaron`}
          />
          <Kpi titulo="Órdenes de trabajo abiertas" valor={String(ordenesAbiertas)} href="/dashboard/ordenes" detalle="Pendientes y en proceso" />
        </Grupo>

          {/* Lo que dejaron los trabajos ya facturados, restando su costo operativo y de personal */}
          <Grupo titulo="Trabajos facturados" subtitulo="Según costeo" columnas="">
            <Kpi
              titulo="Ganancia de trabajos"
              valor={facturasCosteadas ? L(gananciaTrabajos) : '—'}
              detalle={
                facturasCosteadas ? (
                  <>
                    Facturado {L(ventaCosteada)} − costo {L(costoTrabajos)}
                    <br />
                    <span className={gananciaTrabajos >= 0 ? 'font-medium text-green-700' : 'font-medium text-red-600'}>
                      Margen {margenTrabajos === null ? '—' : `${margenTrabajos.toFixed(1)}%`}
                    </span>{' '}
                    · {facturasCosteadas} de {facturasDelMes.length} {facturasDelMes.length === 1 ? 'factura' : 'facturas'} del mes
                    {usaCostoEstimado && (
                      <>
                        <br />
                        <span className="text-gray-400">Con el costo estimado de cada cotización</span>
                      </>
                    )}
                  </>
                ) : (
                  'Ninguna factura del mes viene de una cotización costeada.'
                )
              }
            >
              <Link href="/dashboard/costeos?estado=facturadas" className="mt-2 inline-block text-xs text-acento hover:underline">
                Ver costeos →
              </Link>
            </Kpi>
          </Grupo>
        </div>
      </section>

      {/* Obligaciones y alertas */}
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Obligaciones y alertas</h2>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <Obligacion titulo={`Próxima declaración de ISV: ${nombreMes(mesIsv)}`} nivel={nivelIsv} href={`/dashboard/reportes?mes=${anteriorSinMarcarVencido ? mesAnterior : mesIsv}`}>
            <p>
              ISV neto estimado{mesDeclararEsAnterior ? '' : ' (acumulado a hoy)'}:{' '}
              <span className="whitespace-nowrap font-mono font-semibold text-marca">{L(isvPorDeclarar)}</span>
            </p>
            <p>
              Fecha límite: <strong>{formatearFecha(venceIsv)}</strong> {diasIsv > 0 ? `(faltan ${diasIsv} días)` : '(vence hoy)'}
            </p>
            {declAnterior && (
              <p className="text-green-700">
                ✓ {nombreMes(mesAnterior)} declarado el {formatearFecha(declAnterior.fecha_presentacion)}
              </p>
            )}
            {anteriorSinMarcarVencido && (
              <p className="font-medium text-red-600">
                {nombreMes(mesAnterior)} no está marcado como declarado y su fecha límite ({formatearFecha(limiteAnterior)}) ya pasó.
              </p>
            )}
            <p className="text-xs text-gray-400">Día 10 del mes siguiente; si es fin de semana, el siguiente día hábil. Revisa feriados o prórrogas del SAR.</p>
          </Obligacion>

          <Obligacion titulo="CAI de facturación" nivel={nivelCai} href="/dashboard/configuracion">
            {rangosCai.length === 0 ? (
              <p className="text-red-600">No hay un rango CAI activo: no puedes emitir facturas.</p>
            ) : (
              <>
                <p>
                  Facturas disponibles: <span className="whitespace-nowrap font-mono font-semibold text-marca">{caiDisponibles}</span>
                </p>
                <p>
                  Fecha límite de emisión: <strong>{formatearFecha(caiVence)}</strong>{' '}
                  {diasCai !== null && (diasCai >= 0 ? `(faltan ${diasCai} días)` : '(vencido)')}
                </p>
                {nivelCai !== 'ok' && <p className="text-xs text-amber-700">Considera solicitar un nuevo rango al SAR con anticipación.</p>}
              </>
            )}
          </Obligacion>

          <Obligacion titulo="Órdenes de trabajo" nivel={ordenesAbiertas > 0 ? 'aviso' : 'ok'} href="/dashboard/ordenes">
            <p>
              Pendientes: <span className="whitespace-nowrap font-mono font-semibold text-marca">{conteoEstados['pendiente'] || 0}</span> · En proceso:{' '}
              <span className="whitespace-nowrap font-mono font-semibold text-marca">{conteoEstados['en_proceso'] || 0}</span>
            </p>
            <p>
              Completadas: <span className="font-mono">{conteoEstados['completado'] || 0}</span> · Canceladas:{' '}
              <span className="font-mono">{conteoEstados['cancelado'] || 0}</span>
            </p>
          </Obligacion>
        </div>
      </section>

      {/* Gráficas */}
      <DashboardCharts
        ventasVsEgresos={ventasVsEgresos}
        isvPorMes={isvPorMes}
        distribucionVentas={distribucionVentas}
        gastosPorCategoria={gastosPorCategoria}
        topClientes={topClientes}
        ordenesPorEstado={ordenesPorEstado}
      />

      <p className="text-xs text-gray-400">
        Montos sin ISV salvo donde se indica. El ISV es una estimación con base en lo registrado en el sistema; la declaración
        oficial la confirma tu contador.
      </p>
    </div>
  )
}
