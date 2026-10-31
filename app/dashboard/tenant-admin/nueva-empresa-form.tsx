'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { crearEmpresa } from './actions'
import { estiloBoton, estiloInput } from '@/lib/estilos'

export default function NuevaEmpresaForm() {
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleCrear(formData: FormData) {
    setError('')
    setGuardando(true)
    const resultado = await crearEmpresa(formData)
    setGuardando(false)

    if (resultado?.error) return setError(resultado.error)
    router.refresh()
  }

  return (
    <form action={handleCrear} className="mb-8 grid max-w-xl gap-3 rounded-lg bg-white p-6 shadow-sm">
      <h2 className="font-semibold text-marca">Agregar nueva empresa</h2>
      <input name="razon_social" placeholder="Razón social" required className={`${estiloInput} text-sm`} />
      <input name="nombre_comercial" placeholder="Nombre comercial (opcional)" className={`${estiloInput} text-sm`} />
      <input name="rtn" placeholder="RTN" required className={`${estiloInput} font-mono text-sm`} />
      <input name="regimen_fiscal" placeholder="Régimen fiscal (ej. PYME)" className={`${estiloInput} text-sm`} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={guardando} className={estiloBoton}>
        {guardando ? 'Creando...' : 'Crear empresa'}
      </button>
    </form>
  )
}