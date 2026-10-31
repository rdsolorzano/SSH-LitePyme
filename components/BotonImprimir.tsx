'use client'

import { estiloBotonSecundario } from '@/lib/estilos'

export default function BotonImprimir() {
  return (
    <button onClick={() => window.print()} className={estiloBotonSecundario}>
      Imprimir / Guardar PDF
    </button>
  )
}
