'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ActualizarPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.')
    if (password !== confirmar) return setError('Las contraseñas no coinciden.')

    setGuardando(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setGuardando(false)

    if (error) return setError(error.message)

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-lg bg-white p-8 shadow">
        <h1 className="mb-2 text-xl font-semibold text-gray-800">Crea tu contraseña</h1>
        <p className="mb-6 text-sm text-gray-500">Estás a punto de acceder al sistema por primera vez.</p>

        <label className="mb-1 block text-sm text-gray-600">Nueva contraseña</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mb-4 w-full rounded border px-3 py-2" />

        <label className="mb-1 block text-sm text-gray-600">Confirmar contraseña</label>
        <input type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} required className="mb-4 w-full rounded border px-3 py-2" />

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={guardando} className="w-full rounded bg-[#0E7C86] py-2 text-white hover:bg-[#0c6971] disabled:opacity-50">
          {guardando ? 'Guardando...' : 'Guardar y continuar'}
        </button>
      </form>
    </div>
  )
}