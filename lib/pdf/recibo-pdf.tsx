import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { formatearFecha, formatearMoneda as fm } from '@/lib/formato'
import { COLORES_PDF, EncabezadoDocumento, ESTILOS_BASE, type ClienteDoc, type EmpresaDoc } from './comunes'

const styles = StyleSheet.create({
  ...ESTILOS_BASE,
  thRow: { ...ESTILOS_BASE.thRow, marginTop: 14 },
  colDesc: { width: '55%' },
  colNum: { width: '15%', textAlign: 'right', fontFamily: 'Courier' },
  totalFinal: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 2, borderTopColor: COLORES_PDF.marca, paddingTop: 6, marginTop: 10, alignSelf: 'flex-end', width: 200 },
})

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
        <EncabezadoDocumento
          empresa={empresa}
          tipo="Recibo"
          numero={recibo.numero}
          fecha={formatearFecha(recibo.fecha)}
          mostrarRtn={false}
          mostrarSitioWeb={false}
          tamanoLogo={48}
        />

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