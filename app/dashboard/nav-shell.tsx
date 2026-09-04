'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Empresa = { id: string; razon_social: string; nombre_comercial: string | null; logo_url: string | null }

const NAV_GRUPOS = [
  {
    titulo: 'Administrativo',
    items: [
      { href: '/dashboard/productos', label: 'Productos y servicios', icon: '📦' },
      { href: '/dashboard/proveedores', label: 'Proveedores', icon: '🚚' },
      { href: '/dashboard/clientes', label: 'Clientes', icon: '👤' },
      { href: '/dashboard/compras', label: 'Compras', icon: '🛒' },
    ],
  },
  {
    titulo: 'Ventas | POS',
    items: [
      { href: '/dashboard/cotizaciones', label: 'Cotizaciones', icon: '📝' },
      { href: '/dashboard/facturas', label: 'Facturación', icon: '🧾' },
    ],
  },
  {
    titulo: 'Seguimiento',
    items: [
      { href: '/dashboard/ordenes', label: 'Órdenes de trabajo', icon: '🗒️' },
    ],
  },
  {
    titulo: 'Configuración de Usuario',
    items: [
      { href: '/dashboard/configuracion', label: 'Configuración de Empresa', icon: '⚙️' },
      { href: '/dashboard/empresas', label: 'Mis empresas', icon: '🏢' },
      { href: '/dashboard/perfil', label: 'Mi usuario', icon: '👤' },
    ],
  },
]

export default function NavShell({
  children,
  empresas,
  empresaActiva,
  cerrarSesion,
  seleccionarEmpresa,
  esSuperAdmin,
}: {
  children: React.ReactNode
  empresas: Empresa[]
  empresaActiva: Empresa | null
  cerrarSesion: () => Promise<void>
  seleccionarEmpresa: (formData: FormData) => Promise<void>
  esSuperAdmin: boolean
}) {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [grupoAbierto, setGrupoAbierto] = useState<string | null>(null)
  const pathname = usePathname()

  const nombreEmpresa =
    empresaActiva?.nombre_comercial || empresaActiva?.razon_social || 'Mi Sistema'

  function alternarGrupo(titulo: string) {
    setGrupoAbierto((prev) => (prev === titulo ? null : titulo))
  }

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
          <Link
            href="/dashboard"
            onClick={() => setMenuAbierto(false)}
            className={`flex items-center gap-3 rounded-lg border-l-4 px-3 py-2 text-sm transition-colors ${
              pathname === '/dashboard'
                ? 'border-[#14A3AF] bg-white/5 font-medium text-white'
                : 'border-transparent text-white/60 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span>🏠</span>
            Inicio
          </Link>

          {NAV_GRUPOS.map((grupo) => {
            const abierto = grupoAbierto === grupo.titulo
            return (
              <div key={grupo.titulo} className="mt-2">
                <button
                  type="button"
                  onClick={() => alternarGrupo(grupo.titulo)}
                  className="flex w-full items-center justify-between px-3 py-1 text-xs uppercase tracking-wide text-white/40 hover:text-white/70"
                >
                  <span>{grupo.titulo}</span>
                  <span className="text-[10px]">{abierto ? '▾' : '▸'}</span>
                </button>

                {abierto && (
                  <div className="space-y-1">
                    {grupo.items.map((item) => {
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
                  </div>
                )}
              </div>
            )
          })}

          {esSuperAdmin && (
            <div className="mt-2">
              <p className="px-3 py-1 text-xs uppercase tracking-wide text-white/30">Administrador general</p>
              <Link
                href="/dashboard/tenant-admin"
                onClick={() => setMenuAbierto(false)}
                className={`flex items-center gap-3 rounded-lg border-l-4 px-3 py-2 text-sm transition-colors ${
                  pathname === '/dashboard/tenant-admin'
                    ? 'border-amber-400 bg-white/5 font-medium text-white'
                    : 'border-transparent text-amber-200/70 hover:bg-white/5 hover:text-amber-100'
                }`}
              >
                <span>🛡️</span>
                Tenant Admin
              </Link>
            </div>
          )}
        </nav>

        <div className="px-3 pt-2 text-center text-[10px] uppercase tracking-widest text-white/25">
          SSH LitePyme
        </div>

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
        <div className="mx-auto max-w-5xl p-4 md:p-8 print:max-w-none print:p-0">
          {children}
          <footer className="mt-10 border-t pt-4 text-center text-xs text-gray-400 print:hidden">
            © {new Date().getFullYear()} SSH LitePyme. Todos los derechos reservados.
          </footer>
        </div>
      </main>
    </div>
  )
}