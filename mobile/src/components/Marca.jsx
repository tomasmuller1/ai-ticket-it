import { View } from "react-native";
import Svg, { Path, Polyline, Line, Text as TextoSvg } from "react-native-svg";

import { espacio, fuentes, useTema } from "../theme";
import { Texto } from "./ui";

// Proporciones del logo del enunciado (ticket de 236 × 133). Las dos muescas tienen el mismo radio y
// el tilde queda lejos de la muesca derecha (en el original la invadía y la deformaba).
const ANCHO = 236;
const ALTO = 133;
const ESQUINA = 14;
const MUESCA = 22;
const MEDIO = ALTO / 2;

const CONTORNO = [
  `M ${ESQUINA} 0 H ${ANCHO - ESQUINA}`,
  `A ${ESQUINA} ${ESQUINA} 0 0 1 ${ANCHO} ${ESQUINA}`,
  `V ${MEDIO - MUESCA}`,
  `A ${MUESCA} ${MUESCA} 0 0 0 ${ANCHO} ${MEDIO + MUESCA}`,
  `V ${ALTO - ESQUINA}`,
  `A ${ESQUINA} ${ESQUINA} 0 0 1 ${ANCHO - ESQUINA} ${ALTO}`,
  `H ${ESQUINA}`,
  `A ${ESQUINA} ${ESQUINA} 0 0 1 0 ${ALTO - ESQUINA}`,
  `V ${MEDIO + MUESCA}`,
  `A ${MUESCA} ${MUESCA} 0 0 0 0 ${MEDIO - MUESCA}`,
  `V ${ESQUINA}`,
  `A ${ESQUINA} ${ESQUINA} 0 0 1 ${ESQUINA} 0 Z`,
].join(" ");

// El ticket verde con "AI", el troquel punteado y el tilde de entrada válida.
export function LogoTicket({ ancho = 48 }) {
  const { colores } = useTema();
  return (
    <Svg width={ancho} height={(ancho * ALTO) / ANCHO} viewBox={`0 0 ${ANCHO} ${ALTO}`}>
      <Path d={CONTORNO} fill={colores.marca} />
      <TextoSvg
        x={92}
        y={89}
        fontSize={64}
        fontFamily={fuentes.negrita}
        fontWeight="bold"
        fill="#FFFFFF"
        textAnchor="middle"
      >
        AI
      </TextoSvg>
      <Line
        x1={166}
        y1={16}
        x2={166}
        y2={ALTO - 16}
        stroke="#FFFFFF"
        strokeWidth={7}
        strokeLinecap="round"
        strokeDasharray="9 11"
      />
      <Polyline
        points={`184,${MEDIO} 191,${MEDIO + 7} 203,${MEDIO - 7}`}
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// El nombre como en el logo: "Ticket" en tinta e "It" en el verde de la marca.
function Nombre({ tamanio }) {
  const { colores } = useTema();
  return (
    <Texto
      style={{
        fontFamily: fuentes.negrita,
        fontSize: tamanio,
        lineHeight: tamanio * 1.1,
        letterSpacing: -0.5,
      }}
    >
      Ticket{" "}
      <Texto style={{ fontFamily: fuentes.negrita, fontSize: tamanio, color: colores.marca }}>It</Texto>
    </Texto>
  );
}

// La marca de AI Ticket It. "chica" para encabezados (ticket y nombre en una línea) y "grande" para la
// portada del login, con la frase del enunciado.
export function Marca({ variante = "chica" }) {
  const { colores } = useTema();

  if (variante === "grande") {
    return (
      <View
        accessible
        accessibilityLabel="AI Ticket It, entradas a un click"
        style={{ alignItems: "center" }}
      >
        <LogoTicket ancho={132} />
        <View style={{ marginTop: espacio.xl }}>
          <Nombre tamanio={44} />
        </View>
        <Texto
          variante="pequenio"
          style={{ marginTop: espacio.sm, color: colores.textoSecundario, letterSpacing: 3, fontSize: 13 }}
        >
          ENTRADAS A UN CLICK
        </Texto>
      </View>
    );
  }

  return (
    <View
      accessible
      accessibilityLabel="AI Ticket It"
      style={{ flexDirection: "row", alignItems: "center", gap: espacio.sm }}
    >
      <LogoTicket ancho={34} />
      <Nombre tamanio={19} />
    </View>
  );
}
