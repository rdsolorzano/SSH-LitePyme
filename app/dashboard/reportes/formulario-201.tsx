import { formatearMoneda } from '@/lib/formato'
import { valorParaSar, type Formulario201 } from '@/lib/formulario-isv'
import BotonCopiar from './boton-copiar'

type Casilla = { etiqueta: string; valor: number; nota?: string; total?: boolean }

// Fila igual a la del formulario del SAR: nombre de la casilla, monto y botón para copiar
function Fila({ etiqueta, valor, nota, total }: Casilla) {
  const conValor = Math.abs(valor) >= 0.005
  return (
    <div
      className={`flex items-center justify-between gap-3 border-t border-gray-100 px-4 py-2 ${
        total ? 'bg-gray-50 font-semibold text-marca' : conValor ? 'text-marca' : 'text-gray-400'
      }`}
    >
      <div className="min-w-0">
        <p className={`text-sm ${conValor && !total ? 'font-medium' : ''}`}>{etiqueta}</p>
        {nota && <p className="text-xs font-normal text-gray-500">{nota}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className={`font-mono text-sm ${conValor ? '' : 'text-gray-300'}`}>L {formatearMoneda(valor)}</span>
        <BotonCopiar valor={valorParaSar(valor)} />
      </div>
    </div>
  )
}

function Seccion({ titulo, casillas, ceros }: { titulo: string; casillas: Casilla[]; ceros?: string[] }) {
  return (
    <div className="border-t-2 border-marca">
      <p className="bg-marca/5 px-4 py-2 text-sm font-bold text-marca">{titulo}</p>
      {casillas.map((c) => (
        <Fila key={c.etiqueta} {...c} />
      ))}
      {ceros && ceros.length > 0 && (
        <details className="border-t border-gray-100 px-4 py-2 text-xs text-gray-500">
          <summary className="cursor-pointer">Otras casillas de esta sección: déjalas en L 0.00 ({ceros.length})</summary>
          <p className="mt-1">LitePyme no registra estas operaciones; si tuviste alguna, consúltalo con tu contador.</p>
          <ul className="mt-1 list-disc pl-5">
            {ceros.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

// Guía del formulario 201 (Impuesto Sobre Ventas) del SAR con los datos del mes
export default function Formulario201Guia({
  f,
  excedenteEstimado,
  excluidos,
}: {
  f: Formulario201
  excedenteEstimado: boolean
  excluidos: { cantidad: number; total: number }
}) {
  return (
    <section className="mb-8 overflow-hidden rounded-lg bg-white shadow-sm">
      <div className="px-4 py-3">
        <h2 className="font-semibold text-marca">Formulario 201 · Impuesto Sobre Ventas: qué escribir en cada casilla</h2>
        <p className="mt-1 text-xs text-gray-500">
          Mismo orden que la declaración del SAR. Los montos van <strong>sin ISV</strong> en las casillas de ventas y compras; el
          débito y el crédito el SAR los calcula sobre esos totales (igual que aquí). Las casillas en gris quedan en L 0.00.
        </p>
      </div>

      <Seccion
        titulo="A - Determinación del impuesto. Ventas"
        casillas={[
          { etiqueta: 'Ventas en el mercado interno 15%', valor: f.ventas15 },
          { etiqueta: 'Débito por ventas en el mercado interno (Gravadas al 15%)', valor: f.debito15 },
          { etiqueta: 'Ventas en el mercado interno 18%', valor: f.ventas18 },
          { etiqueta: 'Débito por ventas en el mercado interno (Gravadas al 18%)', valor: f.debito18 },
          { etiqueta: 'Ventas exentas en el mercado interno', valor: f.ventasExentas },
          {
            etiqueta: 'Ventas Exoneradas OCE',
            valor: f.ventasExoneradasOce,
            nota: 'Facturas a clientes exonerados con No. de Orden de Compra Exenta.',
          },
          { etiqueta: 'Total Débito del Período', valor: f.totalDebito, total: true },
        ]}
        ceros={[
          'Ventas exoneradas Persona natural (Decreto 119/2016)',
          'Transferencia de Bienes / Servicios FYDUCA (15% y 18%)',
          'Exportaciones (Fuera región y Región Centroamericana)',
        ]}
      />

      <Seccion
        titulo="B - Determinación del impuesto. Compras"
        casillas={[
          {
            etiqueta: 'Compras netas en el mercado interno (Gravadas al 15%)',
            valor: f.compras15,
            nota: 'Compras de inventario + gastos con factura que traen ISV 15% (monto sin ISV).',
          },
          { etiqueta: 'Crédito por compras en el mercado interno (Gravadas al 15%)', valor: f.credito15 },
          { etiqueta: 'Compras netas en el mercado interno (Gravadas al 18%)', valor: f.compras18 },
          { etiqueta: 'Crédito por compras en el mercado interno (Gravadas al 18%)', valor: f.credito18 },
          {
            etiqueta: 'Compras exentas en el mercado interno',
            valor: f.comprasExentas,
            nota: 'Facturas sin ISV, como el combustible. No dan crédito, pero se declaran.',
          },
          { etiqueta: 'Compras exoneradas con OCE en el mercado interno', valor: f.comprasExoneradasOce },
          { etiqueta: 'Total créditos declarados en las compras', valor: f.totalCreditoCompras, total: true },
        ]}
        ceros={[
          'Compras gravadas no utilizadas en plazo (15% y 18%) y sus créditos',
          'Adquisiciones FYDUCA (gravadas, exentas, exoneradas) y sus créditos',
          'Importaciones (15%, 18%, exentas, exoneradas) y sus créditos',
        ]}
      />

      <Seccion
        titulo="C - Créditos"
        casillas={[
          {
            etiqueta: 'Excedente del período anterior',
            valor: f.excedenteAnterior,
            nota: excedenteEstimado
              ? 'Estimado por LitePyme. El dato oficial es la casilla "Excedente a favor del OT" de tu declaración del mes anterior.'
              : 'Crédito a favor que quedó del mes anterior (casilla "Excedente a favor del OT").',
          },
        ]}
        ceros={[
          'Pagos realizados para el período',
          'Importe a compensar',
          'Cesiones de crédito',
          'Impuesto retenido por ventas al Estado',
          'Impuesto retenido por acuerdo 215-2010 (Art. 8 Ley ISV)',
          'Impuesto retenido por ventas con tarjetas de crédito o débito',
        ]}
      />

      <Seccion
        titulo="D - Detalle de la liquidación"
        casillas={[
          { etiqueta: 'Total débito del período', valor: f.totalDebito },
          { etiqueta: 'Total crédito del período', valor: f.totalCredito },
          { etiqueta: 'Impuesto causado', valor: f.impuestoCausado },
          { etiqueta: 'Excedente a favor del OT', valor: f.excedenteAFavor, nota: 'Si hay monto, pasa como crédito al próximo mes.' },
          { etiqueta: 'Importe a pagar', valor: f.importeAPagar, total: true },
        ]}
      />

      <div className="space-y-1 border-t-2 border-marca px-4 py-3 text-xs text-gray-500">
        <p>
          <strong className="text-marca">Comprobación:</strong> el &quot;Importe a pagar&quot; que te muestre el SAR debe ser{' '}
          <span className="font-mono font-semibold text-marca">L {formatearMoneda(f.importeAPagar)}</span>. Si no coincide, revisa que
          todas las facturas del mes estén registradas en LitePyme.
        </p>
        {excluidos.cantidad > 0 && (
          <p>
            No se incluyen {excluidos.cantidad} {excluidos.cantidad === 1 ? 'gasto' : 'gastos'} por L {formatearMoneda(excluidos.total)}{' '}
            (planillas, recibos, otros documentos o gastos personales): en el ISV solo cuentan las facturas del negocio. Los
            deducibles sí cuentan para la declaración de renta.
          </p>
        )}
      </div>
    </section>
  )
}
