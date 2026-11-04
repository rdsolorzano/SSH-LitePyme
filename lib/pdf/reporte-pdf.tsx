import { Document, Font, Page, Text, View, StyleSheet, type Styles } from '@react-pdf/renderer'

type Style = Styles[string]

// Sin cortar palabras con guion (ej. "Pro-greso"); solo parte textos muy largos sin espacios
Font.registerHyphenationCallback((palabra) => (palabra.length <= 20 ? [palabra] : palabra.match(/.{1,14}/g) ?? [palabra]))
import { formatearFecha, formatearMoneda as fm } from '@/lib/formato'
import { etiquetaCategoria, resumirPorCategoria, sumarDocumentos, sumarTotales, type Gasto, type TotalesFiscales } from '@/lib/gastos'
import { COLORES_PDF } from './comunes'

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 8, fontFamily: 'Helvetica', color: COLORES_PDF.marca },
  titulo: { fontSize: 14, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  subtitulo: { fontSize: 9, color: '#666', marginBottom: 14 },
  seccionTitulo: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginTop: 16, marginBottom: 6, color: COLORES_PDF.marca },
  nota: { fontSize: 7, color: '#888', marginTop: 3 },
  thRow: { flexDirection: 'row', borderBottomWidth: 1.5, borderBottomColor: COLORES_PDF.marca, paddingBottom: 3, marginBottom: 2 },
  tr: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#ddd', paddingVertical: 2 },
  trTotal: { flexDirection: 'row', borderTopWidth: 1.5, borderTopColor: COLORES_PDF.marca, paddingTop: 3, marginTop: 2 },
  th: { fontSize: 7, color: '#888', textTransform: 'uppercase' },
  tdBold: { fontFamily: 'Helvetica-Bold' },
  // Libros de ventas y compras: 37% texto + 7 columnas de 9%
  colFecha: { width: '9%' },
  colDoc: { width: '12%', fontFamily: 'Courier', fontSize: 6.5 },
  colNombre: { width: '16%' },
  colNum: { width: '9%', textAlign: 'right', fontFamily: 'Courier' },
  // Libro de gastos: 44% texto + 7 columnas de 8%
  gFecha: { width: '7%' },
  gDoc: { width: '12%', fontFamily: 'Courier', fontSize: 6.5 },
  gProv: { width: '13%' },
  gCat: { width: '12%' },
  gNum: { width: '8%', textAlign: 'right', fontFamily: 'Courier' },
  // Resumen ISV
  rNombre: { width: '23%' },
  rNum: { width: '11%', textAlign: 'right', fontFamily: 'Courier' },
  kpis: { flexDirection: 'row', marginBottom: 10 },
  kpiBox: { flex: 1, marginRight: 8, borderWidth: 0.5, borderColor: '#ddd', borderRadius: 4, padding: 8 },
  kpiLabel: { fontSize: 7, color: '#999', textTransform: 'uppercase' },
  kpiValor: { fontSize: 12, fontFamily: 'Courier-Bold', marginTop: 2 },
  kpiNota: { fontSize: 6.5, color: '#888', marginTop: 2 },
})

type FilaVenta = { numero_correlativo: string; fecha: string; cliente: string; subtotal_gravado_15: number; subtotal_gravado_18: number; subtotal_exento: number; subtotal_exonerado?: number | null; isv_15: number; isv_18: number; total: number }
type FilaCompra = { numero_factura_proveedor: string | null; fecha: string; proveedor: string; subtotal_gravado_15: number; subtotal_gravado_18: number; subtotal_exento: number; isv_15: number; isv_18: number; total: number }

