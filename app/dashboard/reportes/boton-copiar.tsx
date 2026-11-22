'use client'

import { useState } from 'react'

// Copia un valor tal como lo pide el formulario del SAR (ej. "4894.44")
export default function BotonCopiar({ valor }: { valor: string }) {
  const [copiado, setCopiado] = useState(false)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(valor)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1500)
    } catch {
      // Si el navegador no permite copiar, el valor queda visible para escribirlo a mano
    }
  }

  return (
    <button
      type="button"
      onClick={copiar}
      title={`Copiar ${valor}`}
      className={`rounded border px-2 py-0.5 text-xs print:hidden ${copiado ? 'border-green-600 text-green-700' : 'text-gray-500 hover:bg-gray-50'}`}
    >
      {copiado ? 'Copiado' : 'Copiar'}
    </button>
  )
}
