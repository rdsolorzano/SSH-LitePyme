'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEffect } from 'react'
import Logo from '@/components/Logo'
import { MARCA } from '@/lib/marca'
import { estiloBoton, estiloInput } from '@/lib/estilos'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const router = useRouter()
    useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
      router.replace('/actualizar-password' + window.location.hash)
    }
  }, [router])

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
        <div className="mb-2 flex justify-center">
          <Logo tamano={48} mostrarNombre={false} />
        </div>
        <p className="mb-1 text-center text-xs uppercase tracking-widest text-acento">{MARCA.nombreCompleto}</p>
        <h1 className="mb-6 text-center text-xl font-semibold text-gray-800">
          Iniciar sesión
        </h1>

        <label className="mb-1 block text-sm text-gray-600">Correo</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className={`${estiloInput} mb-4 w-full`}
        />

        <label className="mb-1 block text-sm text-gray-600">Contraseña</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className={`${estiloInput} mb-4 w-full`}
        />

        {error && (
          <p className="mb-4 text-sm text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={cargando}
          className={`${estiloBoton} w-full`}
        >
          {cargando ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
    </div>
  )
}