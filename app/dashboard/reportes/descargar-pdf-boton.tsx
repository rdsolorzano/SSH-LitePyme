'use client'

import BotonDescargarPdf from '@/components/BotonDescargarPdf'
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
  return (
    <BotonDescargarPdf
      nombreArchivo={`Reporte-${desde}_al_${hasta}.pdf`}
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
          isvNeto={isvNeto}
        />
      )}
    />
  )
}
