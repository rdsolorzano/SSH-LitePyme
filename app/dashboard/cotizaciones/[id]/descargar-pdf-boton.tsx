'use client'

import { useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import { CotizacionDocument } from '@/lib/pdf/cotizacion-pdf'
import type { ItemDoc, EmpresaDoc, ClienteDoc } from '@/lib/pdf/factura-pdf'
import type { ExoneracionDoc } from '@/lib/exoneracion'
import { estiloBoton } from '@/lib/estilos'

export default function DescargarPdfBoton({
  empresa,
  cliente,
  cotizacion,
  items,
}: {
  empresa: EmpresaDoc
  cliente: ClienteDoc
  cotizacion: { numero: string; fecha: string; validez_dias: number; notas?: string | null; subtotal_gravado_15: number; subtotal_gravado_18: number; subtotal_exento: number; isv_15: number; isv_18: number; total: number } & ExoneracionDoc
  items: ItemDoc[]
}) {
  const [generando, setGenerando] = useState(false)

  async function descargar() {
    setGenerando(true)
    try {
      const blob = await pdf(
        <CotizacionDocument empresa={empresa} cliente={cliente} cotizacion={cotizacion} items={items} />
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Cotizacion-${cotizacion.numero}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } finally {
      setGenerando(false)
    }
  }

  return (
    <button onClick={descargar} disabled={generando} className={estiloBoton}>
      {generando ? 'Generando PDF...' : 'Descargar PDF'}
    </button>
  )
}