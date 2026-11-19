import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { ROLES } from "../utils/roles";
import { espacio, radio, useTema } from "../theme";
import { Texto } from "./ui";

const OPCIONES = [
  {
    rol: ROLES.COMPRADOR,
    icono: "ticket-outline",
    titulo: "Quiero comprar entradas",
    texto: "Explorá eventos, comprá tus entradas y guardá tus favoritos.",
  },
  {
    rol: ROLES.ORGANIZADOR,
    icono: "megaphone-outline",
    titulo: "Organizo eventos",
    texto: "Publicá tus eventos, seguí las ventas y respondé a tus compradores.",
  },
];

// Tipo de cuenta al registrarse: dos tarjetas que se eligen como radio buttons. El rol no se cambia después,
// así que cada tarjeta cuenta qué se puede hacer con esa cuenta. El `ref` va al texto del error, para que
// `useFocoEnError` lleve el foco del lector ahí.
export function SelectorRol({ valor, onCambiar, error, ref }) {
  const { colores } = useTema();
  return (
    <View style={{ gap: espacio.sm }}>
      <Texto variante="cuerpoFuerte">¿Cómo vas a usar AI Ticket It? *</Texto>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="Tipo de cuenta, obligatorio"
        style={{ gap: espacio.sm }}
      >
        {OPCIONES.map((opcion) => {
          const elegida = opcion.rol === valor;
          const colorTexto = elegida ? colores.fondo : colores.texto;
          return (
            <Pressable
              key={opcion.rol}
              onPress={() => onCambiar(opcion.rol)}
              accessibilityRole="radio"
              accessibilityLabel={opcion.titulo}
              accessibilityHint={opcion.texto}
              accessibilityState={{ checked: elegida }}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: espacio.md,
                padding: espacio.lg,
                borderRadius: radio.md,
                backgroundColor: elegida ? colores.tinta : pressed ? colores.borde : colores.superficie,
              })}
            >
              <Ionicons name={opcion.icono} size={24} color={colorTexto} />
              <View style={{ flex: 1, gap: 2 }}>
                <Texto variante="cuerpoFuerte" style={{ color: colorTexto }}>
                  {opcion.titulo}
                </Texto>
                <Texto
                  variante="pequenio"
                  style={{ color: elegida ? colores.fondo : colores.textoSecundario }}
                >
                  {opcion.texto}
                </Texto>
              </View>
              <Ionicons
                name={elegida ? "checkmark-circle" : "ellipse-outline"}
                size={22}
                color={elegida ? colores.fondo : colores.bordeCampo}
              />
            </Pressable>
          );
        })}
      </View>
      {error ? (
        <View style={{ flexDirection: "row", gap: espacio.xs, alignItems: "center" }}>
          <Ionicons name="alert-circle" size={16} color={colores.peligro} />
          <Texto ref={ref} variante="pequenio" color="peligro" accessibilityLiveRegion="polite">
            {error}
          </Texto>
        </View>
      ) : null}
    </View>
  );
}
