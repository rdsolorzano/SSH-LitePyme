'use client'

import { useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import { ReciboDocument } from '@/lib/pdf/recibo-pdf'
import type { EmpresaDoc, ClienteDoc } from '@/lib/pdf/factura-pdf'

export default function DescargarPdfBoton({
  empresa,
  cliente,
  recibo,
  items,
}: {
  empresa: EmpresaDoc
  cliente: ClienteDoc
  recibo: { numero: string; fecha: string; total: number; notas?: string | null }
  items: { descripcion: string; cantidad: number; precio_unitario: number; subtotal: number }[]
}) {
  const [generando, setGenerando] = useState(false)

  async function descargar() {
    setGenerando(true)
    try {
      const blob = await pdf(<ReciboDocument empresa={empresa} cliente={cliente} recibo={recibo} items={items} />).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Recibo-${recibo.numero}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } finally {
      setGenerando(false)
    }
  }

  return (
    <button onClick={descargar} disabled={generando} className="rounded bg-[#0E7C86] px-4 py-2 text-sm text-white hover:bg-[#0c6971] disabled:opacity-50">
      {generando ? 'Generando PDF...' : 'Descargar PDF'}
    </button>
  )
}