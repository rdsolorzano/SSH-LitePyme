// Piezas compartidas por los PDFs (factura, cotización, recibo y reporte).
// El diseño copia la vista "Imprimir / Guardar PDF" (app/dashboard/facturas/[id]/page.tsx),
// para que el PDF descargado y el impreso se vean iguales.
// Equivalencias usadas: 1px de pantalla = 0.75pt de PDF (text-sm 14px = 10.5pt, text-xs 12px = 9pt).
import { Font, Image, StyleSheet, Text, View } from '@react-pdf/renderer'
import { formatearMoneda as fm } from '@/lib/formato'
import type { ExoneracionDoc } from '@/lib/exoneracion'

// Misma fuente monoespaciada que la vista de impresión (Geist Mono, licencia OFL, en public/fonts).
// En el navegador se carga desde el propio sitio; en pruebas locales, desde la carpeta public.
const RUTA_FUENTES =
  typeof window !== 'undefined' ? `${window.location.origin}/fonts` : `${process.cwd()}/public/fonts`
Font.register({
  family: 'GeistMono',
  fonts: [
    { src: `${RUTA_FUENTES}/GeistMono-Regular.ttf` },
    { src: `${RUTA_FUENTES}/GeistMono-Bold.ttf`, fontWeight: 'bold' },
  ],
})

// No cortar palabras con guion (ej. "DIS-TRIBUCION"); solo parte textos muy largos sin espacios
Font.registerHyphenationCallback((palabra) => (palabra.length <= 24 ? [palabra] : palabra.match(/.{1,18}/g) ?? [palabra]))

export const MONO = { fontFamily: 'GeistMono' } as const
export const MONO_BOLD = { fontFamily: 'GeistMono', fontWeight: 'bold' } as const

// Mismos colores de la app (ver app/globals.css) + grises de Tailwind
export const COLORES_PDF = {
  marca: '#1B2430',
  acento: '#0E7C86',
  rojo: '#C0392B',
  verde: '#2F9E44',
  numero: '#DC2626', // text-red-600 del número de documento
  gris600: '#4B5563',
  gris500: '#6B7280',
  gris400: '#9CA3AF',
  gris200: '#E5E7EB',
  gris100: '#F3F4F6',
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

const C = COLORES_PDF

// Estilos base. Cada documento los usa y solo agrega o cambia lo suyo.
export const ESTILOS_BASE = {
  page: { paddingVertical: 36, paddingHorizontal: 36, fontSize: 10.5, lineHeight: 1.43, fontFamily: 'Helvetica', color: C.marca },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 1.5, borderBottomColor: C.marca, paddingBottom: 18, marginBottom: 24 },
  empresaRow: { flexDirection: 'row', alignItems: 'flex-start', flex: 1 },
  logo: { width: 78, height: 78, marginRight: 12, objectFit: 'contain' },
  empresaNombre: { fontSize: 13.5, fontFamily: 'Helvetica-Bold', lineHeight: 1.55 },
  empresaDato: { fontSize: 10.5, color: C.gris600, lineHeight: 1.43 },
  muted: { fontSize: 10.5, color: C.gris600, lineHeight: 1.43 },
  mutedXs: { fontSize: 9, color: C.gris600, lineHeight: 1.33 },
  right: { alignItems: 'flex-end', paddingTop: 1 },
  tag: { textAlign: 'right', fontSize: 9, color: C.acento, textTransform: 'uppercase', letterSpacing: 0.25, lineHeight: 1.33 },
  numero: { textAlign: 'right', fontSize: 13.5, fontFamily: 'GeistMono', fontWeight: 'bold', color: C.numero, lineHeight: 1.55 },
  fecha: { textAlign: 'right', fontSize: 10.5, color: C.gris500, marginTop: 4 },
  grid2: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  col: { width: '48.3%' },
  label: { fontSize: 9, lineHeight: 1.33, color: C.gris400, textTransform: 'uppercase', letterSpacing: 0.25, marginBottom: 4 },
  bold: { fontFamily: 'Helvetica-Bold' },
  thRow: { flexDirection: 'row', borderBottomWidth: 1.5, borderBottomColor: C.marca, paddingVertical: 6 },
  tr: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 0.75, borderBottomColor: C.gris100, paddingVertical: 6 },
  th: { fontSize: 9, lineHeight: 1.33, fontFamily: 'Helvetica-Bold', color: C.gris500, textTransform: 'uppercase', letterSpacing: 0.25 },
  totales: { width: 240, borderTopWidth: 0.75, borderTopColor: C.gris200, paddingTop: 10.5 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', color: C.gris600, marginBottom: 3 },
  totalValor: { fontFamily: 'GeistMono' },
  totalFinal: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1.5, borderTopColor: C.marca, paddingTop: 8, marginTop: -2 },
  totalFinalTexto: { fontFamily: 'Helvetica-Bold', fontSize: 12, lineHeight: 1.5 },
  footer: { marginTop: 1, textAlign: 'center', fontSize: 9, lineHeight: 1.33, color: C.gris400 },
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
  tamanoLogo = 78,
  colorNumero = COLORES_PDF.numero,
}: {
  empresa: EmpresaDoc
  tipo: string
  numero: string
  fecha: string
  mostrarRtn?: boolean
  mostrarSitioWeb?: boolean
  tamanoLogo?: number
  colorNumero?: string // la cotización lo usa oscuro, igual que su vista de impresión
}) {
  const contacto = mostrarSitioWeb
    ? [empresa.telefono, empresa.correo_electronico, empresa.sitio_web]
    : [empresa.telefono, empresa.correo_electronico]
  return (
    <View style={s.header}>
      <View style={s.empresaRow}>
        {empresa.logo_url && <Image src={empresa.logo_url} style={[s.logo, { width: tamanoLogo, height: tamanoLogo }]} />}
        <View style={{ flex: 1, paddingTop: 2.5 }}>
          <Text style={s.empresaNombre}>{empresa.nombre}</Text>
          {mostrarRtn && <Text style={s.empresaDato}>RTN: {empresa.rtn}</Text>}
          {empresa.direccion && <Text style={s.empresaDato}>{empresa.direccion}</Text>}
          <Text style={s.empresaDato}>{contacto.filter(Boolean).join(' · ')}</Text>
        </View>
      </View>
      <View style={[s.right, { marginLeft: 12 }]}>
        <Text style={s.tag}>{tipo}</Text>
        <Text style={[s.numero, { color: colorNumero }]}>{numero}</Text>
        <Text style={s.fecha}>{fecha}</Text>
      </View>
    </View>
  )
}

