'use client'

export default function BotonImprimir() {
  return (
    <button onClick={() => window.print()} className="rounded bg-[#0E7C86] px-4 py-2 text-sm text-white hover:bg-[#0c6971]">
      Imprimir / Guardar PDF
    </button>
  )
}