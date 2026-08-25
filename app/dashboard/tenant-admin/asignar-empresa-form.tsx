'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { asignarEmpresaAUsuario } from './actions'

type Usuario = { id: string; email: string; nombre: string }
type Empresa = { id: string; razon_social: string; nombre_comercial: string | null }

export default function AsignarEmpresaForm({ usuarios, empresas }: { usuarios: Usuario[]; empresas: Empresa[] }) {
  const [usuarioId, setUsuarioId] = useState('')
  const [empresaId, setEmpresaId] = useState('')
  const [rol, setRol] = useState('admin')
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const router = useRouter()

  async function asignar() {
    if (!usuarioId || !empresaId) return
    setGuardando(true)
    setMensaje('')
    const resultado = await asignarEmpresaAUsuario(usuarioId, empresaId, rol)
    setGuardando(false)

    if (resultado?.error) return setMensaje(resultado.error)
    setMensaje('Empresa asignada correctamente.')
    router.refresh()
  }

  return (
    <div className="mb-8 flex max-w-2xl flex-wrap items-end gap-2 rounded-lg bg-white p-4 shadow-sm">
      <div className="flex-1">
        <label className="mb-1 block text-xs text-gray-500">Usuario</label>
        <select value={usuarioId} onChange={(e) => setUsuarioId(e.target.value)} className="w-full rounded border px-3 py-2 text-sm">
          <option value="">-- Selecciona --</option>
          {usuarios.map((u) => (
            <option key={u.id} value={u.id}>{u.nombre ? `${u.nombre} (${u.email})` : u.email}</option>
          ))}
        </select>
      </div>
      <div className="flex-1">
        <label className="mb-1 block text-xs text-gray-500">Empresa</label>
        <select value={empresaId} onChange={(e) => setEmpresaId(e.target.value)} className="w-full rounded border px-3 py-2 text-sm">
          <option value="">-- Selecciona --</option>
          {empresas.map((e) => (
            <option key={e.id} value={e.id}>{e.nombre_comercial || e.razon_social}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray-500">Rol</label>
        <select value={rol} onChange={(e) => setRol(e.target.value)} className="rounded border px-3 py-2 text-sm">
          <option value="admin">Administrador</option>
          <option value="vendedor">Vendedor</option>
          <option value="solo_lectura">Solo lectura</option>
        </select>
      </div>
      <button onClick={asignar} disabled={guardando} className="rounded bg-[#0E7C86] px-4 py-2 text-sm text-white hover:bg-[#0c6971] disabled:opacity-50">
        {guardando ? 'Asignando...' : 'Asignar'}
      </button>
      {mensaje && <p className="w-full text-sm text-gray-600">{mensaje}</p>}
    </div>
  )
}