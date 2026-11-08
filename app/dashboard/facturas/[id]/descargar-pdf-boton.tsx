'use client'

import BotonDescargarPdf from '@/components/BotonDescargarPdf'
import { FacturaDocument, type ItemDoc, type EmpresaDoc, type ClienteDoc } from '@/lib/pdf/factura-pdf'
import type { TotalesDoc } from '@/lib/pdf/comunes'
import { nombreArchivoFactura } from '@/lib/formato'

export default function DescargarPdfBoton({
  empresa,
  cliente,
  factura,
  cai,
  items,
}: {
  empresa: EmpresaDoc
  cliente: ClienteDoc
  factura: { numero_correlativo: string; fecha: string } & TotalesDoc
  cai: { cai: string; punto_emision?: string | null; rango_inicial: number; rango_final: number; fecha_limite_emision: string }
  items: ItemDoc[]
}) {
  return (
    <BotonDescargarPdf
      nombreArchivo={`${nombreArchivoFactura(factura.numero_correlativo)}.pdf`}
      generar={() => <FacturaDocument empresa={empresa} cliente={cliente} factura={factura} cai={cai} items={items} />}
    />
  )
}
