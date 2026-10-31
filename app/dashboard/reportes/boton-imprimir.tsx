'use client'

import { estiloBoton } from '@/lib/estilos'
export default function BotonImprimir() {
  return (
    <button onClick={() => window.print()} className={estiloBoton}>
      Imprimir / Guardar PDF
    </button>
  )
}