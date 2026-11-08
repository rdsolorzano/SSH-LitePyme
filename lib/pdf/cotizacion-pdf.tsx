import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { formatearFecha } from '@/lib/formato'
import { COLORES_PDF, DatosCliente, EncabezadoDocumento, ESTILOS_BASE, SeccionTotales, TablaArticulos, type ClienteDoc, type EmpresaDoc, type ItemDoc, type TotalesDoc } from './comunes'

const styles = StyleSheet.create(ESTILOS_BASE)

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
        <EncabezadoDocumento
          empresa={empresa}
          tipo="Cotización"
          numero={cotizacion.numero}
          fecha={formatearFecha(cotizacion.fecha)}
          colorNumero={COLORES_PDF.marca}
        />

        <View style={styles.grid2}>
          <View style={styles.col}>
            <DatosCliente cliente={cliente} />
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Validez</Text>
            <Text style={styles.muted}>{cotizacion.validez_dias} días a partir de la fecha</Text>
            {cotizacion.notas && <Text style={[styles.muted, { marginTop: 3 }]}>{cotizacion.notas}</Text>}
          </View>
        </View>

        <TablaArticulos items={items} />

        <SeccionTotales doc={cotizacion} />

        <Text style={styles.footer}>Gracias por su preferencia.</Text>
      </Page>
    </Document>
  )
}
