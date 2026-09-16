import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'
import type { ItemDoc, EmpresaDoc, ClienteDoc } from './factura-pdf'

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#1B2430' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 2, borderBottomColor: '#1B2430', paddingBottom: 14, marginBottom: 14 },
  empresaRow: { flexDirection: 'row' },
  logo: { width: 70, height: 70, marginRight: 10, objectFit: 'contain' },
  empresaNombre: { fontSize: 13, fontFamily: 'Helvetica-Bold' },
  muted: { fontSize: 9, color: '#666', marginTop: 1 },
  right: { textAlign: 'right' },
  tag: { fontSize: 8, color: '#0E7C86', textTransform: 'uppercase', letterSpacing: 1 },
  numero: { fontSize: 13, fontFamily: 'Courier-Bold', marginTop: 2 },
  grid2: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  col: { width: '48%' },
  label: { fontSize: 8, color: '#999', textTransform: 'uppercase', marginBottom: 3 },
  bold: { fontFamily: 'Helvetica-Bold' },
  thRow: { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: '#1B2430', paddingBottom: 4, marginBottom: 4 },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', paddingVertical: 4 },
  th: { fontSize: 8, color: '#999', textTransform: 'uppercase' },
  colDesc: { width: '45%' },
  colCant: { width: '15%', textAlign: 'center', fontFamily: 'Courier' },
  colIsv: { width: '10%' },
  colNum: { width: '15%', textAlign: 'right', fontFamily: 'Courier' },
  totales: { alignSelf: 'flex-end', width: 200, marginTop: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  totalValor: { fontFamily: 'Courier' },
  totalFinal: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 2, borderTopColor: '#1B2430', paddingTop: 5, marginTop: 5 },
  totalFinalTexto: { fontFamily: 'Helvetica-Bold', fontSize: 12 },
  footer: { marginTop: 30, textAlign: 'center', fontSize: 9, color: '#999' },
})

function fm(v: number | null | undefined) {
  return new Intl.NumberFormat('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v ?? 0)
}

export function CotizacionDocument({
  empresa,
  cliente,
  cotizacion,
  items,
}: {
  empresa: EmpresaDoc
  cliente: ClienteDoc
  cotizacion: { numero: string; fecha: string; validez_dias: number; notas?: string | null; subtotal_gravado_15: number; subtotal_gravado_18: number; subtotal_exento: number; isv_15: number; isv_18: number; total: number }
  items: ItemDoc[]
}) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.empresaRow}>
            {empresa.logo_url && <Image src={empresa.logo_url} style={styles.logo} />}
            <View>
              <Text style={styles.empresaNombre}>{empresa.nombre}</Text>
              <Text style={styles.muted}>RTN: {empresa.rtn}</Text>
              {empresa.direccion && <Text style={styles.muted}>{empresa.direccion}</Text>}
              <Text style={styles.muted}>{[empresa.telefono, empresa.correo_electronico, empresa.sitio_web].filter(Boolean).join(' · ')}</Text>
            </View>
          </View>
          <View style={styles.right}>
            <Text style={styles.tag}>Cotización</Text>
            <Text style={styles.numero}>{cotizacion.numero}</Text>
            <Text style={styles.muted}>{cotizacion.fecha}</Text>
          </View>
        </View>

        <View style={styles.grid2}>
          <View style={styles.col}>
            <Text style={styles.label}>Cliente</Text>
            <Text style={styles.bold}>{cliente.nombre}</Text>
            {cliente.rtn && <Text style={styles.muted}>RTN: {cliente.rtn}</Text>}
            {cliente.direccion && <Text style={styles.muted}>{cliente.direccion}</Text>}
            {cliente.telefono && <Text style={styles.muted}>Tel: {cliente.telefono}</Text>}
            {cliente.email && <Text style={styles.muted}>{cliente.email}</Text>}
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Validez</Text>
            <Text style={styles.muted}>{cotizacion.validez_dias} días a partir de la fecha</Text>
            {cotizacion.notas && <Text style={[styles.muted, { marginTop: 4 }]}>{cotizacion.notas}</Text>}
          </View>
        </View>

        <View style={styles.thRow}>
          <Text style={[styles.th, styles.colDesc]}>Descripción</Text>
          <Text style={[styles.th, styles.colCant]}>Cant.</Text>
          <Text style={[styles.th, styles.colNum]}>P. Unit.</Text>
          <Text style={[styles.th, styles.colNum]}></Text>
          <Text style={[styles.th, styles.colNum]}>Subtotal</Text>
        </View>
        {items.map((it, i) => (
          <View key={i} style={styles.tr}>
            <Text style={styles.colDesc}>{it.descripcion}</Text>
            <Text style={styles.colCant}>{it.cantidad}</Text>
            <Text style={styles.colNum}>L. {fm(it.precio_unitario)}</Text>
            <Text style={styles.colIsv}></Text>
            <Text style={styles.colNum}>L. {fm(it.subtotal)}</Text>
          </View>
        ))}

        <View style={styles.totales}>
          <View style={styles.totalRow}><Text>Gravado 15%</Text><Text style={styles.totalValor}>L. {fm(cotizacion.subtotal_gravado_15)}</Text></View>
          <View style={styles.totalRow}><Text>Gravado 18%</Text><Text style={styles.totalValor}>L. {fm(cotizacion.subtotal_gravado_18)}</Text></View>
          <View style={styles.totalRow}><Text>Exento</Text><Text style={styles.totalValor}>L. {fm(cotizacion.subtotal_exento)}</Text></View>
          <View style={styles.totalRow}><Text>ISV 15%</Text><Text style={styles.totalValor}>L. {fm(cotizacion.isv_15)}</Text></View>
          <View style={styles.totalRow}><Text>ISV 18%</Text><Text style={styles.totalValor}>L. {fm(cotizacion.isv_18)}</Text></View>
          <View style={styles.totalFinal}>
            <Text style={styles.totalFinalTexto}>Total</Text>
            <Text style={[styles.totalFinalTexto, { fontFamily: 'Courier-Bold' }]}>L. {fm(cotizacion.total)}</Text>
          </View>
        </View>

        <Text style={styles.footer}>Cotización sujeta a cambios sin previo aviso.</Text>
      </Page>
    </Document>
  )
}