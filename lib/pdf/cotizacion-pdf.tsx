import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { formatearFecha, formatearMoneda as fm } from '@/lib/formato'
import { DatosCliente, EncabezadoDocumento, ESTILOS_BASE, SeccionTotales, type ClienteDoc, type EmpresaDoc, type ItemDoc, type TotalesDoc } from './comunes'

const styles = StyleSheet.create({
  ...ESTILOS_BASE,
  colDesc: { width: '45%' },
  colCant: { width: '15%', textAlign: 'center', fontFamily: 'Courier' },
  colIsv: { width: '10%' },
  colNum: { width: '15%', textAlign: 'right', fontFamily: 'Courier' },
})

export function CotizacionDocument({
  empresa,
  cliente,
  cotizacion,
  items,
}: {
  empresa: EmpresaDoc
  cliente: ClienteDoc
  cotizacion: { numero: string; fecha: string; validez_dias: number; notas?: string | null } & TotalesDoc
  items: ItemDoc[]
}) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <EncabezadoDocumento empresa={empresa} tipo="Cotización" numero={cotizacion.numero} fecha={formatearFecha(cotizacion.fecha)} />

        <View style={styles.grid2}>
          <View style={styles.col}>
            <DatosCliente cliente={cliente} />
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Validez</Text>
            <Text style={styles.muted}>{cotizacion.validez_dias} días a partir de la fecha</Text>
            {cotizacion.notas && <Text style={[styles.muted, { marginTop: 4 }]}>{cotizacion.notas}</Text>}
          </View>
        </View>

        {/* La columna vacía usa colIsv igual que las filas, para que "Subtotal" quede alineado con sus valores */}
        <View style={styles.thRow}>
          <Text style={[styles.th, styles.colDesc]}>Descripción</Text>
          <Text style={[styles.th, styles.colCant]}>Cant.</Text>
          <Text style={[styles.th, styles.colNum]}>P. Unit.</Text>
          <Text style={[styles.th, styles.colIsv]}></Text>
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

        <SeccionTotales doc={cotizacion} />

        <Text style={styles.footer}>Cotización sujeta a cambios sin previo aviso.</Text>
      </Page>
    </Document>
  )
}
