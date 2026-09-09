'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts'

const COLORES = ['#0E7C86', '#14A3AF', '#C97A2B', '#2F9E44', '#C0392B', '#1B2430']

export default function DashboardCharts({
  ventasPorMes,
  distribucionIsv,
  topClientes,
  ordenesPorEstado,
}: {
  ventasPorMes: { mes: string; total: number }[]
  distribucionIsv: { name: string; value: number }[]
  topClientes: { nombre: string; total: number }[]
  ordenesPorEstado: { estado: string; cantidad: number }[]
}) {
  return (
    <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-lg bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-[#1B2430]">Ventas últimos 6 meses</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={ventasPorMes}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => `L. ${Number(v).toFixed(2)}`} />
            <Bar dataKey="total" fill="#0E7C86" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-lg bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-[#1B2430]">Distribución de ventas (mes actual)</h3>
        {distribucionIsv.length === 0 ? (
          <p className="flex h-[220px] items-center justify-center text-sm text-gray-400">Sin ventas este mes todavía.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={distribucionIsv} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {distribucionIsv.map((_, i) => (
                  <Cell key={i} fill={COLORES[i % COLORES.length]} />
                ))}
              </Pie>
            <Tooltip formatter={(v) => `L. ${Number(v).toFixed(2)}`} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="rounded-lg bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-[#1B2430]">Top 5 clientes (últimos 90 días)</h3>
        {topClientes.length === 0 ? (
          <p className="flex h-[220px] items-center justify-center text-sm text-gray-400">Sin ventas en este período.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topClientes} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="nombre" type="category" tick={{ fontSize: 11 }} width={100} />
            <Tooltip formatter={(v) => `L. ${Number(v).toFixed(2)}`} />
              <Bar dataKey="total" fill="#14A3AF" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="rounded-lg bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-[#1B2430]">Órdenes de trabajo por estado</h3>
        {ordenesPorEstado.length === 0 ? (
          <p className="flex h-[220px] items-center justify-center text-sm text-gray-400">Sin órdenes registradas.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={ordenesPorEstado} dataKey="cantidad" nameKey="estado" cx="50%" cy="50%" outerRadius={80} label>
                {ordenesPorEstado.map((_, i) => (
                  <Cell key={i} fill={COLORES[i % COLORES.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}