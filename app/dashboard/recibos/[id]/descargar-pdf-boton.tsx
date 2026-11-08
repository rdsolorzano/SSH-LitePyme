'use client'

import BotonDescargarPdf from '@/components/BotonDescargarPdf'
import { nombreArchivoRecibo } from '@/lib/formato'
import { ReciboDocument } from '@/lib/pdf/recibo-pdf'
import type { EmpresaDoc, ClienteDoc } from '@/lib/pdf/comunes'

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
  return (
    <BotonDescargarPdf
      nombreArchivo={`${nombreArchivoRecibo(recibo.numero)}.pdf`}
      generar={() => <ReciboDocument empresa={empresa} cliente={cliente} recibo={recibo} items={items} />}
    />
  )
}
