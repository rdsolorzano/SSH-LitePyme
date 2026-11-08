import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { MARCA } from "@/lib/marca";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Geist Mono desde public/fonts (versión estática, no variable): así el navegador la guarda
// correctamente al "Imprimir / Guardar PDF" y los números no se ven engrosados en el visor.
// Son los mismos archivos que usa el PDF descargable (lib/pdf/comunes.tsx).
const geistMono = localFont({
  variable: "--font-geist-mono",
  src: [
    { path: "../public/fonts/GeistMono-Regular.ttf", weight: "400", style: "normal" },
    { path: "../public/fonts/GeistMono-Bold.ttf", weight: "700", style: "normal" },
  ],
  display: "swap",
});

export const metadata: Metadata = {
  title: MARCA.tituloPestana,
  description: MARCA.descripcion,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: MARCA.nombreCompleto,
  },
  icons: {
    icon: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: MARCA.colorTema,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
