// Piezas compartidas por los PDFs (factura, cotización, recibo y reporte).
// Cambia aquí un color, un estilo o un bloque y se actualiza en todos los documentos.
import { Image, StyleSheet, Text, View } from '@react-pdf/renderer'
import { formatearMoneda as fm } from '@/lib/formato'
import type { ExoneracionDoc } from '@/lib/exoneracion'

// Mismos colores de la app (ver app/globals.css)
export const COLORES_PDF = {
  marca: '#1B2430',
  acento: '#0E7C86',
  rojo: '#C0392B',
  verde: '#2F9E44',
} as const

export type ItemDoc = { descripcion: string; cantidad: number; precio_unitario: number; tasa_isv: number; subtotal: number }
export type EmpresaDoc = { nombre: string; razonSocial?: string | null; rtn?: string | null; direccion?: string | null; telefono?: string | null; correo_electronico?: string | null; sitio_web?: string | null; logo_url?: string | null }
export type ClienteDoc = { nombre: string; rtn?: string | null; direccion?: string | null; telefono?: string | null; email?: string | null }

// Totales que comparten factura y cotización
export type TotalesDoc = {
  subtotal_gravado_15: number
  subtotal_gravado_18: number
  subtotal_exento: number
  isv_15: number
  isv_18: number
  total: number
} & ExoneracionDoc

// Estilos base. Cada documento los usa y solo agrega o cambia lo suyo.
export const ESTILOS_BASE = {
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: COLORES_PDF.marca },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 2, borderBottomColor: COLORES_PDF.marca, paddingBottom: 14, marginBottom: 14 },
  empresaRow: { flexDirection: 'row' },
  logo: { width: 70, height: 70, marginRight: 10, objectFit: 'contain' },
  empresaNombre: { fontSize: 13, fontFamily: 'Helvetica-Bold' },
  muted: { fontSize: 9, color: '#666', marginTop: 1 },
  right: { textAlign: 'right' },
  tag: { fontSize: 8, color: COLORES_PDF.acento, textTransform: 'uppercase', letterSpacing: 1 },
  numero: { fontSize: 13, fontFamily: 'Courier-Bold', marginTop: 2, color: COLORES_PDF.rojo },
  grid2: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  col: { width: '48%' },
  label: { fontSize: 8, color: '#999', textTransform: 'uppercase', marginBottom: 3 },
  bold: { fontFamily: 'Helvetica-Bold' },
  thRow: { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: COLORES_PDF.marca, paddingBottom: 4, marginBottom: 4 },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', paddingVertical: 4 },
  th: { fontSize: 8, color: '#999', textTransform: 'uppercase' },
  totales: { alignSelf: 'flex-end', width: 200, marginTop: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  totalValor: { fontFamily: 'Courier' },
  totalFinal: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 2, borderTopColor: COLORES_PDF.marca, paddingTop: 5, marginTop: 5 },
  totalFinalTexto: { fontFamily: 'Helvetica-Bold', fontSize: 12 },
  footer: { marginTop: 30, textAlign: 'center', fontSize: 9, color: '#999' },
} as const

const s = StyleSheet.create(ESTILOS_BASE)

// Encabezado: logo y datos de la empresa a la izquierda; tipo, número y fecha a la derecha
export function EncabezadoDocumento({
  empresa,
  tipo,
  numero,
  fecha,
  mostrarRtn = true,
  mostrarSitioWeb = true,
  tamanoLogo = 70,
}: {
  empresa: EmpresaDoc
  tipo: string
  numero: string
  fecha: string
  mostrarRtn?: boolean
  mostrarSitioWeb?: boolean
  tamanoLogo?: number
}) {
  const contacto = mostrarSitioWeb
    ? [empresa.telefono, empresa.correo_electronico, empresa.sitio_web]
    : [empresa.telefono, empresa.correo_electronico]
  return (
    <View style={s.header}>
      <View style={s.empresaRow}>
        {empresa.logo_url && <Image src={empresa.logo_url} style={[s.logo, { width: tamanoLogo, height: tamanoLogo }]} />}
        <View>
          <Text style={s.empresaNombre}>{empresa.nombre}</Text>
          {mostrarRtn && <Text style={s.muted}>RTN: {empresa.rtn}</Text>}
          {empresa.direccion && <Text style={s.muted}>{empresa.direccion}</Text>}
          <Text style={s.muted}>{contacto.filter(Boolean).join(' · ')}</Text>
        </View>
      </View>
      <View style={s.right}>
        <Text style={s.tag}>{tipo}</Text>
        <Text style={s.numero}>{numero}</Text>
        <Text style={s.muted}>{fecha}</Text>
      </View>
    </View>
  )
}

// Bloque "Cliente" con sus datos de contacto
export function DatosCliente({ cliente }: { cliente: ClienteDoc }) {
  return (
    <>
      <Text style={s.label}>Cliente</Text>
      <Text style={s.bold}>{cliente.nombre}</Text>
      {cliente.rtn && <Text style={s.muted}>RTN: {cliente.rtn}</Text>}
      {cliente.direccion && <Text style={s.muted}>{cliente.direccion}</Text>}
      {cliente.telefono && <Text style={s.muted}>Tel: {cliente.telefono}</Text>}
      {cliente.email && <Text style={s.muted}>{cliente.email}</Text>}
    </>
  )
}

// Recuadro de exoneración (izquierda) y desglose de totales (derecha).
// "children" se muestra debajo del total, por ejemplo el total en letras.
export function SeccionTotales({ doc, children }: { doc: TotalesDoc; children?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
      <View style={{ width: 270 }}>
        {doc.exonerado && (
          <View style={{ borderWidth: 1, borderColor: '#ddd', padding: 8 }}>
            <Text style={[s.label, { marginBottom: 4 }]}>Datos del adquirente exonerado</Text>
            <Text style={s.muted}>No. Constancia Exonerado: {doc.no_constancia_exonerado || '—'}</Text>
            {doc.no_registro_sag ? <Text style={s.muted}>No. Registro S.A.G.: {doc.no_registro_sag}</Text> : null}
            <Text style={s.muted}>No. Orden de Compra Exenta: {doc.no_orden_compra_exenta || '—'}</Text>
          </View>
        )}
      </View>
      <View style={[s.totales, { alignSelf: 'flex-start', marginTop: 0 }]}>
        {doc.exonerado && (
          <View style={s.totalRow}><Text>Importe Exonerado</Text><Text style={s.totalValor}>L. {fm(doc.subtotal_exonerado)}</Text></View>
        )}
        <View style={s.totalRow}><Text>Gravado 15%</Text><Text style={s.totalValor}>L. {fm(doc.subtotal_gravado_15)}</Text></View>
        <View style={s.totalRow}><Text>Gravado 18%</Text><Text style={s.totalValor}>L. {fm(doc.subtotal_gravado_18)}</Text></View>
        <View style={s.totalRow}><Text>Exento</Text><Text style={s.totalValor}>L. {fm(doc.subtotal_exento)}</Text></View>
        <View style={s.totalRow}><Text>ISV 15%</Text><Text style={s.totalValor}>L. {fm(doc.isv_15)}</Text></View>
        <View style={s.totalRow}><Text>ISV 18%</Text><Text style={s.totalValor}>L. {fm(doc.isv_18)}</Text></View>
        <View style={s.totalFinal}>
          <Text style={s.totalFinalTexto}>Total</Text>
          <Text style={[s.totalFinalTexto, { fontFamily: 'Courier-Bold' }]}>L. {fm(doc.total)}</Text>
        </View>
        {children}
      </View>
    </View>
  )
}
