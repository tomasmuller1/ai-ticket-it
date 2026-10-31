import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { formato } from "../utils/formato";
import { espacio, radio, useTema } from "../theme";
import { Texto } from "./ui";

// Línea de tiempo de los cambios de estado de una compra (CambioEstadoCompra).
export function Historial({ historial }) {
  const { estados, colores } = useTema();
  return (
    <View>
      {historial.map((cambio, i) => {
        const estilo = estados[cambio.estado];
        const ultimo = i === historial.length - 1;
        return (
          <View
            key={`${cambio.estado}-${cambio.fechaHora}`}
            style={{ flexDirection: "row", gap: espacio.md }}
          >
            <View style={{ alignItems: "center" }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: radio.pill,
                  backgroundColor: estilo.fondo,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name={estilo.icono} size={16} color={estilo.texto} />
              </View>
              {!ultimo && (
                <View style={{ width: 2, flex: 1, minHeight: 16, backgroundColor: colores.borde }} />
              )}
            </View>
            <View style={{ flex: 1, paddingBottom: ultimo ? 0 : espacio.lg, gap: 2 }}>
              <Texto variante="cuerpoFuerte">{estilo.etiqueta}</Texto>
              <Texto variante="pequenio" color="secundario">
                {formato.fecha(cambio.fechaHora)}
                {cambio.quien ? ` · ${cambio.quien.nombre}` : " · Automático"}
              </Texto>
            </View>
          </View>
        );
      })}
    </View>
  );
}
