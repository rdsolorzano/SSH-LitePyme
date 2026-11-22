// Formulario 201 del SAR (Impuesto Sobre Ventas): qué va en cada casilla.
// Calcula igual que el SAR: el ISV se saca del TOTAL de cada casilla (base × tasa,
// redondeado a centavos), no sumando el ISV de cada factura. Así LitePyme da el mismo
// "Importe a pagar" que el formulario, sin diferencias de un centavo.

import { sumarDocumentos, TOTALES_VACIOS, type TotalesFiscales } from '@/lib/gastos'

type DocFiscal = Parameters<typeof sumarDocumentos>[0][number]
export type GastoFiscal = DocFiscal & { tipo_documento?: string | null; deducible_isr?: boolean | null }

const r2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100

// En el formulario de ISV solo entran las FACTURAS del negocio.
// Planillas, recibos, otros documentos y gastos personales no van (sí cuentan para renta si son deducibles).
export const gastoVaEnIsv = (g: GastoFiscal) => (g.tipo_documento ?? 'factura') === 'factura' && g.deducible_isr !== false

export type Formulario201 = {
  // A - Ventas
  ventas15: number
  debito15: number
  ventas18: number
  debito18: number
  ventasExentas: number
  ventasExoneradasOce: number
  totalDebito: number
  // B - Compras (inventario + gastos con factura)
  compras15: number
  credito15: number
  compras18: number
  credito18: number
  comprasExentas: number
  comprasExoneradasOce: number
  totalCreditoCompras: number
  // C - Créditos
  excedenteAnterior: number
  // D - Liquidación
  totalCredito: number
  impuestoCausado: number
  excedenteAFavor: number
  importeAPagar: number
  // Débito − crédito de compras del mes (sin excedente anterior); negativo = crédito a favor
  netoDelMes: number
}

// ventas: totales de facturas emitidas; compras: inventario + gastos que van en ISV (ya filtrados)
export function calcularFormulario201(ventas: TotalesFiscales, compras: TotalesFiscales, excedenteAnterior = 0): Formulario201 {
  const debito15 = r2(ventas.gravado15 * 0.15)
  const debito18 = r2(ventas.gravado18 * 0.18)
  const credito15 = r2(compras.gravado15 * 0.15)
  const credito18 = r2(compras.gravado18 * 0.18)
  const totalDebito = r2(debito15 + debito18)
  const totalCreditoCompras = r2(credito15 + credito18)
  const excedente = r2(Math.max(0, excedenteAnterior))
  const totalCredito = r2(totalCreditoCompras + excedente)
  const diferencia = r2(totalDebito - totalCredito)

  return {
    ventas15: r2(ventas.gravado15),
    debito15,
    ventas18: r2(ventas.gravado18),
    debito18,
    ventasExentas: r2(ventas.exento),
    ventasExoneradasOce: r2(ventas.exonerado),
    totalDebito,
    compras15: r2(compras.gravado15),
    credito15,
    compras18: r2(compras.gravado18),
    credito18,
    comprasExentas: r2(compras.exento),
    comprasExoneradasOce: r2(compras.exonerado),
    totalCreditoCompras,
    excedenteAnterior: excedente,
    totalCredito,
    impuestoCausado: Math.max(0, diferencia),
    excedenteAFavor: Math.max(0, -diferencia),
    importeAPagar: Math.max(0, diferencia),
    netoDelMes: r2(totalDebito - totalCreditoCompras),
  }
}

// Atajo: a partir de los documentos del mes
export function formularioDesdeDocumentos(
  facturas: DocFiscal[],
  compras: DocFiscal[],
  gastos: GastoFiscal[],
  excedenteAnterior = 0
) {
  const ventas = sumarDocumentos(facturas)
  const egresos = sumarDocumentos([...compras, ...gastos.filter(gastoVaEnIsv)])
  return calcularFormulario201(ventas, egresos, excedenteAnterior)
}

// Excedente que pasa de un mes al siguiente (crédito mayor que débito), en orden cronológico.
// Empieza en 0 en el primer mes de la lista: es una estimación, el dato oficial es la casilla
// "Excedente a favor del OT" de la declaración anterior.
export function excedentesEncadenados(meses: string[], porMes: Map<string, { ventas: TotalesFiscales; compras: TotalesFiscales }>) {
  const resultado = new Map<string, number>() // excedente ANTERIOR que recibe cada mes
  let arrastre = 0
  for (const m of meses) {
    resultado.set(m, arrastre)
    const d = porMes.get(m) ?? { ventas: TOTALES_VACIOS, compras: TOTALES_VACIOS }
    arrastre = calcularFormulario201(d.ventas, d.compras, arrastre).excedenteAFavor
  }
  return resultado
}

// Valor para pegar en el formulario del SAR: sin separador de miles, con 2 decimales
export const valorParaSar = (v: number) => r2(v).toFixed(2)
