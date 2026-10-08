import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 8, fontFamily: 'Helvetica', color: '#1B2430' },
  titulo: { fontSize: 14, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  subtitulo: { fontSize: 9, color: '#666', marginBottom: 14 },
  seccionTitulo: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginTop: 16, marginBottom: 6, color: '#1B2430' },
  thRow: { flexDirection: 'row', borderBottomWidth: 1.5, borderBottomColor: '#1B2430', paddingBottom: 3, marginBottom: 2 },
  tr: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#ddd', paddingVertical: 2 },
  trTotal: { flexDirection: 'row', borderTopWidth: 1.5, borderTopColor: '#1B2430', paddingTop: 3, marginTop: 2 },
  th: { fontSize: 7, color: '#888', textTransform: 'uppercase' },
  tdBold: { fontFamily: 'Helvetica-Bold' },
  colFecha: { width: '9%' },
  colDoc: { width: '12%', fontFamily: 'Courier' },
  colNombre: { width: '19%' },
  colNum: { width: '10%', textAlign: 'right', fontFamily: 'Courier' },
  kpis: { flexDirection: 'row', marginBottom: 10 },
  kpiBox: { flex: 1, marginRight: 8, borderWidth: 0.5, borderColor: '#ddd', borderRadius: 4, padding: 8 },
  kpiLabel: { fontSize: 7, color: '#999', textTransform: 'uppercase' },
  kpiValor: { fontSize: 12, fontFamily: 'Courier-Bold', marginTop: 2 },
})

