import { createClient } from '@/lib/supabase/server'
import { obtenerEmpresaActiva, nombreDocumento } from '@/lib/empresa'
import { compararNumeroDocumento, formatearFecha, formatearMoneda } from '@/lib/formato'
import BotonImprimir from '@/components/BotonImprimir'
import DescargarPdfBoton from './descargar-pdf-boton'
import Link from 'next/link'
import SelectorPeriodo from './selector-periodo'
import EstadoDeclaracion, { type Declaracion } from './estado-declaracion'
import { obtenerRol } from '@/lib/permisos'
import Formulario201Guia from './formulario-201'
import { calcularFormulario201, excedentesEncadenados, gastoVaEnIsv, type GastoFiscal } from '@/lib/formulario-isv'
import { etiquetaCategoria, resumirPorCategoria, sumarDocumentos, sumarTotales, type Gasto } from '@/lib/gastos'
import {
  claveMes,
  diasEntre,
  fechaLimiteIsv,
  hoyHonduras,
  isvDe,
  netoSinIsv,
  nombreMes,
  sumarMeses,
  totalesPorMes,
  ultimoDiaMes,
  ultimosMeses,
} from '@/lib/indicadores'

// "octubre 2026" -> "Octubre 2026"
const mesTitulo = (clave: string) => {
  const texto = nombreMes(clave)
  return texto.charAt(0).toLocaleUpperCase('es-HN') + texto.slice(1)
}

const esMes = (v?: string) => !!v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v)
const esAnio = (v?: string) => !!v && /^\d{4}$/.test(v)
const esFecha = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v)

// Mes que toca declarar: el anterior hasta su fecha límite (día 10), salvo que ya
// se haya marcado como declarado; después, el mes en curso.
function mesPorDeclarar(hoy: string, anteriorDeclarado: boolean) {
  const anterior = sumarMeses(claveMes(hoy), -1)
  return !anteriorDeclarado && diasEntre(hoy, fechaLimiteIsv(anterior)) >= 0 ? anterior : claveMes(hoy)
}

