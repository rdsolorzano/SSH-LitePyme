'use client'

import { useRouter } from 'next/navigation'

export default function BotonVolver({ fallbackHref }: { fallbackHref: string }) {
  const router = useRouter()

  function volver() {
    if (window.history.length > 1) router.back()
    else router.push(fallbackHref)
  }

  return (
    <button onClick={volver} className="text-sm text-[#0E7C86] hover:underline">
      ← Volver
    </button>
  )
}