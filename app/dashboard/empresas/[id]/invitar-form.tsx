'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { invitarUsuario } from '../actions'
import { estiloBoton, estiloInput } from '@/lib/estilos'

export default function InvitarForm({ empresaId }: { empresaId: string }) {
  const [email, setEmail] = useState('')
  const [rol, setRol] = useState('admin')
  const [enviando, setEnviando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const router = useRouter()

  async function invitar() {
    if (!email) return
    setEnviando(true)
    setMensaje('')
    const resultado = await invitarUsuario(empresaId, email, rol)
    setEnviando(false)

    if (resultado?.error) {
      setMensaje(resultado.error)
      return
    }

    setMensaje('Listo — se envió la invitación (o se vinculó, si ya tenía cuenta).')
    setEmail('')
    router.refresh()
  }

  return (
    <div className="mb-6 flex max-w-xl flex-wrap items-end gap-2 rounded-lg bg-white p-4 shadow-sm">
      <div className="flex-1">
        <label className="mb-1 block text-xs text-gray-500">Correo a invitar</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`${estiloInput} w-full text-sm`} />
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray-500">Rol</label>
        <select value={rol} onChange={(e) => setRol(e.target.value)} className={`${estiloInput} text-sm`}>
          <option value="admin">Administrador</option>
          <option value="vendedor">Vendedor</option>
          <option value="solo_lectura">Solo lectura</option>
        </select>
      </div>
      <button onClick={invitar} disabled={enviando} className={estiloBoton}>
        {enviando ? 'Enviando...' : 'Invitar'}
      </button>
      {mensaje && <p className="w-full text-sm text-gray-600">{mensaje}</p>}
    </div>
  )
}