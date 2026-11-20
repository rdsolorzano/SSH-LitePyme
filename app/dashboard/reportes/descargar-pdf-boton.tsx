'use client'

import BotonDescargarPdf from '@/components/BotonDescargarPdf'
import { ReportePdf } from '@/lib/pdf/reporte-pdf'
import type { Gasto, TotalesFiscales } from '@/lib/gastos'

type Totales = TotalesFiscales

export default function DescargarPdfBoton({
  empresaNombre,
  desde,
  hasta,
  mes = null,
  ventas,
  totalesVentas,
  compras,
  totalesCompras,
  gastos,
  isvNeto,
}: {
  empresaNombre: string
  desde: string
  hasta: string
  mes?: string | null // "2026-10" cuando se eligió un mes
  ventas: any[]
  totalesVentas: Totales
  compras: any[]
  totalesCompras: Totales
  gastos: Gasto[]
  isvNeto: number
}) {
  return (
    <BotonDescargarPdf
      nombreArchivo={mes ? `SAR-${mes}.pdf` : `SAR-${desde}_al_${hasta}.pdf`}
      texto="Descargar PDF (horizontal)"
      generar={() => (
        <ReportePdf
          empresaNombre={empresaNombre}
          desde={desde}
          hasta={hasta}
          ventas={ventas}
          totalesVentas={totalesVentas}
          compras={compras}
          totalesCompras={totalesCompras}
          gastos={gastos}
          isvNeto={isvNeto}
        />
      )}
    />
  )
}
