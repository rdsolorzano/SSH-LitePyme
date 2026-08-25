'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Empresa = { id: string; razon_social: string; nombre_comercial: string | null; logo_url: string | null }

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Inicio', icon: '🏠' },
  { href: '/dashboard/productos', label: 'Productos y servicios', icon: '📦' },
  { href: '/dashboard/proveedores', label: 'Proveedores', icon: '🚚' },
  { href: '/dashboard/clientes', label: 'Clientes', icon: '👤' },
  { href: '/dashboard/compras', label: 'Compras', icon: '🛒' },
  { href: '/dashboard/cotizaciones', label: 'Cotizaciones', icon: '📝' },
  { href: '/dashboard/facturas', label: 'Facturación', icon: '🧾' },
  { href: '/dashboard/configuracion', label: 'Configuración', icon: '⚙️' },
  { href: '/dashboard/empresas', label: 'Mis empresas', icon: '🏢' },
  { href: '/dashboard/perfil', label: 'Mi perfil', icon: '👤' },
]

export default function NavShell({
  children,
  empresas,
  empresaActiva,
  cerrarSesion,
  seleccionarEmpresa,
}: {
  children: React.ReactNode
  empresas: Empresa[]
  empresaActiva: Empresa | null
  cerrarSesion: () => Promise<void>
  seleccionarEmpresa: (formData: FormData) => Promise<void>
}) {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const pathname = usePathname()

  const nombreEmpresa =
    empresaActiva?.nombre_comercial || empresaActiva?.razon_social || 'Mi Sistema'

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      {/* Barra superior — solo en móvil */}
      <header className="flex items-center justify-between bg-[#1B2430] px-4 py-3 text-white md:hidden print:hidden">
        <button onClick={() => setMenuAbierto(true)} aria-label="Abrir menú" className="text-2xl leading-none">
          ☰
        </button>
        <span className="truncate text-sm font-semibold">{nombreEmpresa}</span>
        <div className="w-6" />
      </header>

      {/* Fondo oscuro al abrir el menú en móvil */}
      {menuAbierto && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setMenuAbierto(false)} />
      )}

      {/* Menú lateral (fijo en escritorio, deslizable en móvil) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#1B2430] text-white transition-transform duration-200 md:translate-x-0 print:hidden ${
          menuAbierto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="border-b border-white/10 p-5">
          <p className="text-xs uppercase tracking-wide text-white/50">Empresa activa</p>
          <div className="mt-2 flex items-center gap-2">
            {empresaActiva?.logo_url && (
              <img src={empresaActiva.logo_url} alt="" className="h-8 w-8 rounded bg-white object-contain p-0.5" />
            )}
            <p className="truncate font-semibold">{nombreEmpresa}</p>
          </div>

          {empresas.length > 1 && (
            <div className="mt-3 space-y-1">
              {empresas.map((e) => (
                <form key={e.id} action={seleccionarEmpresa}>
                  <input type="hidden" name="empresaId" value={e.id} />
                  <button
                    type="submit"
                    className={`w-full rounded px-2 py-1 text-left text-xs ${
                      e.id === empresaActiva?.id
                        ? 'bg-[#0E7C86] text-white'
                        : 'text-white/60 hover:bg-white/5'
                    }`}
                  >
                    {e.nombre_comercial || e.razon_social}
                  </button>
                </form>
              ))}
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV_ITEMS.map((item) => {
            const activo = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuAbierto(false)}
                className={`flex items-center gap-3 rounded-lg border-l-4 px-3 py-2 text-sm transition-colors ${
                  activo
                    ? 'border-[#14A3AF] bg-white/5 font-medium text-white'
                    : 'border-transparent text-white/60 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        <form action={cerrarSesion} className="border-t border-white/10 p-3">
          <button
            type="submit"
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-white/60 hover:bg-white/5 hover:text-white"
          >
            👋 Cerrar sesión
          </button>
        </form>
      </aside>

      {/* Contenido de cada pantalla */}
      <main className="md:ml-64 print:ml-0">
        <div className="mx-auto max-w-5xl p-4 md:p-8 print:max-w-none print:p-0">{children}</div>
      </main>
    </div>
  )
}