'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { actualizarEmpresa, actualizarLogo } from './actions'

type Empresa = {
  id: string
  razon_social: string
  nombre_comercial: string | null
  nombre_impresion: string | null
  nombre_documento_origen: string | null
  rtn: string
  direccion: string | null
  telefono: string | null
  correo_electronico: string | null
  sitio_web: string | null
  regimen_fiscal: string | null
  logo_url: string | null
}

export default function ConfiguracionForm({ empresa }: { empresa: Empresa }) {
  const [guardando, setGuardando] = useState(false)
  const [subiendoLogo, setSubiendoLogo] = useState(false)
  const [logoUrl, setLogoUrl] = useState(empresa.logo_url)
  const [mensaje, setMensaje] = useState('')
  const router = useRouter()

  async function handleGuardar(formData: FormData) {
    setGuardando(true)
    await actualizarEmpresa(formData)
    setGuardando(false)
    setMensaje('Datos guardados.')
    router.refresh()
    setTimeout(() => setMensaje(''), 3000)
  }

  async function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setSubiendoLogo(true)
    const supabase = createClient()
    const extension = file.name.split('.').pop()
    const ruta = `${empresa.id}/logo.${extension}`

    const { error } = await supabase.storage.from('logos').upload(ruta, file, { upsert: true })

    if (error) {
      setMensaje('No se pudo subir el logo: ' + error.message)
      setSubiendoLogo(false)
      return
    }

    const { data } = supabase.storage.from('logos').getPublicUrl(ruta)
    const urlConVersion = `${data.publicUrl}?v=${Date.now()}`

    await actualizarLogo(empresa.id, urlConVersion)
    setLogoUrl(urlConVersion)
    setSubiendoLogo(false)
    router.refresh()
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-[#1B2430]">Logo de la empresa</h2>
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border bg-gray-50">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" />
            ) : (
              <span className="text-xs text-gray-400">Sin logo</span>
            )}
          </div>
          <div>
            <label className="cursor-pointer rounded border px-3 py-1.5 text-sm hover:bg-gray-50">
              {subiendoLogo ? 'Subiendo...' : 'Cambiar logo'}
              <input type="file" accept="image/*" onChange={handleLogo} disabled={subiendoLogo} className="hidden" />
            </label>
            <p className="mt-1 text-xs text-gray-400">PNG o JPG, fondo transparente recomendado.</p>
          </div>
        </div>
      </div>

      <form action={handleGuardar} className="space-y-3 rounded-lg bg-white p-6 shadow-sm">
        <h2 className="mb-1 font-semibold text-[#1B2430]">Datos mercantiles</h2>

        <div>
          <label className="mb-1 block text-xs text-gray-500">Razón social</label>
          <input name="razon_social" defaultValue={empresa.razon_social} required className="w-full rounded border px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Nombre comercial</label>
          <input name="nombre_comercial" defaultValue={empresa.nombre_comercial || ''} className="w-full rounded border px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">RTN</label>
          <input name="rtn" defaultValue={empresa.rtn} required className="w-full rounded border px-3 py-2 font-mono text-sm" />
        </div>

        <div>
          <label className="mb-1 block text-xs text-gray-500">Nombre de impresión (opcional)</label>
          <input name="nombre_impresion" defaultValue={empresa.nombre_impresion || ''} className="w-full rounded border px-3 py-2 text-sm" placeholder="Ej: un nombre distinto para facturas/cotizaciones" />
        </div>

        <div>
          <label className="mb-1 block text-xs text-gray-500">Nombre que se imprime en facturas y cotizaciones</label>
          <select name="nombre_documento_origen" defaultValue={empresa.nombre_documento_origen || 'razon_social'} className="w-full rounded border px-3 py-2 text-sm">
            <option value="razon_social">Razón social</option>
            <option value="nombre_comercial">Nombre comercial</option>
            <option value="nombre_impresion">Nombre de impresión (el de arriba)</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs text-gray-500">Correo electrónico</label>
          <input name="correo_electronico" type="email" defaultValue={empresa.correo_electronico || ''} className="w-full rounded border px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="mb-1 block text-xs text-gray-500">Sitio web</label>
          <input name="sitio_web" defaultValue={empresa.sitio_web || ''} className="w-full rounded border px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Dirección</label>
          <input name="direccion" defaultValue={empresa.direccion || ''} className="w-full rounded border px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Teléfono</label>
          <input name="telefono" defaultValue={empresa.telefono || ''} className="w-full rounded border px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Régimen fiscal</label>
          <input name="regimen_fiscal" defaultValue={empresa.regimen_fiscal || ''} className="w-full rounded border px-3 py-2 text-sm" />
        </div>

        {mensaje && <p className="text-sm text-[#0E7C86]">{mensaje}</p>}

        <button type="submit" disabled={guardando} className="rounded bg-[#0E7C86] px-4 py-2 text-sm text-white hover:bg-[#0c6971] disabled:opacity-50">
          {guardando ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>
    </div>
  )
}