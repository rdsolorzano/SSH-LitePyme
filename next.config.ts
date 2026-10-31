import type { NextConfig } from "next";

// Fecha y hora de la publicación en hora de Honduras, formato "00:07 | 31.10.26".
// Se calcula sola cada vez que se compila (en Vercel, en cada despliegue).
function fechaPublicacion() {
  const partes = new Intl.DateTimeFormat("es-HN", {
    timeZone: "America/Tegucigalpa",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).formatToParts(new Date());
  const p = (tipo: string) => partes.find((x) => x.type === tipo)?.value ?? "";
  return `${p("hour")}:${p("minute")} | ${p("day")}.${p("month")}.${p("year")}`;
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_FECHA_PUBLICACION: fechaPublicacion(),
  },
};

export default nextConfig;
