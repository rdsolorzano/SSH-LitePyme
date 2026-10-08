'use client'

import { useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import { ReportePdf } from '@/lib/pdf/reporte-pdf'

type Totales = { gravado15: number; gravado18: number; exento: number; isv15: number; isv18: number; total: number }

export default function DescargarPdfBoton({
  empresaNombre,
  desde,
  hasta,
  ventas,
  totalesVentas,
  compras,
  totalesCompras,
  isvNeto,
}: {
  empresaNombre: string
  desde: string
  hasta: string
  ventas: any[]
  totalesVentas: Totales
  compras: any[]
  totalesCompras: Totales
  isvNeto: number
}) {
  const [generando, setGenerando] = useState(false)

  async function descargar() {
    setGenerando(true)
    try {
      const blob = await pdf(
        <ReportePdf
          empresaNombre={empresaNombre}
          desde={desde}
          hasta={hasta}
          ventas={ventas}
          totalesVentas={totalesVentas}
          compras={compras}
          totalesCompras={totalesCompras}
          isvNeto={isvNeto}
        />
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Reporte-${desde}_al_${hasta}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } finally {
      setGenerando(false)
    }
  }

  return (
    <button onClick={descargar} disabled={generando} className="rounded bg-[#0E7C86] px-4 py-2 text-sm text-white hover:bg-[#0c6971] disabled:opacity-50">
      {generando ? 'Generando PDF...' : 'Descargar PDF (horizontal)'}
    </button>
  )
}