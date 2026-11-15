'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatearMoneda } from '@/lib/formato'

// Colores de la marca (ver app/globals.css)
const C = { marca: '#1B2430', acento: '#0E7C86', acentoClaro: '#14A3AF', ambar: '#C97A2B', verde: '#2F9E44', rojo: '#C0392B' }
const PALETA = [C.acento, C.acentoClaro, C.ambar, C.verde, C.rojo, C.marca]

const lempiras = (v: unknown) => `L. ${formatearMoneda(Number(v))}`
// Eje corto: 12,500 -> 12.5k
const eje = (v: number) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k` : String(v))

function Tarjeta({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-marca">{titulo}</h3>
      {subtitulo && <p className="mb-2 text-xs text-gray-400">{subtitulo}</p>}
      {children}
    </div>
  )
}

const Vacio = ({ texto }: { texto: string }) => (
  <p className="flex h-[240px] items-center justify-center text-sm text-gray-400">{texto}</p>
)

export default function DashboardCharts({
  ventasVsEgresos,
  isvPorMes,
  distribucionVentas,
  gastosPorCategoria,
  topClientes,
  ordenesPorEstado,
}: {
  ventasVsEgresos: { mes: string; ventas: number; egresos: number }[]
  isvPorMes: { mes: string; cobrado: number; pagado: number; neto: number }[]
  distribucionVentas: { name: string; value: number }[]
  gastosPorCategoria: { categoria: string; total: number }[]
  topClientes: { nombre: string; total: number }[]
  ordenesPorEstado: { estado: string; cantidad: number; color: string }[]
}) {
  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Tendencias</h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Tarjeta titulo="Ventas vs compras y gastos" subtitulo="Últimos 6 meses · sin ISV">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={ventasVsEgresos}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={eje} width={45} />
              <Tooltip formatter={lempiras} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="ventas" name="Ventas" fill={C.acento} radius={[4, 4, 0, 0]} />
              <Bar dataKey="egresos" name="Compras y gastos" fill={C.ambar} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Tarjeta>

        <Tarjeta titulo="ISV por mes" subtitulo="Cobrado en ventas, crédito de compras y gastos, y neto estimado a pagar">
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={isvPorMes}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={eje} width={45} />
              <Tooltip formatter={lempiras} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="cobrado" name="ISV cobrado" fill={C.acentoClaro} radius={[4, 4, 0, 0]} />
              <Bar dataKey="pagado" name="Crédito fiscal" fill={C.verde} radius={[4, 4, 0, 0]} />
              <Line dataKey="neto" name="Neto a pagar" stroke={C.rojo} strokeWidth={2} dot={{ r: 3 }} type="monotone" />
            </ComposedChart>
          </ResponsiveContainer>
        </Tarjeta>

        <Tarjeta titulo="Distribución de ventas" subtitulo="Mes actual · por tipo de venta">
          {distribucionVentas.length === 0 ? (
            <Vacio texto="Sin ventas este mes todavía." />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={distribucionVentas} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2}>
                  {distribucionVentas.map((_, i) => (
                    <Cell key={i} fill={PALETA[i % PALETA.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={lempiras} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Tarjeta>

        <Tarjeta titulo="Gastos por categoría" subtitulo="Mes actual · sin ISV">
          {gastosPorCategoria.length === 0 ? (
            <Vacio texto="Sin gastos registrados este mes." />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={gastosPorCategoria} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={eje} />
                <YAxis dataKey="categoria" type="category" tick={{ fontSize: 11 }} width={140} />
                <Tooltip formatter={lempiras} />
                <Bar dataKey="total" name="Gasto" fill={C.ambar} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Tarjeta>

        <Tarjeta titulo="Top 5 clientes" subtitulo="Últimos 90 días · ventas sin ISV">
          {topClientes.length === 0 ? (
            <Vacio texto="Sin ventas en este período." />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topClientes} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={eje} />
                <YAxis dataKey="nombre" type="category" tick={{ fontSize: 10 }} width={150} />
                <Tooltip formatter={lempiras} />
                <Bar dataKey="total" name="Ventas" fill={C.acentoClaro} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Tarjeta>

        <Tarjeta titulo="Órdenes de trabajo por estado" subtitulo="Todas las órdenes registradas">
          {ordenesPorEstado.length === 0 ? (
            <Vacio texto="Sin órdenes registradas." />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={ordenesPorEstado} dataKey="cantidad" nameKey="estado" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2}>
                  {ordenesPorEstado.map((o, i) => (
                    <Cell key={i} fill={o.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Tarjeta>
      </div>
    </section>
  )
}
