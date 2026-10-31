import { Platform, Pressable, View } from "react-native";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";

import { formato } from "../utils/formato";
import { AREA_TACTIL, espacio, radio, useTema } from "../theme";
import { Texto } from "./ui";

// Selector nativo de fecha y hora. En web se usa SelectorFechaHora.web.jsx.
export function SelectorFechaHora({ etiqueta, valor, minimo, onCambiar, error }) {
  const { colores } = useTema();

  // En Android el sistema muestra primero el calendario y después el reloj.
  function abrirAndroid() {
    DateTimePickerAndroid.open({
      value: valor,
      mode: "date",
      minimumDate: minimo,
      onChange: (evento, fecha) => {
        if (evento.type !== "set") return;
        DateTimePickerAndroid.open({
          value: fecha,
          mode: "time",
          is24Hour: true,
          onChange: (eventoHora, fechaHora) => eventoHora.type === "set" && onCambiar(fechaHora),
        });
      },
    });
  }

  return (
    <View style={{ gap: espacio.xs }}>
      <Texto variante="etiqueta">{etiqueta}</Texto>
      {Platform.OS === "ios" ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            minHeight: AREA_TACTIL + 4,
            paddingHorizontal: espacio.sm,
            borderRadius: radio.md,
            borderWidth: error ? 2 : 1,
            borderColor: error ? colores.peligro : colores.borde,
            backgroundColor: colores.superficie,
          }}
        >
          <DateTimePicker
            value={valor}
            mode="datetime"
            display="compact"
            minimumDate={minimo}
            locale="es-AR"
            accentColor={colores.acento}
            onChange={(_evento, fecha) => fecha && onCambiar(fecha)}
          />
        </View>
      ) : (
        <Pressable
          onPress={abrirAndroid}
          accessibilityRole="button"
          accessibilityLabel={`${etiqueta}: ${formato.fecha(valor.toISOString())}`}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: espacio.sm,
            minHeight: AREA_TACTIL + 4,
            paddingHorizontal: espacio.md,
            borderRadius: radio.md,
            borderWidth: error ? 2 : 1,
            borderColor: error ? colores.peligro : colores.borde,
            backgroundColor: colores.superficie,
          }}
        >
          <Ionicons name="calendar-outline" size={20} color={colores.textoSecundario} />
          <Texto>{formato.fecha(valor.toISOString())}</Texto>
        </Pressable>
      )}
      {error && (
        <Texto variante="pequenio" color="peligro">
          {error}
        </Texto>
      )}
    </View>
  );
}
