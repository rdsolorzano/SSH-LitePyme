'use client'

export default function BotonImprimir() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
    >
      Imprimir / Guardar PDF
    </button>
  )
}