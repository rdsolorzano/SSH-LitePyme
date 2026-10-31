import { MARCA } from '@/lib/marca'

export default function Logo({
  tamano = 32,
  mostrarNombre = true,
  claseTexto = 'font-semibold text-[#1B2430]',
}: {
  tamano?: number
  mostrarNombre?: boolean
  claseTexto?: string
}) {
  return (
    <span className="inline-flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/icon-192.png"
        alt={MARCA.nombreCompleto}
        width={tamano}
        height={tamano}
        className="shrink-0 rounded"
      />
      {mostrarNombre && <span className={claseTexto}>{MARCA.nombreCompleto}</span>}
    </span>
  )
}
