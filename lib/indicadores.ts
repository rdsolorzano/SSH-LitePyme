// Cálculos del panel de inicio (fechas en hora de Honduras y plazos del SAR).
import { sumarDocumentos, type TotalesFiscales } from './gastos'

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

// Fecha de hoy en Honduras (el servidor de Vercel trabaja en UTC)
export function hoyHonduras(): string {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Tegucigalpa', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  return p // formato YYYY-MM-DD
}

const aFecha = (iso: string) => new Date(`${iso}T12:00:00Z`)
const aIso = (d: Date) => d.toISOString().slice(0, 10)

export function claveMes(fecha: string | null | undefined) {
  return (fecha || '').slice(0, 7)
}

export function sumarMeses(clave: string, n: number) {
  const [a, m] = clave.split('-').map(Number)
  const d = new Date(Date.UTC(a, m - 1 + n, 1, 12))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export function etiquetaMes(clave: string) {
  return MESES_CORTOS[Number(clave.slice(5, 7)) - 1] ?? clave
}

export function nombreMes(clave: string) {
  return `${MESES_LARGOS[Number(clave.slice(5, 7)) - 1] ?? clave} ${clave.slice(0, 4)}`
}

// Últimos n meses terminando en el mes de "hoy" (del más antiguo al actual)
export function ultimosMeses(hoy: string, n: number) {
  const actual = claveMes(hoy)
  return Array.from({ length: n }, (_, i) => sumarMeses(actual, i - (n - 1)))
}

// Declaración mensual de ISV: vence el día 10 del mes siguiente;
// si cae sábado o domingo pasa al lunes (no considera feriados).
export function fechaLimiteIsv(mesDeclarado: string) {
  const d = aFecha(`${sumarMeses(mesDeclarado, 1)}-10`)
  const dia = d.getUTCDay()
  if (dia === 6) d.setUTCDate(d.getUTCDate() + 2)
  if (dia === 0) d.setUTCDate(d.getUTCDate() + 1)
  return aIso(d)
}

export function diasEntre(desde: string, hasta: string) {
  return Math.round((aFecha(hasta).getTime() - aFecha(desde).getTime()) / 86400000)
}

export function restarDias(fecha: string, dias: number) {
  const d = aFecha(fecha)
  d.setUTCDate(d.getUTCDate() - dias)
  return aIso(d)
}

// % de cambio contra el valor anterior; null si no hay base para comparar
export function variacion(actual: number, anterior: number) {
  if (!anterior) return null
  return ((actual - anterior) / Math.abs(anterior)) * 100
}

export const netoSinIsv = (t: TotalesFiscales) => t.total - t.isv15 - t.isv18
export const isvDe = (t: TotalesFiscales) => t.isv15 + t.isv18

// Agrupa documentos por mes (clave YYYY-MM) y suma sus campos fiscales
export function totalesPorMes<T extends { fecha: string }>(docs: T[], meses: string[]) {
  const mapa = new Map<string, T[]>(meses.map((m) => [m, []]))
  for (const d of docs) mapa.get(claveMes(d.fecha))?.push(d)
  return new Map(meses.map((m) => [m, sumarDocumentos(mapa.get(m) as Parameters<typeof sumarDocumentos>[0])]))
}

// Último día del mes: "2026-10" -> "2026-10-31"
export function ultimoDiaMes(clave: string) {
  const [a, m] = clave.split('-').map(Number)
  return `${clave}-${String(new Date(Date.UTC(a, m, 0)).getUTCDate()).padStart(2, '0')}`
}
