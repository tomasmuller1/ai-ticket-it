import { createContext, useContext } from "react";
import { useColorScheme } from "react-native";

// Tokens de diseño de AI Ticket It. Ningún componente usa colores o tamaños sueltos: todo sale de acá.
// Dirección: la interfaz es tinta sobre papel (sin color en botones ni menús) y el color lo ponen las
// fotos de los eventos y la entrada impresa. El verde del logo del TP aparece solo en detalles: el logo,
// el ícono de la pestaña activa y la marca de entrada válida. Nunca en textos sobre fondo claro.
// Contrastes calculados (WCAG AA): texto ≥ 4.5:1 sobre su fondo, bordes de campo ≥ 3:1.

// Claro: crema con una gota de beige (ni blanco, ni gris, ni marrón). Oscuro: carbonilla, un negro con
// una gota de gris (ni negro intenso ni gris). Las dos son cálidas para que combinen con el papel de la
// entrada.
const claro = {
  fondo: "#F5F0E6",
  superficie: "#EBE4D6", // un escalón de tono: chips, buscador, campos
  superficieAlta: "#FFFDF8", // paneles, hojas y tarjetas sobre el fondo
  esqueleto: "#DED6C6", // bloques de carga: se ven sobre el fondo y sobre la superficie
  tinta: "#1A1814",
  texto: "#1A1814",
  textoSecundario: "#5C5548",
  textoTenue: "#635B4D", // 5.3:1 sobre la superficie
  borde: "#E3DACB",
  bordeFuerte: "#CFC5B3",
  bordeCampo: "#878070", // 3.1:1 sobre la superficie (WCAG 1.4.11)
  // La acción principal es tinta: el color queda para lo que tiene significado.
  acento: "#1A1814",
  acentoPresionado: "#36322A",
  sobreAcento: "#FFFDF8",
  acentoSuave: "#EBE4D6",
  textoAcento: "#1A1814",
  // Verde del logo del TP: solo detalles (nunca para texto sobre fondo claro: no llega al contraste).
  marca: "#69D73C",
  sobreMarca: "#1A1814",
  peligro: "#B42318",
  peligroSuave: "#F8E3DC",
  exito: "#1E7A3C",
  aviso: "#9A4A08",
  imagenVacia: "#2B2724",
  sombra: "#000000",
  // Barra de pestañas pegada abajo y clara; la activa es una píldora de tinta con el ícono en verde.
  barra: "#FFFDF8",
  barraIcono: "#6F6757", // 5.5:1 sobre la barra
  barraActiva: "#1A1814",
  sobreBarraActiva: "#FFFDF8",
  iconoBarraActiva: "#69D73C", // 9.6:1 sobre la píldora
  // La entrada es papel también en modo oscuro.
  papel: "#FFFCF5",
  tintaPapel: "#1A1814",
  tintaPapelSecundaria: "#5B5548",
  // Tinta del sello de una entrada anulada: fija, porque el papel es claro en los dos modos.
  tintaSello: "#B42318",
  // Velo sobre la foto de la entrada para que el texto blanco se lea (≥ 4.5:1 sobre cualquier foto).
  velo: "rgba(10, 10, 10, 0.62)",
};

const oscuro = {
  fondo: "#1E1E1C",
  superficie: "#272725",
  superficieAlta: "#30302D",
  esqueleto: "#3A3A37",
  tinta: "#F2EEE6",
  texto: "#F2EEE6",
  textoSecundario: "#B9B4AA",
  textoTenue: "#A29D93", // 4.9:1 sobre la superficie alta
  borde: "#3A3A37",
  bordeFuerte: "#4A4A46",
  bordeCampo: "#7D7970", // 3.4:1 sobre la superficie
  acento: "#F2EEE6",
  acentoPresionado: "#D9D4CA",
  sobreAcento: "#1E1E1C",
  acentoSuave: "#30302D",
  textoAcento: "#F2EEE6",
  marca: "#69D73C",
  sobreMarca: "#1A1814",
  peligro: "#F97066",
  peligroSuave: "#3D2420",
  exito: "#4ADE80",
  aviso: "#FBBF24",
  imagenVacia: "#2B2724",
  sombra: "#000000",
  barra: "#272725",
  barraIcono: "#A29D93",
  barraActiva: "#45453F",
  sobreBarraActiva: "#F2EEE6",
  iconoBarraActiva: "#69D73C",
  papel: "#F4F0E6",
  tintaPapel: "#1A1814",
  tintaPapelSecundaria: "#5B5548",
  tintaSello: "#B42318",
  velo: "rgba(10, 10, 10, 0.62)",
};

// Estado de cada compra: siempre con color + ícono + texto (nunca solo color).
const estadosClaro = {
  PENDIENTE: { etiqueta: "Pendiente de pago", icono: "time-outline", fondo: "#F7E9CF", texto: "#6B3A06" },
  CONFIRMADA: {
    etiqueta: "Confirmada",
    icono: "checkmark-circle-outline",
    fondo: "#DCEFD9",
    texto: "#14532D",
  },
  UTILIZADA: { etiqueta: "Utilizada", icono: "ticket-outline", fondo: "#EBE4D6", texto: "#2E2A23" },
  CANCELADA: { etiqueta: "Cancelada", icono: "close-circle-outline", fondo: "#EBE4D6", texto: "#3F392F" },
  REEMBOLSADA: {
    etiqueta: "Reembolsada",
    icono: "return-down-back-outline",
    fondo: "#E2E8F2",
    texto: "#1E3A8A",
  },
};

const estadosOscuro = {
  PENDIENTE: { ...estadosClaro.PENDIENTE, fondo: "#3B2A0A", texto: "#FCD34D" },
  CONFIRMADA: { ...estadosClaro.CONFIRMADA, fondo: "#16301F", texto: "#86EFAC" },
  UTILIZADA: { ...estadosClaro.UTILIZADA, fondo: "#30302D", texto: "#E6E2DA" },
  CANCELADA: { ...estadosClaro.CANCELADA, fondo: "#30302D", texto: "#D6D1C8" },
  REEMBOLSADA: { ...estadosClaro.REEMBOLSADA, fondo: "#1C2742", texto: "#BFDBFE" },
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
// Las fotos de los eventos van más redondeadas: en una app de entradas son el contenido principal.
export const radio = { sm: 6, md: 8, lg: 8, xl: 12, foto: 16, pill: 999 };

// Mínimo recomendado para elementos táctiles (Apple HIG / Material).
export const AREA_TACTIL = 44;

// Alto de la barra de pestañas, sin contar el área segura de abajo.
export const ALTURA_BARRA = 60;

// Preferencia de tema: "sistema" (sigue al celular), "claro" u "oscuro". La guarda TemaProvider
// (context/TemaContext.jsx) y la elige la persona desde su perfil.
export const PREFERENCIAS_TEMA = ["sistema", "claro", "oscuro"];
export const TemaContext = createContext(null);

export function resolverTema(preferencia, esquemaDelSistema) {
  const esOscuro = preferencia === "sistema" ? esquemaDelSistema === "dark" : preferencia === "oscuro";
  return {
    esOscuro,
    colores: esOscuro ? oscuro : claro,
    estados: esOscuro ? estadosOscuro : estadosClaro,
  };
}

export function useTema() {
  const contexto = useContext(TemaContext);
  const esquemaDelSistema = useColorScheme();
  // Fuera del proveedor (no debería pasar) se sigue al sistema.
  return (
    contexto ?? {
      ...resolverTema("sistema", esquemaDelSistema),
      preferencia: "sistema",
      elegirTema: () => {},
    }
  );
}
