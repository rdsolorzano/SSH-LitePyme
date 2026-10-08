'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

export default function BuscadorLista({ placeholder }: { placeholder: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const qActual = searchParams.get('q') || ''
  const [texto, setTexto] = useState(qActual)

  useEffect(() => {
    const limpio = texto.trim()
    if (limpio === qActual) return undefined

    const espera = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (limpio) params.set('q', limpio)
      else params.delete('q')
      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    }, 350)

    return () => clearTimeout(espera)
  }, [texto, qActual, pathname, router, searchParams])

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder={placeholder}
        className="w-full max-w-sm rounded border px-3 py-2 text-sm"
      />
      {texto && (
        <button type="button" onClick={() => setTexto('')} className="text-xs text-gray-400 hover:underline">
          Quitar filtro
        </button>
      )}
    </div>
  )
}