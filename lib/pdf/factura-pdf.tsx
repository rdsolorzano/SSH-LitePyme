import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { formatearFecha, formatearNumeroDocumento } from '@/lib/formato'
import { numeroALetras } from '@/lib/numero-a-letras'
import { COLORES_PDF, MONO, DatosCliente, EncabezadoDocumento, ESTILOS_BASE, SeccionTotales, TablaArticulos, type ClienteDoc, type EmpresaDoc, type ItemDoc, type TotalesDoc } from './comunes'

// Se reexportan para no romper los archivos que ya los importan desde aquí
export type { ItemDoc, EmpresaDoc, ClienteDoc }

const styles = StyleSheet.create(ESTILOS_BASE)

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
            <Text style={styles.mutedXs}>{empresa.razonSocial}</Text>
            <Text style={[styles.mutedXs, MONO]}>CAI: {cai.cai}</Text>
            {/* El rango va en su propia línea para que ningún número quede partido */}
            <Text style={styles.mutedXs}>Rango autorizado:</Text>
            <Text style={styles.mutedXs}>
              {formatearNumeroDocumento(cai.punto_emision, cai.rango_inicial)} al {formatearNumeroDocumento(cai.punto_emision, cai.rango_final)}
            </Text>
            <Text style={styles.mutedXs}>Fecha límite de emisión: {formatearFecha(cai.fecha_limite_emision)}</Text>
          </View>
        </View>

        <TablaArticulos items={items} />

        <SeccionTotales doc={factura}>
          <Text style={{ fontSize: 7.5, fontStyle: 'italic', color: COLORES_PDF.gris500, textAlign: 'right', paddingTop: 5.5 }}>
            {numeroALetras(factura.total)}
          </Text>
        </SeccionTotales>

        <Text style={styles.footer}>Gracias por su preferencia.</Text>
      </Page>
    </Document>
  )
}
