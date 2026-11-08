'use client'

import BotonDescargarPdf from '@/components/BotonDescargarPdf'
import { nombreArchivoCotizacion } from '@/lib/formato'
import { CotizacionDocument } from '@/lib/pdf/cotizacion-pdf'
import type { ItemDoc, EmpresaDoc, ClienteDoc, TotalesDoc } from '@/lib/pdf/comunes'

export default function DescargarPdfBoton({
  empresa,
  cliente,
  cotizacion,
  items,
}: {
  empresa: EmpresaDoc
  cliente: ClienteDoc
  cotizacion: { numero: string; fecha: string; validez_dias: number; notas?: string | null } & TotalesDoc
  items: ItemDoc[]
}) {
  return (
    <BotonDescargarPdf
      nombreArchivo={`${nombreArchivoCotizacion(cotizacion.numero)}.pdf`}
      generar={() => <CotizacionDocument empresa={empresa} cliente={cliente} cotizacion={cotizacion} items={items} />}
    />
  )
}
