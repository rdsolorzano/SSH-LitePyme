'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { destinoVolver } from '@/lib/navegacion'

// "← Volver" que nunca usa el historial del navegador (ver lib/navegacion.ts):
// va al origen indicado en "?volver=" o, si no hay, a la pantalla padre ("href").
// "reemplazar": úsalo en pantallas de edición, para que el botón atrás del navegador
// no vuelva a caer en el formulario.
export default function BotonVolver({
  href,
  texto = 'Volver',
  reemplazar = false,
}: {
  href: string
  texto?: string
  reemplazar?: boolean
}) {
  const searchParams = useSearchParams()
  const destino = destinoVolver(searchParams.get('volver'), href)

  return (
    <Link href={destino} replace={reemplazar} className="text-sm text-acento hover:underline print:hidden">
      ← {texto}
    </Link>
  )
}
