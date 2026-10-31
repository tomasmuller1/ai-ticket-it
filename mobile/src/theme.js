import { useColorScheme } from "react-native";

// Tokens de diseño de AI Ticket It. Ningún componente usa colores o tamaños sueltos: todo sale de acá.
// Dirección: la interfaz es tinta sobre papel (sin color en botones ni menús) y el color lo ponen las
// fotos de los eventos y la entrada impresa, que es el único objeto con el rojo de la marca.
// Contrastes calculados (WCAG AA): texto ≥ 4.5:1 sobre su fondo, bordes de campo ≥ 3:1.

const claro = {
  fondo: "#F4F3F1",
  superficie: "#E9E7E2", // un escalón de tono: chips, buscador, campos, avisos
  superficieAlta: "#FFFFFF", // hojas, modales y tarjetas que flotan sobre el fondo
  tinta: "#0A0A0A",
  texto: "#0A0A0A",
  textoSecundario: "#57564F",
  textoTenue: "#63615B", // 5:1 sobre la superficie
  borde: "#E0DDD7",
  bordeFuerte: "#CBC7BF",
  bordeCampo: "#85827B", // 3.1:1 sobre la superficie (WCAG 1.4.11)
  // La acción principal es tinta: el color queda para lo que tiene significado.
  acento: "#0A0A0A",
  acentoPresionado: "#2B2A27",
  sobreAcento: "#FFFFFF",
  acentoSuave: "#E9E7E2",
  textoAcento: "#0A0A0A",
  // Rojo boletería: solo en la entrada y en la marca.
  marca: "#D2361F",
  sobreMarca: "#FFFFFF",
  peligro: "#B42318",
  peligroSuave: "#FBE7E4",
  exito: "#1E7A3C",
  aviso: "#9A4A08",
  imagenVacia: "#2B2724",
  sombra: "#000000",
  // Barra de navegación flotante: oscura en los dos modos, con la pestaña activa en una píldora clara.
  barra: "#141414",
  barraIcono: "#8F8D88",
  barraActiva: "#FFFFFF",
  sobreBarraActiva: "#0A0A0A",
  // La entrada es papel también en modo oscuro.
  papel: "#FFFDF8",
  tintaPapel: "#0A0A0A",
  tintaPapelSecundaria: "#5B5A54",
};

const oscuro = {
  fondo: "#0E0E0D",
  superficie: "#1C1C1A",
  superficieAlta: "#232321",
  tinta: "#F4F3F1",
  texto: "#F4F3F1",
  textoSecundario: "#B5B3AE",
  textoTenue: "#9C9A95", // 6:1 sobre la superficie
  borde: "#2A2A27",
  bordeFuerte: "#3A3A36",
  bordeCampo: "#6E6C67", // 3.2:1 sobre la superficie
  acento: "#F4F3F1",
  acentoPresionado: "#D9D7D2",
  sobreAcento: "#0A0A0A",
  acentoSuave: "#232321",
  textoAcento: "#F4F3F1",
  marca: "#D2361F",
  sobreMarca: "#FFFFFF",
  peligro: "#F97066",
  peligroSuave: "#3A1A17",
  exito: "#4ADE80",
  aviso: "#FBBF24",
  imagenVacia: "#2B2724",
  sombra: "#000000",
  barra: "#262624",
  barraIcono: "#8F8D88",
  barraActiva: "#F4F3F1",
  sobreBarraActiva: "#0A0A0A",
  papel: "#F7F4EC",
  tintaPapel: "#0A0A0A",
  tintaPapelSecundaria: "#5B5A54",
};

// Estado de cada compra: siempre con color + ícono + texto (nunca solo color).
const estadosClaro = {
  PENDIENTE: { etiqueta: "Pendiente de pago", icono: "time-outline", fondo: "#FBEFD9", texto: "#6B3A06" },
  CONFIRMADA: {
    etiqueta: "Confirmada",
    icono: "checkmark-circle-outline",
    fondo: "#DDF1E2",
    texto: "#14532D",
  },
  UTILIZADA: { etiqueta: "Utilizada", icono: "ticket-outline", fondo: "#E9E7E2", texto: "#2B2A27" },
  CANCELADA: { etiqueta: "Cancelada", icono: "close-circle-outline", fondo: "#E9E7E2", texto: "#3D3C37" },
  REEMBOLSADA: {
    etiqueta: "Reembolsada",
    icono: "return-down-back-outline",
    fondo: "#E4ECF7",
    texto: "#1E3A8A",
  },
};

const estadosOscuro = {
  PENDIENTE: { ...estadosClaro.PENDIENTE, fondo: "#3B2A0A", texto: "#FCD34D" },
  CONFIRMADA: { ...estadosClaro.CONFIRMADA, fondo: "#0F2E1B", texto: "#86EFAC" },
  UTILIZADA: { ...estadosClaro.UTILIZADA, fondo: "#2A2A27", texto: "#E4E2DD" },
  CANCELADA: { ...estadosClaro.CANCELADA, fondo: "#2A2A27", texto: "#D4D2CD" },
  REEMBOLSADA: { ...estadosClaro.REEMBOLSADA, fondo: "#172554", texto: "#BFDBFE" },
};

export const fuentes = {
  regular: "Geist_400Regular",
  media: "Geist_500Medium",
  seminegrita: "Geist_600SemiBold",
  negrita: "Geist_700Bold",
};

// Pocos tamaños y muy separados: uno grande para lo que importa y texto normal para el resto.
// Sin etiquetas en mayúsculas: la información va en el título o en la primera línea.
export const tipografia = {
  display: { fontFamily: fuentes.negrita, fontSize: 32, lineHeight: 36, letterSpacing: -1 },
  titulo: { fontFamily: fuentes.negrita, fontSize: 24, lineHeight: 28, letterSpacing: -0.6 },
  subtitulo: { fontFamily: fuentes.seminegrita, fontSize: 18, lineHeight: 24, letterSpacing: -0.2 },
  cuerpo: { fontFamily: fuentes.regular, fontSize: 16, lineHeight: 24 },
  cuerpoFuerte: { fontFamily: fuentes.seminegrita, fontSize: 16, lineHeight: 24 },
  etiqueta: { fontFamily: fuentes.media, fontSize: 14, lineHeight: 20 },
  pequenio: { fontFamily: fuentes.regular, fontSize: 13, lineHeight: 18 },
};

export const espacio = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };

// Radios en dos grupos: chicos para fotos y tarjetas, redondos completos para botones, chips y la barra.
export const radio = { sm: 6, md: 8, lg: 8, xl: 12, pill: 999 };

// Mínimo recomendado para elementos táctiles (Apple HIG / Material).
export const AREA_TACTIL = 44;

// La barra de navegación flota sobre el contenido: las pestañas dejan este espacio abajo.
export const ALTURA_BARRA = 64;

export function useTema() {
  const esOscuro = useColorScheme() === "dark";
  return {
    esOscuro,
    colores: esOscuro ? oscuro : claro,
    estados: esOscuro ? estadosOscuro : estadosClaro,
  };
}