// Declaraciones SAR: información fiscal para la declaración mensual de ISV
// y el resumen anual para renta. (La ruta sigue siendo /dashboard/reportes.)
export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string; mes?: string; anio?: string }>
}) {
  const { desde, hasta, mes, anio } = await searchParams

  // ---- Período (hora de Honduras). Prioridad: mes > año > rango > mes por declarar
  const hoy = hoyHonduras()
  const mesActual = claveMes(hoy)
  const mesAnterior = sumarMeses(mesActual, -1)
  const { empresaActiva } = await obtenerEmpresaActiva()
  if (!empresaActiva) return <div>Primero selecciona una empresa.</div>
  const supabase = await createClient()

  // ¿El mes anterior ya se marcó como declarado? (si falta la migración, cuenta como no)
  const { data: declAnterior } = await supabase
    .from('declaraciones')
    .select('periodo')
    .eq('empresa_id', empresaActiva.id)
    .eq('tipo', 'isv_mensual')
    .eq('periodo', mesAnterior)
    .maybeSingle()
  const porDeclarar = mesPorDeclarar(hoy, !!declAnterior)
  const anioActual = hoy.slice(0, 4)

  let tipo: 'mes' | 'anio' | 'rango' = 'mes'
  let mesElegido: string | null = null
  let anioElegido: string | null = null
  let fechaDesde: string
  let fechaHasta: string
  if (esMes(mes)) {
    mesElegido = mes!
  } else if (esAnio(anio)) {
    tipo = 'anio'
    anioElegido = anio!
  } else if (esFecha(desde) && esFecha(hasta)) {
    tipo = 'rango'
  } else {
    mesElegido = porDeclarar
  }
  if (tipo === 'mes') {
    fechaDesde = `${mesElegido}-01`
    fechaHasta = ultimoDiaMes(mesElegido!)
  } else if (tipo === 'anio') {
    fechaDesde = `${anioElegido}-01-01`
    fechaHasta = anioElegido === anioActual ? hoy : `${anioElegido}-12-31`
  } else {
    fechaDesde = desde!
    fechaHasta = hasta!
  }
  const tituloPeriodo =
    tipo === 'mes' ? mesTitulo(mesElegido!) : tipo === 'anio' ? `Año ${anioElegido}` : 'Rango personalizado'

  // Fecha límite de la declaración de ISV del mes elegido
  const limite = tipo === 'mes' ? fechaLimiteIsv(mesElegido!) : null
  const diasLimite = limite ? diasEntre(hoy, limite) : null


  const { data: empresaCompleta } = await supabase
    .from('empresas')
    .select('razon_social, nombre_comercial, nombre_impresion, nombre_documento_origen')
    .eq('id', empresaActiva.id)
    .single()

  const nombreEmpresa = empresaCompleta ? nombreDocumento(empresaCompleta) : ''

  const { data: facturasData } = await supabase
    .from('facturas')
    .select('id, numero_correlativo, fecha, subtotal_gravado_15, subtotal_gravado_18, subtotal_exento, subtotal_exonerado, isv_15, isv_18, total, clientes(nombre)')
    .eq('empresa_id', empresaActiva.id)
    .gte('fecha', fechaDesde)
    .lte('fecha', fechaHasta)
    .order('fecha')

  const { data: compras } = await supabase
    .from('compras')
    .select('id, fecha, numero_factura_proveedor, subtotal_gravado_15, subtotal_gravado_18, subtotal_exento, isv_15, isv_18, total, proveedores(nombre)')
    .eq('empresa_id', empresaActiva.id)
    .gte('fecha', fechaDesde)
    .lte('fecha', fechaHasta)
    .order('fecha')

  const { data: gastosData } = await supabase
    .from('gastos')
    .select('*')
    .eq('empresa_id', empresaActiva.id)
    .gte('fecha', fechaDesde)
    .lte('fecha', fechaHasta)
    .order('fecha')
  const gastos = (gastosData || []) as Gasto[]

  // Libro de ventas: por fecha y, dentro de la misma fecha, por número de factura
  const facturas = [...((facturasData || []) as any[])].sort(
    (a, b) => String(a.fecha).localeCompare(String(b.fecha)) || compararNumeroDocumento(a.numero_correlativo, b.numero_correlativo)
  )

  const totales = sumarDocumentos(facturas)
  const totalesCompras = sumarDocumentos(compras || [])
  const totalesGastos = sumarDocumentos(gastos)
  const totalesComprasYGastos = sumarTotales(totalesCompras, totalesGastos)
  const gastosPorCategoria = resumirPorCategoria(gastos)
  const gastosNoDeducibles = gastos.filter((g) => !g.deducible_isr)

  // Netos = total sin ISV (incluye gravado, exento y exonerado)
  const isvVentas = totales.isv15 + totales.isv18
  const isvCompras = totalesComprasYGastos.isv15 + totalesComprasYGastos.isv18
  const ventaNeta = totales.total - isvVentas
  const compraNeta = totalesComprasYGastos.total - isvCompras

  // ---- Historial de los últimos 12 meses (se leen 24 para encadenar el excedente de ISV)
  // Mismo cálculo que el formulario 201 del SAR: solo facturas del negocio y ISV sobre los totales.
  const meses12 = ultimosMeses(hoy, 12)
  const meses24 = ultimosMeses(hoy, 24)
  const inicio24 = `${meses24[0]}-01`
  const camposFiscales = 'fecha, subtotal_gravado_15, subtotal_gravado_18, subtotal_exento, isv_15, isv_18, total'
  const [{ data: hFacturas }, { data: hCompras }, { data: hGastos }] = await Promise.all([
    supabase.from('facturas').select(`${camposFiscales}, subtotal_exonerado`).eq('empresa_id', empresaActiva.id).gte('fecha', inicio24),
    supabase.from('compras').select(camposFiscales).eq('empresa_id', empresaActiva.id).gte('fecha', inicio24),
    supabase
      .from('gastos')
      .select(`${camposFiscales}, subtotal_exonerado, tipo_documento, deducible_isr`)
      .eq('empresa_id', empresaActiva.id)
      .gte('fecha', inicio24),
  ])
  const hVentas = totalesPorMes((hFacturas || []) as any[], meses24)
  const hComprasMes = totalesPorMes((hCompras || []) as any[], meses24)
  const hGastosIsv = totalesPorMes(((hGastos || []) as any[]).filter(gastoVaEnIsv), meses24)
  const datosMes = new Map(
    meses24.map((m) => [m, { ventas: hVentas.get(m)!, compras: sumarTotales(hComprasMes.get(m)!, hGastosIsv.get(m)!) }])
  )
  const excedentes = excedentesEncadenados(meses24, datosMes)
  const historial = [...meses12].reverse().map((m) => {
    const d = datosMes.get(m)!
    const f = calcularFormulario201(d.ventas, d.compras, excedentes.get(m) ?? 0)
    return {
      mes: m,
      ventas: netoSinIsv(d.ventas),
      egresos: netoSinIsv(d.compras),
      cobrado: f.totalDebito,
      credito: f.totalCreditoCompras,
      neto: f.netoDelMes,
      aPagar: f.importeAPagar,
      aFavor: f.excedenteAFavor,
      limite: fechaLimiteIsv(m),
    }
  })

  // ---- Formulario 201 del período (solo para un mes)
  const gastosIsv = gastos.filter((g) => gastoVaEnIsv(g as GastoFiscal))
  const egresosIsv = sumarTotales(totalesCompras, sumarDocumentos(gastosIsv))
  const excedenteAnterior = tipo === 'mes' ? excedentes.get(mesElegido!) ?? 0 : 0
  const formulario = calcularFormulario201(totales, egresosIsv, excedenteAnterior)
  const gastosExcluidos = gastos.filter((g) => !gastoVaEnIsv(g as GastoFiscal))
  const excluidos = { cantidad: gastosExcluidos.length, total: sumarDocumentos(gastosExcluidos).total }
  // ISV del período como lo calcula el SAR: débito − crédito, sobre los totales (sin excedente anterior)
  const isvNeto = formulario.netoDelMes

  // ---- Declaraciones registradas (meses ya presentados al SAR)
  const desdeRegistro = mesElegido && mesElegido < meses12[0] ? mesElegido : meses12[0]
  const { data: declaracionesData, error: errorDeclaraciones } = await supabase
    .from('declaraciones')
    .select('periodo, fecha_presentacion, numero_constancia, monto_calculado, monto_pagado, notas')
    .eq('empresa_id', empresaActiva.id)
    .eq('tipo', 'isv_mensual')
    .gte('periodo', desdeRegistro)
  const declaraciones = new Map(((declaracionesData || []) as any[]).map((d) => [d.periodo as string, d as Declaracion]))
  const registroDisponible = !errorDeclaraciones
  const puedeRegistrar = (await obtenerRol(empresaActiva.id)) === 'admin'

  // Opciones del selector
  const opcionesMes = Array.from({ length: 24 }, (_, i) => sumarMeses(mesActual, -i)).map((m) => ({ valor: m, etiqueta: mesTitulo(m) }))
  const opcionesAnio = [0, 1, 2].map((i) => {
    const a = String(Number(anioActual) - i)
    return { valor: a, etiqueta: i === 0 ? `${a} (hasta hoy)` : a }
  })

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-marca">Declaraciones SAR</h1>
          <p className="text-sm text-gray-500">Ventas, compras y gastos para la declaración mensual de ISV y el resumen anual de renta.</p>
        </div>
        <div className="flex gap-2">
          <DescargarPdfBoton
            empresaNombre={nombreEmpresa}
            desde={fechaDesde}
            hasta={fechaHasta}
            mes={tipo === 'mes' ? mesElegido : null}
            ventas={facturas.map((f: any) => ({
              numero_correlativo: f.numero_correlativo,
              fecha: f.fecha,
              cliente: f.clientes?.nombre || '—',
              subtotal_gravado_15: f.subtotal_gravado_15,
              subtotal_gravado_18: f.subtotal_gravado_18,
              subtotal_exento: f.subtotal_exento,
              subtotal_exonerado: f.subtotal_exonerado,
              isv_15: f.isv_15,
              isv_18: f.isv_18,
              total: f.total,
            }))}
            totalesVentas={totales}
            compras={(compras || []).map((c: any) => ({
              numero_factura_proveedor: c.numero_factura_proveedor,
              fecha: c.fecha,
              proveedor: c.proveedores?.nombre || '—',
              subtotal_gravado_15: c.subtotal_gravado_15,
              subtotal_gravado_18: c.subtotal_gravado_18,
              subtotal_exento: c.subtotal_exento,
              isv_15: c.isv_15,
              isv_18: c.isv_18,
              total: c.total,
            }))}
            totalesCompras={totalesCompras}
            gastos={gastos}
            isvNeto={isvNeto}
          />
          <BotonImprimir />
        </div>
      </div>

      <SelectorPeriodo
        tipo={tipo}
        mesSeleccionado={mesElegido}
        anioSeleccionado={anioElegido}
        desde={fechaDesde}
        hasta={fechaHasta}
        mesAnterior={{ valor: mesAnterior, etiqueta: mesTitulo(mesAnterior) }}
        mesActual={{ valor: mesActual, etiqueta: mesTitulo(mesActual) }}
        mesPorDeclarar={porDeclarar}
        meses={opcionesMes}
        anios={opcionesAnio}
      />

      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 print:mb-6">
        <div>
          <h2 className="text-xl font-bold text-marca">{tituloPeriodo}</h2>
          <p className="text-sm text-gray-500">
            Período: {formatearFecha(fechaDesde)} al {formatearFecha(fechaHasta)}
          </p>
        </div>
        {limite && diasLimite !== null && (
          <p
            className={`rounded-lg px-3 py-1.5 text-sm print:hidden ${
              diasLimite < 0 ? 'bg-gray-100 text-gray-600' : diasLimite <= 3 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'
            }`}
          >
            Declaración de ISV: a más tardar el <strong>{formatearFecha(limite)}</strong>
            {diasLimite < 0 ? ' (fecha ya pasó)' : diasLimite === 0 ? ' (vence hoy)' : ` (faltan ${diasLimite} ${diasLimite === 1 ? 'día' : 'días'})`}
          </p>
        )}
      </div>

      {tipo === 'mes' && limite && (
        <EstadoDeclaracion
          key={mesElegido}
          mes={mesElegido!}
          mesTitulo={tituloPeriodo}
          declaracion={declaraciones.get(mesElegido!) ?? null}
          isvNetoActual={isvNeto}
          montoSugerido={formulario.importeAPagar}
          limite={limite}
          hoy={hoy}
          puedeEditar={puedeRegistrar}
          disponible={registroDisponible}
        />
      )}

      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Ventas</h2>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-400">Total facturado (con ISV)</p>
          <p className="font-mono text-lg font-bold text-marca">L. {formatearMoneda(totales.total)}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-400">ISV recaudado (ventas)</p>
          <p className="font-mono text-lg font-bold text-marca">L. {formatearMoneda(isvVentas)}</p>
        </div>
        <div className="rounded-lg border-2 border-acento bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-acento">Venta neta sin ISV</p>
          <p className="font-mono text-lg font-bold text-marca">L. {formatearMoneda(ventaNeta)}</p>
          <p className="mt-1 text-xs text-gray-500">Total facturado − ISV recaudado</p>
        </div>
      </div>

      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Compras y gastos</h2>
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-400">Total compras y gastos (con ISV)</p>
          <p className="font-mono text-lg font-bold text-marca">L. {formatearMoneda(totalesComprasYGastos.total)}</p>
          <p className="mt-1 text-xs text-gray-500">
            Inventario L. {formatearMoneda(totalesCompras.total)} · Gastos L. {formatearMoneda(totalesGastos.total)}
          </p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-400">ISV pagado (crédito fiscal)</p>
          <p className="font-mono text-lg font-bold text-marca">L. {formatearMoneda(isvCompras)}</p>
        </div>
        <div className="rounded-lg border-2 border-acento bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-acento">Compra neta sin ISV</p>
          <p className="font-mono text-lg font-bold text-marca">L. {formatearMoneda(compraNeta)}</p>
          <p className="mt-1 text-xs text-gray-500">Todas las compras y gastos registrados, sin ISV (incluye planillas y recibos)</p>
        </div>
      </div>

      <div className={`mb-6 rounded-lg p-4 shadow-sm ${isvNeto >= 0 ? 'bg-red-50' : 'bg-green-50'}`}>
        <p className="text-xs uppercase tracking-wide text-gray-500">
          {tipo === 'mes' ? 'ISV a pagar según el formulario 201' : 'ISV neto del período (débito − crédito)'}
        </p>
        <p className={`font-mono text-2xl font-bold ${isvNeto >= 0 ? 'text-red-700' : 'text-green-700'}`}>
          L. {formatearMoneda(tipo === 'mes' ? formulario.importeAPagar : isvNeto)}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          {tipo === 'mes'
            ? formulario.excedenteAFavor > 0
              ? `No pagas este mes: quedan L. ${formatearMoneda(formulario.excedenteAFavor)} de crédito a favor para el próximo.`
              : 'Calculado como el SAR: ISV sobre el total de ventas menos ISV sobre el total de compras con factura, menos el excedente del mes anterior.'
            : isvNeto >= 0
              ? 'Calculado como el SAR, solo con facturas del negocio.'
              : 'Tuviste más ISV pagado en compras (crédito fiscal) que cobrado en ventas en este período.'}
        </p>
        {tipo === 'mes' && (
          <a href="#formulario-201" className="mt-2 inline-block text-xs font-semibold text-acento hover:underline print:hidden">
            Ver qué va en cada casilla del formulario 201 ↓
          </a>
        )}
      </div>

      {/* Contraído por defecto: se despliega al tocarlo */}
      <details className="mb-8 rounded-lg bg-white shadow-sm print:hidden">
        <summary className="cursor-pointer p-4 font-semibold text-marca">Historial de los últimos 12 meses</summary>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="p-3">Mes</th>
                <th className="p-3 text-right">Ventas sin ISV</th>
                <th className="p-3 text-right">Compras y gastos sin ISV</th>
                <th className="p-3 text-right">ISV cobrado</th>
                <th className="p-3 text-right">ISV pagado (crédito)</th>
                <th className="p-3 text-right">ISV neto</th>
                <th className="p-3">Fecha límite</th>
                {registroDisponible && <th className="p-3">Estado</th>}
              </tr>
            </thead>
            <tbody>
              {historial.map((h) => {
                const elegido = tipo === 'mes' && h.mes === mesElegido
                return (
                  <tr key={h.mes} className={`border-t ${elegido ? 'bg-acento/10 font-semibold' : ''}`}>
                    <td className="whitespace-nowrap p-3">
                      <Link href={`/dashboard/reportes?mes=${h.mes}`} className="text-acento hover:underline">
                        {mesTitulo(h.mes)}
                      </Link>
                      {h.mes === porDeclarar && (
                        <span className="ml-2 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-700">Por declarar</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap p-3 text-right font-mono">{formatearMoneda(h.ventas)}</td>
                    <td className="whitespace-nowrap p-3 text-right font-mono">{formatearMoneda(h.egresos)}</td>
                    <td className="whitespace-nowrap p-3 text-right font-mono">{formatearMoneda(h.cobrado)}</td>
                    <td className="whitespace-nowrap p-3 text-right font-mono">{formatearMoneda(h.credito)}</td>
                    <td className={`whitespace-nowrap p-3 text-right font-mono ${h.neto > 0 ? 'text-red-700' : 'text-green-700'}`}>
                      {formatearMoneda(h.neto)}
                      {h.aFavor > 0 && <span className="block text-xs text-green-700">a favor {formatearMoneda(h.aFavor)}</span>}
                    </td>
                    <td className="whitespace-nowrap p-3 text-gray-500">{formatearFecha(h.limite)}</td>
                    {registroDisponible && (
                      <td className="whitespace-nowrap p-3">
                        {declaraciones.get(h.mes) ? (
                          <span className="text-green-700">✓ Declarado {formatearFecha(declaraciones.get(h.mes)!.fecha_presentacion)}</span>
                        ) : h.mes === mesActual ? (
                          <span className="text-gray-400">En curso</span>
                        ) : hoy > h.limite ? (
                          <span className="font-semibold text-red-600">Sin marcar</span>
                        ) : (
                          <span className="text-amber-700">Pendiente</span>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="p-3 text-xs text-gray-400">Toca un mes para ver qué va en cada casilla y marcarlo como declarado. Calculado como el SAR: ISV neto positivo = a pagar; negativo = crédito a favor.</p>
      </details>

      <h2 className="mb-1 font-semibold text-marca">Resumen de documentos registrados</h2>
      <p className="mb-2 text-xs text-gray-500">
        Suma todos los documentos del período, incluidos planillas y recibos. Para llenar la declaración usa el bloque
        &quot;Formulario 201&quot; de arriba.
      </p>
      <div className="mb-8 overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="p-3"></th>
              <th className="p-3 text-right">Grav. 15%</th>
              <th className="p-3 text-right">Grav. 18%</th>
              <th className="p-3 text-right">Exento</th>
              <th className="p-3 text-right">Exonerado</th>
              <th className="p-3 text-right">ISV 15%</th>
              <th className="p-3 text-right">ISV 18%</th>
              <th className="p-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
              <tr className="border-t font-semibold">
                <td className="p-3">Ventas</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totales.gravado15)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totales.gravado18)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totales.exento)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totales.exonerado)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totales.isv15)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totales.isv18)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totales.total)}</td>
              </tr>
              <tr className="border-t">
                <td className="p-3">Compras de inventario</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesCompras.gravado15)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesCompras.gravado18)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesCompras.exento)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesCompras.exonerado)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesCompras.isv15)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesCompras.isv18)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesCompras.total)}</td>
              </tr>
              <tr className="border-t">
                <td className="p-3">Gastos</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesGastos.gravado15)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesGastos.gravado18)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesGastos.exento)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesGastos.exonerado)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesGastos.isv15)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesGastos.isv18)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesGastos.total)}</td>
              </tr>
              <tr className="border-t border-marca font-semibold">
                <td className="p-3">Total compras y gastos</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesComprasYGastos.gravado15)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesComprasYGastos.gravado18)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesComprasYGastos.exento)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesComprasYGastos.exonerado)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesComprasYGastos.isv15)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesComprasYGastos.isv18)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesComprasYGastos.total)}</td>
              </tr>
          </tbody>
        </table>
      </div>

      <h2 id="libro-ventas" className="mb-2 scroll-mt-4 font-semibold text-marca">Libro de ventas</h2>
      <div className="mb-8 overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="p-3">Fecha</th>
              <th className="p-3">Factura</th>
              <th className="p-3">Cliente</th>
              <th className="p-3 text-right">Grav. 15%</th>
              <th className="p-3 text-right">Grav. 18%</th>
              <th className="p-3 text-right">Exento</th>
              <th className="p-3 text-right">Exonerado</th>
              <th className="p-3 text-right">ISV 15%</th>
              <th className="p-3 text-right">ISV 18%</th>
              <th className="p-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {facturas.map((f: any) => (
              <tr key={f.id} className="border-t">
                <td className="p-3">{formatearFecha(f.fecha)}</td>
                <td className="p-3 font-mono">{f.numero_correlativo}</td>
                <td className="p-3">{f.clientes?.nombre || '—'}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(f.subtotal_gravado_15)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(f.subtotal_gravado_18)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(f.subtotal_exento)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(f.subtotal_exonerado)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(f.isv_15)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(f.isv_18)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(f.total)}</td>
              </tr>
            ))}
            {(!facturas || facturas.length === 0) && (
              <tr><td colSpan={10} className="p-6 text-center text-gray-400">Sin facturas en este período.</td></tr>
            )}
          </tbody>
          {facturas && facturas.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-marca font-semibold">
                <td className="p-3" colSpan={3}>Totales</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totales.gravado15)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totales.gravado18)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totales.exento)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totales.exonerado)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totales.isv15)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totales.isv18)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totales.total)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <h2 id="libro-compras" className="mb-2 scroll-mt-4 font-semibold text-marca">Libro de compras</h2>
      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="p-3">Fecha</th>
              <th className="p-3">No. Factura Prov.</th>
              <th className="p-3">Proveedor</th>
              <th className="p-3 text-right">Grav. 15%</th>
              <th className="p-3 text-right">Grav. 18%</th>
              <th className="p-3 text-right">Exento</th>
              <th className="p-3 text-right">ISV 15%</th>
              <th className="p-3 text-right">ISV 18%</th>
              <th className="p-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {compras?.map((c: any) => (
              <tr key={c.id} className="border-t">
                <td className="p-3">{formatearFecha(c.fecha)}</td>
                <td className="p-3 font-mono">{c.numero_factura_proveedor || '—'}</td>
                <td className="p-3">{c.proveedores?.nombre || '—'}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(c.subtotal_gravado_15)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(c.subtotal_gravado_18)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(c.subtotal_exento)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(c.isv_15)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(c.isv_18)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(c.total)}</td>
              </tr>
            ))}
            {(!compras || compras.length === 0) && (
              <tr><td colSpan={9} className="p-6 text-center text-gray-400">Sin compras en este período.</td></tr>
            )}
          </tbody>
          {compras && compras.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-marca font-semibold">
                <td className="p-3" colSpan={3}>Totales</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesCompras.gravado15)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesCompras.gravado18)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesCompras.exento)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesCompras.isv15)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesCompras.isv18)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesCompras.total)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <h2 id="libro-gastos" className="mb-2 mt-8 scroll-mt-4 font-semibold text-marca">Libro de gastos</h2>
      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="p-3">Fecha</th>
              <th className="p-3">Documento</th>
              <th className="p-3">Proveedor</th>
              <th className="p-3">Categoría</th>
              <th className="p-3 text-right">Grav. 15%</th>
              <th className="p-3 text-right">Grav. 18%</th>
              <th className="p-3 text-right">Exento</th>
              <th className="p-3 text-right">Exonerado</th>
              <th className="p-3 text-right">ISV 15%</th>
              <th className="p-3 text-right">ISV 18%</th>
              <th className="p-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {gastos.map((g) => (
              <tr key={g.id} className="border-t">
                <td className="p-3">{formatearFecha(g.fecha)}</td>
                <td className="p-3 font-mono">{g.numero_documento || '—'}</td>
                <td className="p-3">
                  {g.nombre_proveedor}
                  {g.rtn_proveedor && <p className="font-mono text-xs text-gray-400">{g.rtn_proveedor}</p>}
                </td>
                <td className="p-3">
                  {etiquetaCategoria(g.categoria)}
                  {!g.deducible_isr && <span className="text-xs text-gray-400"> (personal)</span>}
                </td>
                <td className="p-3 text-right font-mono">{formatearMoneda(g.subtotal_gravado_15)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(g.subtotal_gravado_18)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(g.subtotal_exento)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(g.subtotal_exonerado)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(g.isv_15)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(g.isv_18)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(g.total)}</td>
              </tr>
            ))}
            {gastos.length === 0 && (
              <tr><td colSpan={11} className="p-6 text-center text-gray-400">Sin gastos en este período.</td></tr>
            )}
          </tbody>
          {gastos.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-marca font-semibold">
                <td className="p-3" colSpan={4}>Totales</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesGastos.gravado15)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesGastos.gravado18)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesGastos.exento)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesGastos.exonerado)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesGastos.isv15)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesGastos.isv18)}</td>
                <td className="p-3 text-right font-mono">{formatearMoneda(totalesGastos.total)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <h2 className="mb-2 mt-8 font-semibold text-marca">Gastos deducibles por categoría (para la declaración de renta)</h2>
      <p className="mb-2 text-xs text-gray-500">
        Montos sin ISV, porque el ISV de las facturas gravadas ya se usa como crédito fiscal. Para la renta anual, filtra
        del 1 de enero al 31 de diciembre.
      </p>
      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="p-3">Categoría</th>
              <th className="p-3 text-right">Documentos</th>
              <th className="p-3 text-right">Sin factura</th>
              <th className="p-3 text-right">Total sin ISV</th>
            </tr>
          </thead>
          <tbody>
            {gastosPorCategoria.map((c) => (
              <tr key={c.categoria} className="border-t">
                <td className="p-3">{c.etiqueta}</td>
                <td className="p-3 text-right font-mono">{c.cantidad}</td>
                <td className={`p-3 text-right font-mono ${c.sinFactura > 0 ? 'text-amber-700' : ''}`}>{c.sinFactura}</td>
                <td className="p-3 text-right font-mono">L. {formatearMoneda(c.totalSinIsv)}</td>
              </tr>
            ))}
            {gastosPorCategoria.length === 0 && (
              <tr><td colSpan={4} className="p-6 text-center text-gray-400">Sin gastos deducibles en este período.</td></tr>
            )}
          </tbody>
          {gastosPorCategoria.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-marca font-semibold">
                <td className="p-3">Total gastos deducibles</td>
                <td className="p-3 text-right font-mono">{gastosPorCategoria.reduce((s, c) => s + c.cantidad, 0)}</td>
                <td className="p-3 text-right font-mono">{gastosPorCategoria.reduce((s, c) => s + c.sinFactura, 0)}</td>
                <td className="p-3 text-right font-mono">L. {formatearMoneda(gastosPorCategoria.reduce((s, c) => s + c.totalSinIsv, 0))}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {gastosNoDeducibles.length > 0 && (
        <p className="mt-2 text-xs text-gray-500">
          {gastosNoDeducibles.length} gasto(s) marcados como personales no entran en este resumen (L. {formatearMoneda(sumarDocumentos(gastosNoDeducibles).total)}).
        </p>
      )}
      <p className="mt-2 text-xs text-gray-500">
        &quot;Sin factura&quot; = recibos, planillas u otros documentos. Revisa con tu contador si se aceptan como deducción.
      </p>

      {/* Detalle casilla por casilla, al final: arriba queda el resumen visual */}
      {tipo === 'mes' && (
        <div id="formulario-201" className="mt-8 scroll-mt-4">
          <Formulario201Guia f={formulario} excedenteEstimado excluidos={excluidos} />
        </div>
      )}

      <p className="mt-6 text-xs text-gray-400 print:mt-10">
        Nota: el desglose por tasa de ISV en compras solo está disponible para compras registradas a partir de la actualización de esta función — las compras anteriores muestran 0 en estas columnas (su monto Total general sigue siendo correcto).
      </p>
    </>
  )
}