// Las 7 columnas numéricas en el mismo orden en todas las tablas
function Numeros({ t, estilo, negrita }: { t: TotalesFiscales; estilo: Style; negrita?: boolean }) {
  const s = negrita ? [estilo, styles.tdBold] : [estilo]
  return (
    <>
      <Text style={s}>{fm(t.gravado15)}</Text>
      <Text style={s}>{fm(t.gravado18)}</Text>
      <Text style={s}>{fm(t.exento)}</Text>
      <Text style={s}>{fm(t.exonerado)}</Text>
      <Text style={s}>{fm(t.isv15)}</Text>
      <Text style={s}>{fm(t.isv18)}</Text>
      <Text style={s}>{fm(t.total)}</Text>
    </>
  )
}

function EncabezadoNumeros({ estilo }: { estilo: Style }) {
  return (
    <>
      {['Grav. 15%', 'Grav. 18%', 'Exento', 'Exonerado', 'ISV 15%', 'ISV 18%', 'Total'].map((t) => (
        <Text key={t} style={[styles.th, estilo]}>{t}</Text>
      ))}
    </>
  )
}

const fila = (d: Parameters<typeof sumarDocumentos>[0][number]) => sumarDocumentos([d])

export function ReportePdf({
  empresaNombre,
  desde,
  hasta,
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
  ventas: FilaVenta[]
  totalesVentas: TotalesFiscales
  compras: FilaCompra[]
  totalesCompras: TotalesFiscales
  gastos: Gasto[]
  isvNeto: number
}) {
  const totalesGastos = sumarDocumentos(gastos)
  const totalesComprasYGastos = sumarTotales(totalesCompras, totalesGastos)
  const porCategoria = resumirPorCategoria(gastos)

  const isvVentas = totalesVentas.isv15 + totalesVentas.isv18
  const isvCompras = totalesComprasYGastos.isv15 + totalesComprasYGastos.isv18
  const ventaNeta = totalesVentas.total - isvVentas
  const compraNeta = totalesComprasYGastos.total - isvCompras

  return (
    <Document>
      <Page size="LETTER" orientation="landscape" style={styles.page}>
        <Text style={styles.titulo}>{empresaNombre}</Text>
        <Text style={styles.subtitulo}>Reporte de ventas, compras y gastos — Período: {formatearFecha(desde)} al {formatearFecha(hasta)}</Text>

        {/* Fila 1: ventas · Fila 2: compras y gastos · Fila 3: ISV neto */}
        <View style={styles.kpis}>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Total facturado (con ISV)</Text>
            <Text style={styles.kpiValor}>L. {fm(totalesVentas.total)}</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>ISV recaudado (ventas)</Text>
            <Text style={styles.kpiValor}>L. {fm(isvVentas)}</Text>
          </View>
          <View style={[styles.kpiBox, { borderColor: COLORES_PDF.acento, borderWidth: 1 }]}>
            <Text style={[styles.kpiLabel, { color: COLORES_PDF.acento }]}>Venta neta sin ISV (a declarar)</Text>
            <Text style={styles.kpiValor}>L. {fm(ventaNeta)}</Text>
          </View>
        </View>
        <View style={styles.kpis}>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Total compras y gastos (con ISV)</Text>
            <Text style={styles.kpiValor}>L. {fm(totalesComprasYGastos.total)}</Text>
            <Text style={styles.kpiNota}>Inventario L. {fm(totalesCompras.total)} · Gastos L. {fm(totalesGastos.total)}</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>ISV pagado (crédito fiscal)</Text>
            <Text style={styles.kpiValor}>L. {fm(isvCompras)}</Text>
          </View>
          <View style={[styles.kpiBox, { borderColor: COLORES_PDF.acento, borderWidth: 1 }]}>
            <Text style={[styles.kpiLabel, { color: COLORES_PDF.acento }]}>Compra neta sin ISV (a declarar)</Text>
            <Text style={styles.kpiValor}>L. {fm(compraNeta)}</Text>
          </View>
        </View>
        <View style={styles.kpis}>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>ISV neto a pagar (ventas - compras y gastos)</Text>
            <Text style={[styles.kpiValor, { color: isvNeto >= 0 ? COLORES_PDF.rojo : COLORES_PDF.verde }]}>L. {fm(isvNeto)}</Text>
          </View>
          <View style={[styles.kpiBox, { borderWidth: 0 }]} />
          <View style={[styles.kpiBox, { borderWidth: 0 }]} />
        </View>

        <View wrap={false} minPresenceAhead={30}>
          <Text style={styles.seccionTitulo}>Resumen para la declaración mensual de ISV</Text>
          <View style={styles.thRow}>
            <Text style={[styles.th, styles.rNombre]}></Text>
            <EncabezadoNumeros estilo={styles.rNum} />
          </View>
        </View>
        <View style={styles.tr}>
          <Text style={[styles.rNombre, styles.tdBold]}>Ventas</Text>
          <Numeros t={totalesVentas} estilo={styles.rNum} negrita />
        </View>
        <View style={styles.tr}>
          <Text style={styles.rNombre}>Compras de inventario</Text>
          <Numeros t={totalesCompras} estilo={styles.rNum} />
        </View>
        <View style={styles.tr}>
          <Text style={styles.rNombre}>Gastos</Text>
          <Numeros t={totalesGastos} estilo={styles.rNum} />
        </View>
        <View style={styles.trTotal}>
          <Text style={[styles.rNombre, styles.tdBold]}>Total compras y gastos</Text>
          <Numeros t={totalesComprasYGastos} estilo={styles.rNum} negrita />
        </View>

        <View wrap={false} minPresenceAhead={30}>
          <Text style={styles.seccionTitulo}>Libro de ventas</Text>
          <View style={styles.thRow}>
            <Text style={[styles.th, styles.colFecha]}>Fecha</Text>
            <Text style={[styles.th, styles.colDoc]}>Factura</Text>
            <Text style={[styles.th, styles.colNombre]}>Cliente</Text>
            <EncabezadoNumeros estilo={styles.colNum} />
          </View>
        </View>
        {ventas.map((v, i) => (
          <View key={i} style={styles.tr} wrap={false}>
            <Text style={styles.colFecha}>{formatearFecha(v.fecha)}</Text>
            <Text style={styles.colDoc}>{v.numero_correlativo}</Text>
            <Text style={styles.colNombre}>{v.cliente}</Text>
            <Numeros t={fila(v)} estilo={styles.colNum} />
          </View>
        ))}
        <View style={styles.trTotal}>
          <Text style={[styles.colFecha, styles.tdBold]}>Totales</Text>
          <Text style={styles.colDoc}></Text>
          <Text style={styles.colNombre}></Text>
          <Numeros t={totalesVentas} estilo={styles.colNum} negrita />
        </View>

        <View wrap={false} minPresenceAhead={30}>
          <Text style={styles.seccionTitulo}>Libro de compras de inventario</Text>
          <View style={styles.thRow}>
            <Text style={[styles.th, styles.colFecha]}>Fecha</Text>
            <Text style={[styles.th, styles.colDoc]}>Fact. Prov.</Text>
            <Text style={[styles.th, styles.colNombre]}>Proveedor</Text>
            <EncabezadoNumeros estilo={styles.colNum} />
          </View>
        </View>
        {compras.map((c, i) => (
          <View key={i} style={styles.tr} wrap={false}>
            <Text style={styles.colFecha}>{formatearFecha(c.fecha)}</Text>
            <Text style={styles.colDoc}>{c.numero_factura_proveedor || '—'}</Text>
            <Text style={styles.colNombre}>{c.proveedor}</Text>
            <Numeros t={fila(c)} estilo={styles.colNum} />
          </View>
        ))}
        <View style={styles.trTotal}>
          <Text style={[styles.colFecha, styles.tdBold]}>Totales</Text>
          <Text style={styles.colDoc}></Text>
          <Text style={styles.colNombre}></Text>
          <Numeros t={totalesCompras} estilo={styles.colNum} negrita />
        </View>

        <View wrap={false} minPresenceAhead={30}>
          <Text style={styles.seccionTitulo}>Libro de gastos</Text>
          <View style={styles.thRow}>
            <Text style={[styles.th, styles.gFecha]}>Fecha</Text>
            <Text style={[styles.th, styles.gDoc]}>Documento</Text>
            <Text style={[styles.th, styles.gProv]}>Proveedor</Text>
            <Text style={[styles.th, styles.gCat]}>Categoría</Text>
            <EncabezadoNumeros estilo={styles.gNum} />
          </View>
        </View>
        {gastos.map((g, i) => (
          <View key={i} style={styles.tr} wrap={false}>
            <Text style={styles.gFecha}>{formatearFecha(g.fecha)}</Text>
            <Text style={styles.gDoc}>{g.numero_documento || '—'}</Text>
            <Text style={styles.gProv}>{g.nombre_proveedor}{g.rtn_proveedor ? `\nRTN ${g.rtn_proveedor}` : ''}</Text>
            <Text style={styles.gCat}>{etiquetaCategoria(g.categoria)}{g.deducible_isr ? '' : ' (personal)'}</Text>
            <Numeros t={fila(g)} estilo={styles.gNum} />
          </View>
        ))}
        <View style={styles.trTotal}>
          <Text style={[styles.gFecha, styles.tdBold]}>Totales</Text>
          <Text style={styles.gDoc}></Text>
          <Text style={styles.gProv}></Text>
          <Text style={styles.gCat}></Text>
          <Numeros t={totalesGastos} estilo={styles.gNum} negrita />
        </View>

        <View wrap={false}>
          <Text style={styles.seccionTitulo}>Gastos deducibles por categoría (para la declaración de renta)</Text>
          <View style={styles.thRow}>
            <Text style={[styles.th, { width: '40%' }]}>Categoría</Text>
            <Text style={[styles.th, { width: '15%', textAlign: 'right' }]}>Documentos</Text>
            <Text style={[styles.th, { width: '15%', textAlign: 'right' }]}>Sin factura</Text>
            <Text style={[styles.th, { width: '30%', textAlign: 'right' }]}>Total sin ISV</Text>
          </View>
          {porCategoria.map((c) => (
            <View key={c.categoria} style={styles.tr}>
              <Text style={{ width: '40%' }}>{c.etiqueta}</Text>
              <Text style={{ width: '15%', textAlign: 'right', fontFamily: 'Courier' }}>{c.cantidad}</Text>
              <Text style={{ width: '15%', textAlign: 'right', fontFamily: 'Courier' }}>{c.sinFactura}</Text>
              <Text style={{ width: '30%', textAlign: 'right', fontFamily: 'Courier' }}>L. {fm(c.totalSinIsv)}</Text>
            </View>
          ))}
          <View style={styles.trTotal}>
            <Text style={[{ width: '40%' }, styles.tdBold]}>Total gastos deducibles</Text>
            <Text style={[{ width: '15%', textAlign: 'right', fontFamily: 'Courier' }, styles.tdBold]}>{porCategoria.reduce((s, c) => s + c.cantidad, 0)}</Text>
            <Text style={[{ width: '15%', textAlign: 'right', fontFamily: 'Courier' }, styles.tdBold]}>{porCategoria.reduce((s, c) => s + c.sinFactura, 0)}</Text>
            <Text style={[{ width: '30%', textAlign: 'right', fontFamily: 'Courier' }, styles.tdBold]}>L. {fm(porCategoria.reduce((s, c) => s + c.totalSinIsv, 0))}</Text>
          </View>
          <Text style={styles.nota}>Montos sin ISV. Excluye gastos marcados como personales. &quot;Sin factura&quot; = recibos, planillas u otros documentos.</Text>
        </View>
      </Page>
    </Document>
  )
}
