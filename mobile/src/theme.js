import { useColorScheme } from "react-native";

// Tokens de diseño de AI Ticket It. Ningún componente usa colores o tamaños sueltos: todo sale de acá.
// Dirección: la interfaz es tinta sobre papel (sin color en botones ni menús) y el color lo ponen las
// fotos de los eventos y la entrada impresa. El verde del logo del TP aparece solo en detalles: el logo,
// el ícono de la pestaña activa y la marca de entrada válida. Nunca en textos sobre fondo claro.
// Contrastes calculados (WCAG AA): texto ≥ 4.5:1 sobre su fondo, bordes de campo ≥ 3:1.

const claro = {
  fondo: "#F4F3F1",
  superficie: "#E9E7E2", // un escalón de tono: chips, buscador, campos, avisos
  superficieAlta: "#FFFFFF", // hojas, modales y tarjetas que flotan sobre el fondo
  esqueleto: "#DCD8D0", // bloques de carga: se ven sobre el fondo y sobre la superficie
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
  // Verde del logo del TP: solo detalles (2:1 sobre blanco, nunca para texto sobre fondo claro).
  marca: "#69D73C",
  sobreMarca: "#0A0A0A",
  peligro: "#B42318",
  peligroSuave: "#FBE7E4",
  exito: "#1E7A3C",
  aviso: "#9A4A08",
  imagenVacia: "#2B2724",
  sombra: "#000000",
  // Barra de pestañas pegada abajo y clara; la activa es una píldora de tinta con el ícono en verde.
  barra: "#FFFFFF",
  barraIcono: "#6E6C66", // 5.3:1 sobre la barra
  barraActiva: "#0A0A0A",
  sobreBarraActiva: "#FFFFFF",
  iconoBarraActiva: "#69D73C", // 10:1 sobre la píldora
  // La entrada es papel también en modo oscuro.
  papel: "#FFFDF8",
  tintaPapel: "#0A0A0A",
  tintaPapelSecundaria: "#5B5A54",
  // Tinta del sello de una entrada anulada: fija, porque el papel es claro en los dos modos.
  tintaSello: "#B42318",
  // Velo sobre la foto de la entrada para que el texto blanco se lea (≥ 4.5:1 sobre cualquier foto).
  velo: "rgba(10, 10, 10, 0.62)",
};

const oscuro = {
  fondo: "#0E0E0D",
  superficie: "#1C1C1A",
  superficieAlta: "#232321",
  esqueleto: "#2E2E2B",
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
  marca: "#69D73C",
  sobreMarca: "#0A0A0A",
  peligro: "#F97066",
  peligroSuave: "#3A1A17",
  exito: "#4ADE80",
  aviso: "#FBBF24",
  imagenVacia: "#2B2724",
  sombra: "#000000",
  barra: "#1C1C1A",
  barraIcono: "#9C9A95",
  barraActiva: "#3A3A36",
  sobreBarraActiva: "#F4F3F1",
  iconoBarraActiva: "#69D73C",
  papel: "#F7F4EC",
  tintaPapel: "#0A0A0A",
  tintaPapelSecundaria: "#5B5A54",
  // Tinta del sello de una entrada anulada: fija, porque el papel es claro en los dos modos.
  tintaSello: "#B42318",
  // Velo sobre la foto de la entrada para que el texto blanco se lea (≥ 4.5:1 sobre cualquier foto).
  velo: "rgba(10, 10, 10, 0.62)",
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

// Una sola familia en dos anchos: Sofia Sans para leer y Sofia Sans Extra Condensed para los títulos y
// los nombres de los eventos, con aire de afiche y de entrada impresa.
export const fuentes = {
  regular: "SofiaSans_400Regular",
  media: "SofiaSans_500Medium",
  seminegrita: "SofiaSans_600SemiBold",
  negrita: "SofiaSans_700Bold",
  afiche: "SofiaSansExtraCondensed_800ExtraBold",
};

// Pocos tamaños y muy separados: uno grande para lo que importa y texto normal para el resto.
// Sin etiquetas en mayúsculas: la información va en el título o en la primera línea.
export const tipografia = {
  display: { fontFamily: fuentes.afiche, fontSize: 44, lineHeight: 44, letterSpacing: -0.2 },
  titulo: { fontFamily: fuentes.afiche, fontSize: 32, lineHeight: 34, letterSpacing: -0.1 },
  subtitulo: { fontFamily: fuentes.negrita, fontSize: 18, lineHeight: 24 },
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

// Alto de la barra de pestañas, sin contar el área segura de abajo.
export const ALTURA_BARRA = 60;

export function useTema() {
  const esOscuro = useColorScheme() === "dark";
  return {
    esOscuro,
    colores: esOscuro ? oscuro : claro,
    estados: esOscuro ? estadosOscuro : estadosClaro,
  };
}
