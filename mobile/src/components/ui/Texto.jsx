import { Text } from "react-native";

import { tipografia, useTema } from "../../theme";

const COLORES = {
  principal: "texto",
  secundario: "textoSecundario",
  tenue: "textoTenue",
  acento: "textoAcento",
  peligro: "peligro",
  sobreAcento: "sobreAcento",
};

// Todo texto de la app pasa por acá: variante tipográfica + color del tema.
export function Texto({ variante = "cuerpo", color = "principal", style, ...props }) {
  const { colores } = useTema();
  return <Text style={[tipografia[variante], { color: colores[COLORES[color]] }, style]} {...props} />;
}
