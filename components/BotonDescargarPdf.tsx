'use client'

import { useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import { estiloBoton } from '@/lib/estilos'

// Botón genérico: genera el PDF en el navegador y lo descarga.
// "generar" devuelve el documento (<FacturaDocument ... />, <ReciboDocument ... />, etc.)
export default function BotonDescargarPdf({
  generar,
  nombreArchivo,
  texto = 'Descargar PDF',
}: {
  generar: () => Parameters<typeof pdf>[0]
  nombreArchivo: string
  texto?: string
}) {
  const [generando, setGenerando] = useState(false)

  async function descargar() {
    setGenerando(true)
    try {
      const blob = await pdf(generar()).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = nombreArchivo
      link.click()
      URL.revokeObjectURL(url)
    } finally {
      setGenerando(false)
    }
  }

  return (
    <button onClick={descargar} disabled={generando} className={estiloBoton}>
      {generando ? 'Generando PDF...' : texto}
    </button>
  )
}
