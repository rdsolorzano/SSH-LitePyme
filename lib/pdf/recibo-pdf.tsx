import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'
import type { EmpresaDoc, ClienteDoc } from './factura-pdf'

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#1B2430' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 2, borderBottomColor: '#1B2430', paddingBottom: 14, marginBottom: 14 },
  empresaRow: { flexDirection: 'row' },
  logo: { width: 48, height: 48, marginRight: 10, objectFit: 'contain' },
  empresaNombre: { fontSize: 13, fontFamily: 'Helvetica-Bold' },
  muted: { fontSize: 9, color: '#666', marginTop: 1 },
  right: { textAlign: 'right' },
  tag: { fontSize: 8, color: '#0E7C86', textTransform: 'uppercase', letterSpacing: 1 },
  numero: { fontSize: 13, fontFamily: 'Courier-Bold', marginTop: 2 },
  label: { fontSize: 8, color: '#999', textTransform: 'uppercase', marginBottom: 3 },
  bold: { fontFamily: 'Helvetica-Bold' },
  thRow: { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: '#1B2430', paddingBottom: 4, marginBottom: 4, marginTop: 14 },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', paddingVertical: 4 },
  th: { fontSize: 8, color: '#999', textTransform: 'uppercase' },
  colDesc: { width: '55%' },
  colNum: { width: '15%', textAlign: 'right', fontFamily: 'Courier' },
  totalFinal: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 2, borderTopColor: '#1B2430', paddingTop: 6, marginTop: 10, alignSelf: 'flex-end', width: 200 },
  totalFinalTexto: { fontFamily: 'Helvetica-Bold', fontSize: 12 },
  footer: { marginTop: 30, textAlign: 'center', fontSize: 9, color: '#999' },
})

function fm(v: number | null | undefined) {
  return new Intl.NumberFormat('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v ?? 0)
}

export function ReciboDocument({
  empresa,
  cliente,
  recibo,
  items,
}: {
  empresa: EmpresaDoc
  cliente: ClienteDoc
  recibo: { numero: string; fecha: string; total: number; notas?: string | null }
  items: { descripcion: string; cantidad: number; precio_unitario: number; subtotal: number }[]
}) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.empresaRow}>
            {empresa.logo_url && <Image src={empresa.logo_url} style={styles.logo} />}
            <View>
              <Text style={styles.empresaNombre}>{empresa.nombre}</Text>
              {empresa.direccion && <Text style={styles.muted}>{empresa.direccion}</Text>}
              <Text style={styles.muted}>{[empresa.telefono, empresa.correo_electronico].filter(Boolean).join(' · ')}</Text>
            </View>
          </View>
          <View style={styles.right}>
            <Text style={styles.tag}>Recibo</Text>
            <Text style={styles.numero}>{recibo.numero}</Text>
            <Text style={styles.muted}>{recibo.fecha}</Text>
          </View>
        </View>

        <Text style={styles.label}>Recibí de</Text>
        <Text style={styles.bold}>{cliente.nombre}</Text>

        <View style={styles.thRow}>
          <Text style={[styles.th, styles.colDesc]}>Descripción</Text>
          <Text style={[styles.th, styles.colNum]}>Cant.</Text>
          <Text style={[styles.th, styles.colNum]}>P. Unit.</Text>
          <Text style={[styles.th, styles.colNum]}>Subtotal</Text>
        </View>
        {items.map((it, i) => (
          <View key={i} style={styles.tr}>
            <Text style={styles.colDesc}>{it.descripcion}</Text>
            <Text style={styles.colNum}>{it.cantidad}</Text>
            <Text style={styles.colNum}>{fm(it.precio_unitario)}</Text>
            <Text style={styles.colNum}>{fm(it.subtotal)}</Text>
          </View>
        ))}

        <View style={styles.totalFinal}>
          <Text style={styles.totalFinalTexto}>Total</Text>
          <Text style={[styles.totalFinalTexto, { fontFamily: 'Courier-Bold' }]}>L. {fm(recibo.total)}</Text>
        </View>

        {recibo.notas && <Text style={[styles.muted, { marginTop: 20 }]}>{recibo.notas}</Text>}
        <Text style={styles.footer}>Este documento no constituye una factura fiscal.</Text>
      </Page>
    </Document>
  )
}