'use client'

import { useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import { formatearNumeroDocumento } from '@/lib/formato'
import { FacturaDocument, type ItemDoc, type EmpresaDoc, type ClienteDoc } from '@/lib/pdf/factura-pdf'

export default function DescargarPdfBoton({
  empresa,
  cliente,
  factura,
  cai,
  items,
}: {
  empresa: EmpresaDoc
  cliente: ClienteDoc
  factura: { numero_correlativo: string; fecha: string; subtotal_gravado_15: number; subtotal_gravado_18: number; subtotal_exento: number; isv_15: number; isv_18: number; total: number }
  cai: { cai: string; punto_emision?: string | null; rango_inicial: number; rango_final: number; fecha_limite_emision: string }
  items: ItemDoc[]
}) {
  const [generando, setGenerando] = useState(false)

  async function descargar() {
    setGenerando(true)
    try {
      const blob = await pdf(
        <FacturaDocument empresa={empresa} cliente={cliente} factura={factura} cai={cai} items={items} />
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Factura-${factura.numero_correlativo}.pdf`
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