'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function PerfilForm({ email, nombreActual }: { email: string; nombreActual: string }) {
  const [nombre, setNombre] = useState(nombreActual)
  const [guardandoNombre, setGuardandoNombre] = useState(false)
  const [mensajeNombre, setMensajeNombre] = useState('')

  const [passwordActual, setPasswordActual] = useState('')
  const [passwordNueva, setPasswordNueva] = useState('')
  const [passwordConfirmar, setPasswordConfirmar] = useState('')
  const [cambiandoPassword, setCambiandoPassword] = useState(false)
  const [mensajePassword, setMensajePassword] = useState('')

  const router = useRouter()

  async function guardarNombre() {
    setGuardandoNombre(true)
    setMensajeNombre('')
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ data: { full_name: nombre } })
    setGuardandoNombre(false)

    if (error) {
      setMensajeNombre('No se pudo guardar: ' + error.message)
      return
    }
    setMensajeNombre('Nombre actualizado.')
    router.refresh()
  }

  async function cambiarPassword() {
    setMensajePassword('')

    if (passwordNueva.length < 6) return setMensajePassword('La nueva contraseña debe tener al menos 6 caracteres.')
    if (passwordNueva !== passwordConfirmar) return setMensajePassword('Las contraseñas nuevas no coinciden.')

    setCambiandoPassword(true)
    const supabase = createClient()

    // Verificamos la contraseña actual antes de permitir el cambio
    const { error: errorVerificacion } = await supabase.auth.signInWithPassword({
      email,
      password: passwordActual,
    })

    if (errorVerificacion) {
      setCambiandoPassword(false)
      return setMensajePassword('La contraseña actual no es correcta.')
    }

    const { error } = await supabase.auth.updateUser({ password: passwordNueva })
    setCambiandoPassword(false)

    if (error) return setMensajePassword('No se pudo cambiar: ' + error.message)

    setMensajePassword('Contraseña actualizada correctamente.')
    setPasswordActual('')
    setPasswordNueva('')
    setPasswordConfirmar('')
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-[#1B2430]">Datos de la cuenta</h2>

        <label className="mb-1 block text-xs text-gray-500">Correo</label>
        <div className="mb-4 rounded border bg-gray-50 px-3 py-2 text-sm text-gray-500">{email}</div>

        <label className="mb-1 block text-xs text-gray-500">Nombre completo</label>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: Ruben Solorzano"
          className="mb-3 w-full rounded border px-3 py-2 text-sm"
        />

        {mensajeNombre && <p className="mb-3 text-sm text-[#0E7C86]">{mensajeNombre}</p>}

        <button
          onClick={guardarNombre}
          disabled={guardandoNombre}
          className="rounded bg-[#0E7C86] px-4 py-2 text-sm text-white hover:bg-[#0c6971] disabled:opacity-50"
        >
          {guardandoNombre ? 'Guardando...' : 'Guardar nombre'}
        </button>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-[#1B2430]">Cambiar contraseña</h2>

        <label className="mb-1 block text-xs text-gray-500">Contraseña actual</label>
        <input
          type="password"
          value={passwordActual}
          onChange={(e) => setPasswordActual(e.target.value)}
          className="mb-3 w-full rounded border px-3 py-2 text-sm"
        />

        <label className="mb-1 block text-xs text-gray-500">Nueva contraseña</label>
        <input
          type="password"
          value={passwordNueva}
          onChange={(e) => setPasswordNueva(e.target.value)}
          className="mb-3 w-full rounded border px-3 py-2 text-sm"
        />

        <label className="mb-1 block text-xs text-gray-500">Confirmar nueva contraseña</label>
        <input
          type="password"
          value={passwordConfirmar}
          onChange={(e) => setPasswordConfirmar(e.target.value)}
          className="mb-3 w-full rounded border px-3 py-2 text-sm"
        />

        {mensajePassword && <p className="mb-3 text-sm text-gray-600">{mensajePassword}</p>}

        <button
          onClick={cambiarPassword}
          disabled={cambiandoPassword}
          className="rounded bg-[#0E7C86] px-4 py-2 text-sm text-white hover:bg-[#0c6971] disabled:opacity-50"
        >
          {cambiandoPassword ? 'Cambiando...' : 'Cambiar contraseña'}
        </button>
      </div>
    </div>
  )
}