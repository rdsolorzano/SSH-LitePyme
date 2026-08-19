'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setCargando(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setCargando(false)

    if (error) {
      setError('Correo o contraseña incorrectos.')
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm rounded-lg bg-white p-8 shadow"
      >
        <h1 className="mb-6 text-xl font-semibold text-gray-800">
          Iniciar sesión
        </h1>

        <label className="mb-1 block text-sm text-gray-600">Correo</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mb-4 w-full rounded border px-3 py-2"
        />

        <label className="mb-1 block text-sm text-gray-600">Contraseña</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mb-4 w-full rounded border px-3 py-2"
        />

        {error && (
          <p className="mb-4 text-sm text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={cargando}
          className="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {cargando ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
    </div>
  )
}