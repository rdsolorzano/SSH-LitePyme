const UNIDADES = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE']
const ESPECIALES_10_19 = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE']
const ESPECIALES_20_29 = ['VEINTE', 'VEINTIUNO', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE']
const DECENAS = ['', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA']
const CENTENAS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS']

function convertirDecenas(n: number): string {
  if (n < 10) return UNIDADES[n]
  if (n < 20) return ESPECIALES_10_19[n - 10]
  if (n < 30) return ESPECIALES_20_29[n - 20]
  const d = Math.floor(n / 10)
  const u = n % 10
  if (u === 0) return DECENAS[d]
  return `${DECENAS[d]} Y ${UNIDADES[u]}`
}

function convertirCentenas(n: number): string {
  if (n === 0) return ''
  if (n === 100) return 'CIEN'
  const c = Math.floor(n / 100)
  const resto = n % 100
  const partes: string[] = []
  if (c > 0) partes.push(CENTENAS[c])
  if (resto > 0) partes.push(convertirDecenas(resto))
  return partes.join(' ')
}

function ajustarUno(texto: string): string {
  return texto.replace(/UNO$/, 'UN')
}

export function numeroALetras(valor: number | null | undefined): string {
  const absoluto = Math.abs(valor ?? 0)
  const entero = Math.floor(absoluto)
  const centavos = Math.round((absoluto - entero) * 100)

  let texto: string

  if (entero === 0) {
    texto = 'CERO'
  } else {
    const millones = Math.floor(entero / 1000000)
    const miles = Math.floor((entero % 1000000) / 1000)
    const resto = entero % 1000

    const partes: string[] = []
    if (millones > 0) {
      partes.push(millones === 1 ? 'UN MILLÓN' : ajustarUno(`${convertirCentenas(millones)} MILLONES`))
    }
    if (miles > 0) {
      partes.push(miles === 1 ? 'MIL' : `${ajustarUno(convertirCentenas(miles))} MIL`)
    }
    if (resto > 0) {
      partes.push(convertirCentenas(resto))
    }
    texto = partes.join(' ')
  }

  const centavosTexto = String(centavos).padStart(2, '0')
  return `${texto} LEMPIRAS CON ${centavosTexto}/100`
}