// Bloque "Cliente" con sus datos de contacto (nombre en negrita)
export function DatosCliente({ cliente }: { cliente: ClienteDoc }) {
  return (
    <>
      <Text style={s.label}>Cliente</Text>
      <Text style={[s.muted, s.bold, { color: C.marca, marginTop: 1 }]}>{cliente.nombre}</Text>
      {cliente.rtn && <Text style={s.muted}>RTN: {cliente.rtn}</Text>}
      {cliente.direccion && <Text style={s.muted}>{cliente.direccion}</Text>}
      {cliente.telefono && <Text style={s.muted}>Tel: {cliente.telefono}</Text>}
      {cliente.email && <Text style={s.muted}>{cliente.email}</Text>}
    </>
  )
}

// Tabla de artículos: Descripción 58% · Cant. 10% · P. Unit. 16% · Subtotal 16%
// (mismos anchos que la vista de impresión)
const col = {
  desc: { width: '58%', paddingRight: 6 },
  cant: { width: '10%', textAlign: 'center' },
  precio: { width: '16%', textAlign: 'right' },
  subtotal: { width: '16%', textAlign: 'right' },
} as const

export function TablaArticulos({
  items,
}: {
  items: Pick<ItemDoc, 'descripcion' | 'cantidad' | 'precio_unitario' | 'subtotal'>[]
}) {
  return (
    <View style={{ marginBottom: 18 }}>
      <View style={s.thRow}>
        <Text style={[s.th, col.desc]}>Descripción</Text>
        <Text style={[s.th, col.cant]}>Cant.</Text>
        <Text style={[s.th, col.precio]}>P. Unit.</Text>
        <Text style={[s.th, col.subtotal]}>Subtotal</Text>
      </View>
      {items.map((it, i) => (
        <View key={i} style={s.tr} wrap={false}>
          <Text style={col.desc}>{it.descripcion}</Text>
          <Text style={[col.cant, s.totalValor]}>{it.cantidad}</Text>
          <Text style={[col.precio, s.totalValor]}>L. {fm(it.precio_unitario)}</Text>
          <Text style={[col.subtotal, s.totalValor]}>L. {fm(it.subtotal)}</Text>
        </View>
      ))}
    </View>
  )
}

// Recuadro de exoneración (izquierda) y desglose de totales (derecha).
// "children" se muestra debajo del total, por ejemplo el total en letras.
export function SeccionTotales({ doc, children }: { doc: TotalesDoc; children?: React.ReactNode }) {
  const xs = { fontSize: 9, lineHeight: 1.33, color: C.gris600, marginBottom: 3 }
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }} wrap={false}>
      <View style={{ flex: 1, marginRight: 12 }}>
        {doc.exonerado && (
          <View style={{ borderWidth: 0.75, borderColor: C.gris200, borderRadius: 3, padding: 9 }}>
            <Text style={[xs, s.bold, { color: C.gris500, textTransform: 'uppercase', letterSpacing: 0.25 }]}>Datos de exoneración</Text>
            <Text style={xs}>No. Constancia Exonerado: <Text style={s.totalValor}>{doc.no_constancia_exonerado || '—'}</Text></Text>
            {doc.no_registro_sag ? <Text style={xs}>No. Registro S.A.G.: <Text style={s.totalValor}>{doc.no_registro_sag}</Text></Text> : null}
            <Text style={[xs, { marginBottom: 0 }]}>No. Orden de Compra Exenta: <Text style={s.totalValor}>{doc.no_orden_compra_exenta || '—'}</Text></Text>
          </View>
        )}
      </View>
      <View style={s.totales}>
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
          <Text style={[s.totalFinalTexto, MONO_BOLD]}>L. {fm(doc.total)}</Text>
        </View>
        {children}
      </View>
    </View>
  )
}
