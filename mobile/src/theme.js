import { useColorScheme } from "react-native";

// Tokens de diseño de AI Ticket It. Ningún componente usa colores o tamaños sueltos: todo sale de acá.
// Dirección: "vibrante y en bloques" — tipografía Outfit con mucho peso, acento rosa intenso,
// superficies limpias y un motivo de "entrada" (talón troquelado) en las compras.

const rosa = {
  50: "#FFF1F3",
  100: "#FFE4EA",
  300: "#FDA4B8",
  500: "#F43F5E",
  600: "#E11D48",
  700: "#BE123C",
  900: "#881337",
};

const claro = {
  fondo: "#FFFFFF",
  superficie: "#F6F4F8",
  superficieAlta: "#FFFFFF",
  tinta: "#14111A",
  texto: "#14111A",
  textoSecundario: "#6B6475",
  textoTenue: "#9A93A5",
  borde: "#E7E3EC",
  bordeFuerte: "#CFC8D8",
  acento: rosa[600],
  acentoPresionado: rosa[700],
  sobreAcento: "#FFFFFF",
  acentoSuave: rosa[100],
  textoAcento: rosa[700],
  peligro: "#BE123C",
  peligroSuave: "#FFE4E6",
  exito: "#15803D",
  aviso: "#B45309",
  imagenVacia: "#2A1F33",
  sombra: "#14111A",
};

const oscuro = {
  fondo: "#0E0B12",
  superficie: "#1A1620",
  superficieAlta: "#221D29",
  tinta: "#F7F5FA",
  texto: "#F7F5FA",
  textoSecundario: "#B3ACBD",
  textoTenue: "#7C7586",
  borde: "#2F2938",
  bordeFuerte: "#463E52",
  acento: rosa[500],
  acentoPresionado: rosa[600],
  sobreAcento: "#FFFFFF",
  acentoSuave: "#3A1520",
  textoAcento: rosa[300],
  peligro: "#FB7185",
  peligroSuave: "#3A1520",
  exito: "#4ADE80",
  aviso: "#FBBF24",
  imagenVacia: "#2A1F33",
  sombra: "#000000",
};

// Estado de cada compra: siempre con color + ícono + texto (nunca solo color).
const estadosClaro = {
  PENDIENTE: { etiqueta: "Pendiente de pago", icono: "time-outline", fondo: "#FEF3C7", texto: "#78350F" },
  CONFIRMADA: {
    etiqueta: "Confirmada",
    icono: "checkmark-circle-outline",
    fondo: "#DCFCE7",
    texto: "#14532D",
  },
  UTILIZADA: { etiqueta: "Utilizada", icono: "ticket-outline", fondo: "#E0E7FF", texto: "#312E81" },
  CANCELADA: { etiqueta: "Cancelada", icono: "close-circle-outline", fondo: "#F1F0F3", texto: "#3F3A46" },
  REEMBOLSADA: {
    etiqueta: "Reembolsada",
    icono: "return-down-back-outline",
    fondo: "#DBEAFE",
    texto: "#1E3A8A",
  },
};

const estadosOscuro = {
  PENDIENTE: { ...estadosClaro.PENDIENTE, fondo: "#3B2A0A", texto: "#FCD34D" },
  CONFIRMADA: { ...estadosClaro.CONFIRMADA, fondo: "#0F2E1B", texto: "#86EFAC" },
  UTILIZADA: { ...estadosClaro.UTILIZADA, fondo: "#1E1B4B", texto: "#C7D2FE" },
  CANCELADA: { ...estadosClaro.CANCELADA, fondo: "#2A2630", texto: "#D4CFDA" },
  REEMBOLSADA: { ...estadosClaro.REEMBOLSADA, fondo: "#172554", texto: "#BFDBFE" },
};

export const fuentes = {
  regular: "Outfit_400Regular",
  media: "Outfit_500Medium",
  negrita: "Outfit_700Bold",
  black: "Outfit_900Black",
};

export const tipografia = {
  display: { fontFamily: fuentes.black, fontSize: 30, lineHeight: 34, letterSpacing: -0.5 },
  titulo: { fontFamily: fuentes.black, fontSize: 24, lineHeight: 28, letterSpacing: -0.3 },
  subtitulo: { fontFamily: fuentes.negrita, fontSize: 18, lineHeight: 24 },
  cuerpo: { fontFamily: fuentes.regular, fontSize: 16, lineHeight: 24 },
  cuerpoFuerte: { fontFamily: fuentes.negrita, fontSize: 16, lineHeight: 24 },
  etiqueta: { fontFamily: fuentes.media, fontSize: 14, lineHeight: 20 },
  pequenio: { fontFamily: fuentes.regular, fontSize: 13, lineHeight: 18 },
  overline: {
    fontFamily: fuentes.negrita,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
};

export const espacio = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };

export const radio = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 };

// Mínimo recomendado para elementos táctiles (Apple HIG / Material).
export const AREA_TACTIL = 44;

export function useTema() {
  const esOscuro = useColorScheme() === "dark";
  return {
    esOscuro,
    colores: esOscuro ? oscuro : claro,
    estados: esOscuro ? estadosOscuro : estadosClaro,
  };
}
