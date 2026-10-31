'use client'

import type { DatosExoneracion } from '@/lib/exoneracion'

export default function BloqueExoneracion({
  datos,
  onChange,
}: {
  datos: DatosExoneracion
  onChange: (d: DatosExoneracion) => void
}) {
  return (
    <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3">
      <p className="mb-2 text-sm font-medium text-amber-800">
        Cliente exonerado: el documento se emite sin ISV (Importe Exonerado)
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs text-gray-600">No. Constancia Exonerado *</label>
          <input
            value={datos.noConstancia}
            onChange={(e) => onChange({ ...datos, noConstancia: e.target.value })}
            className="w-full rounded border bg-white px-2 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-600">No. Registro S.A.G. (si aplica)</label>
          <input
            value={datos.noRegistroSag}
            onChange={(e) => onChange({ ...datos, noRegistroSag: e.target.value })}
            className="w-full rounded border bg-white px-2 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-600">No. Orden de Compra Exenta *</label>
          <input
            value={datos.noOrdenCompra}
            onChange={(e) => onChange({ ...datos, noOrdenCompra: e.target.value })}
            className="w-full rounded border bg-white px-2 py-2 text-sm"
          />
        </div>
      </div>
    </div>
  )
}