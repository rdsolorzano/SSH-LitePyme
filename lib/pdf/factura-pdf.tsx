import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { formatearFecha, formatearMoneda as fm, formatearNumeroDocumento } from '@/lib/formato'
import { numeroALetras } from '@/lib/numero-a-letras'
import { DatosCliente, EncabezadoDocumento, ESTILOS_BASE, SeccionTotales, type ClienteDoc, type EmpresaDoc, type ItemDoc, type TotalesDoc } from './comunes'

// Se reexportan para no romper los archivos que ya los importan desde aquí
export type { ItemDoc, EmpresaDoc, ClienteDoc }

const styles = StyleSheet.create({
  ...ESTILOS_BASE,
  colDesc: { width: '40%' },
  colNum: { width: '15%', textAlign: 'right', fontFamily: 'Courier' },
})

export function FacturaDocument({
  empresa,
  cliente,
  factura,
  cai,
  items,
}: {
  empresa: EmpresaDoc
  cliente: ClienteDoc
  factura: { numero_correlativo: string; fecha: string } & TotalesDoc
  cai: { cai: string; punto_emision?: string | null; rango_inicial: number; rango_final: number; fecha_limite_emision: string }
  items: ItemDoc[]
}) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <EncabezadoDocumento empresa={empresa} tipo="Factura · Original" numero={factura.numero_correlativo} fecha={formatearFecha(factura.fecha)} />

        <View style={styles.grid2}>
          <View style={styles.col}>
            <DatosCliente cliente={cliente} />
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Datos de facturación</Text>
            <Text style={styles.muted}>{empresa.razonSocial}</Text>
            <Text style={[styles.muted, { fontFamily: 'Courier' }]}>CAI: {cai.cai}</Text>
            <Text style={styles.muted}>Rango autorizado: {formatearNumeroDocumento(cai.punto_emision, cai.rango_inicial)} | {formatearNumeroDocumento(cai.punto_emision, cai.rango_final)}</Text>
            <Text style={styles.muted}>Fecha límite de emisión: {formatearFecha(cai.fecha_limite_emision)}</Text>
          </View>
        </View>

        <View style={styles.thRow}>
          <Text style={[styles.th, styles.colDesc]}>Descripción</Text>
          <Text style={[styles.th, styles.colNum]}>Cant.</Text>
          <Text style={[styles.th, styles.colNum]}>P. Unit.</Text>
          <Text style={[styles.th, styles.colNum]}></Text>
          <Text style={[styles.th, styles.colNum]}>Subtotal</Text>
        </View>
        {items.map((it, i) => (
          <View key={i} style={styles.tr}>
            <Text style={styles.colDesc}>{it.descripcion}</Text>
            <Text style={styles.colNum}>{it.cantidad}</Text>
            <Text style={styles.colNum}>{fm(it.precio_unitario)}</Text>
            <Text style={styles.colNum}></Text>
            <Text style={styles.colNum}>{fm(it.subtotal)}</Text>
          </View>
        ))}

        <SeccionTotales doc={factura}>
          <Text style={{ fontSize: 8, fontStyle: 'italic', color: '#888', textAlign: 'right', marginTop: 4 }}>{numeroALetras(factura.total)}</Text>
        </SeccionTotales>

        <Text style={styles.footer}>Gracias por su preferencia.</Text>
      </Page>
    </Document>
  )
}
