import { View } from "react-native";

import { formato } from "../utils/formato";
import { espacio, radio, useTema } from "../theme";
import { Estrellas, Texto } from "./ui";

export function ReseniaItem({ resenia }) {
  const { colores } = useTema();
  return (
    <View
      style={{
        gap: espacio.xs,
        padding: espacio.lg,
        borderRadius: radio.lg,
        backgroundColor: colores.superficie,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Estrellas valor={resenia.puntuacion} />
        <Texto variante="pequenio" color="tenue">
          {formato.fechaCorta(resenia.fecha)}
        </Texto>
      </View>
      {resenia.detalle.length > 0 && <Texto>{resenia.detalle}</Texto>}
      <Texto variante="pequenio" color="secundario">
        {resenia.comprador.nombre} · {resenia.evento.nombre}
      </Texto>
    </View>
  );
}
