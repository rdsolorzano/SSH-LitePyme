import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { formatearFecha, formatearMoneda as fm } from '@/lib/formato'
import { COLORES_PDF, EncabezadoDocumento, ESTILOS_BASE, MONO_BOLD, TablaArticulos, type ClienteDoc, type EmpresaDoc } from './comunes'

const styles = StyleSheet.create({
  ...ESTILOS_BASE,
  totalFinal: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1.5, borderTopColor: COLORES_PDF.marca, paddingTop: 6, alignSelf: 'flex-end', width: 240 },
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

        <View style={{ marginBottom: 18 }}>
          <Text style={styles.label}>Recibí de</Text>
          <Text style={[styles.bold, { color: COLORES_PDF.marca }]}>{cliente.nombre}</Text>
        </View>

        <TablaArticulos items={items} />

        <View style={styles.totalFinal}>
          <Text style={styles.totalFinalTexto}>Total</Text>
          <Text style={[styles.totalFinalTexto, MONO_BOLD]}>L. {fm(recibo.total)}</Text>
        </View>

        {recibo.notas && <Text style={[styles.muted, { marginTop: 18 }]}>{recibo.notas}</Text>}
        <Text style={styles.footer}>Este documento no constituye una factura fiscal.</Text>
      </Page>
    </Document>
  )
}