function fm(v: number | null | undefined) {
  return new Intl.NumberFormat('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v ?? 0)
}

type Totales = { gravado15: number; gravado18: number; exento: number; isv15: number; isv18: number; total: number }
type FilaVenta = { numero_correlativo: string; fecha: string; cliente: string; subtotal_gravado_15: number; subtotal_gravado_18: number; subtotal_exento: number; isv_15: number; isv_18: number; total: number }
type FilaCompra = { numero_factura_proveedor: string | null; fecha: string; proveedor: string; subtotal_gravado_15: number; subtotal_gravado_18: number; subtotal_exento: number; isv_15: number; isv_18: number; total: number }

export function ReportePdf({
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
  ventas: FilaVenta[]
  totalesVentas: Totales
  compras: FilaCompra[]
  totalesCompras: Totales
  isvNeto: number
}) {
  return (
    <Document>
      <Page size="LETTER" orientation="landscape" style={styles.page}>
        <Text style={styles.titulo}>{empresaNombre}</Text>
        <Text style={styles.subtitulo}>Reporte de ventas y compras — Período: {desde} al {hasta}</Text>

        <View style={styles.kpis}>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Total facturado</Text>
            <Text style={styles.kpiValor}>L. {fm(totalesVentas.total)}</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>ISV recaudado (ventas)</Text>
            <Text style={styles.kpiValor}>L. {fm(totalesVentas.isv15 + totalesVentas.isv18)}</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>ISV pagado (compras)</Text>
            <Text style={styles.kpiValor}>L. {fm(totalesCompras.isv15 + totalesCompras.isv18)}</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>ISV neto a pagar</Text>
            <Text style={[styles.kpiValor, { color: isvNeto >= 0 ? '#C0392B' : '#2F9E44' }]}>L. {fm(isvNeto)}</Text>
          </View>
        </View>

        <Text style={styles.seccionTitulo}>Libro de ventas</Text>
        <View style={styles.thRow}>
          <Text style={[styles.th, styles.colFecha]}>Fecha</Text>
          <Text style={[styles.th, styles.colDoc]}>Factura</Text>
          <Text style={[styles.th, styles.colNombre]}>Cliente</Text>
          <Text style={[styles.th, styles.colNum]}>Grav. 15%</Text>
          <Text style={[styles.th, styles.colNum]}>Grav. 18%</Text>
          <Text style={[styles.th, styles.colNum]}>Exento</Text>
          <Text style={[styles.th, styles.colNum]}>ISV 15%</Text>
          <Text style={[styles.th, styles.colNum]}>ISV 18%</Text>
          <Text style={[styles.th, styles.colNum]}>Total</Text>
        </View>
        {ventas.map((v, i) => (
          <View key={i} style={styles.tr}>
            <Text style={styles.colFecha}>{v.fecha}</Text>
            <Text style={styles.colDoc}>{v.numero_correlativo}</Text>
            <Text style={styles.colNombre}>{v.cliente}</Text>
            <Text style={styles.colNum}>{fm(v.subtotal_gravado_15)}</Text>
            <Text style={styles.colNum}>{fm(v.subtotal_gravado_18)}</Text>
            <Text style={styles.colNum}>{fm(v.subtotal_exento)}</Text>
            <Text style={styles.colNum}>{fm(v.isv_15)}</Text>
            <Text style={styles.colNum}>{fm(v.isv_18)}</Text>
            <Text style={styles.colNum}>{fm(v.total)}</Text>
          </View>
        ))}
        <View style={styles.trTotal}>
          <Text style={[styles.colFecha, styles.tdBold]}>Totales</Text>
          <Text style={styles.colDoc}></Text>
          <Text style={styles.colNombre}></Text>
          <Text style={[styles.colNum, styles.tdBold]}>{fm(totalesVentas.gravado15)}</Text>
          <Text style={[styles.colNum, styles.tdBold]}>{fm(totalesVentas.gravado18)}</Text>
          <Text style={[styles.colNum, styles.tdBold]}>{fm(totalesVentas.exento)}</Text>
          <Text style={[styles.colNum, styles.tdBold]}>{fm(totalesVentas.isv15)}</Text>
          <Text style={[styles.colNum, styles.tdBold]}>{fm(totalesVentas.isv18)}</Text>
          <Text style={[styles.colNum, styles.tdBold]}>{fm(totalesVentas.total)}</Text>
        </View>

        <Text style={styles.seccionTitulo}>Libro de compras</Text>
        <View style={styles.thRow}>
          <Text style={[styles.th, styles.colFecha]}>Fecha</Text>
          <Text style={[styles.th, styles.colDoc]}>Fact. Prov.</Text>
          <Text style={[styles.th, styles.colNombre]}>Proveedor</Text>
          <Text style={[styles.th, styles.colNum]}>Grav. 15%</Text>
          <Text style={[styles.th, styles.colNum]}>Grav. 18%</Text>
          <Text style={[styles.th, styles.colNum]}>Exento</Text>
          <Text style={[styles.th, styles.colNum]}>ISV 15%</Text>
          <Text style={[styles.th, styles.colNum]}>ISV 18%</Text>
          <Text style={[styles.th, styles.colNum]}>Total</Text>
        </View>
        {compras.map((c, i) => (
          <View key={i} style={styles.tr}>
            <Text style={styles.colFecha}>{c.fecha}</Text>
            <Text style={styles.colDoc}>{c.numero_factura_proveedor || '—'}</Text>
            <Text style={styles.colNombre}>{c.proveedor}</Text>
            <Text style={styles.colNum}>{fm(c.subtotal_gravado_15)}</Text>
            <Text style={styles.colNum}>{fm(c.subtotal_gravado_18)}</Text>
            <Text style={styles.colNum}>{fm(c.subtotal_exento)}</Text>
            <Text style={styles.colNum}>{fm(c.isv_15)}</Text>
            <Text style={styles.colNum}>{fm(c.isv_18)}</Text>
            <Text style={styles.colNum}>{fm(c.total)}</Text>
          </View>
        ))}
        <View style={styles.trTotal}>
          <Text style={[styles.colFecha, styles.tdBold]}>Totales</Text>
          <Text style={styles.colDoc}></Text>
          <Text style={styles.colNombre}></Text>
          <Text style={[styles.colNum, styles.tdBold]}>{fm(totalesCompras.gravado15)}</Text>
          <Text style={[styles.colNum, styles.tdBold]}>{fm(totalesCompras.gravado18)}</Text>
          <Text style={[styles.colNum, styles.tdBold]}>{fm(totalesCompras.exento)}</Text>
          <Text style={[styles.colNum, styles.tdBold]}>{fm(totalesCompras.isv15)}</Text>
          <Text style={[styles.colNum, styles.tdBold]}>{fm(totalesCompras.isv18)}</Text>
          <Text style={[styles.colNum, styles.tdBold]}>{fm(totalesCompras.total)}</Text>
        </View>
      </Page>
    </Document>
  )
}
