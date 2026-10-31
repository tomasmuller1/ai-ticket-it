import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";

import { AvisoError, Boton, Cargando, EstadoError, Estrellas, Texto } from "../../../components/ui";
import { useCompra, useReseniar } from "../../../hooks/compras";
import { espacio, fuentes, radio, useTema } from "../../../theme";

const LARGO_MAXIMO = 500;
const SIGNIFICADO = ["", "Muy malo", "Malo", "Regular", "Bueno", "Excelente"];

// CU9: con la entrada utilizada, el comprador puntúa el evento y deja un comentario.
export default function Reseniar() {
  const { id } = useLocalSearchParams();
  const { colores } = useTema();
  const compra = useCompra(id);
  const reseniar = useReseniar(id);
  const [puntuacion, setPuntuacion] = useState(0);
  const [detalle, setDetalle] = useState("");
  const [faltaPuntaje, setFaltaPuntaje] = useState(false);

  if (compra.isPending) return <Cargando />;
  if (compra.isError) return <EstadoError error={compra.error} onReintentar={compra.refetch} />;

  function publicar() {
    if (puntuacion === 0) {
      setFaltaPuntaje(true);
      return;
    }
    reseniar.mutate({ puntuacion, detalle: detalle.trim() }, { onSuccess: () => router.back() });
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colores.fondo }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ title: "Calificar evento" }} />
      <ScrollView
        contentContainerStyle={{ padding: espacio.lg, gap: espacio.xl }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: espacio.xs }}>
          <Texto variante="titulo">¿Qué te pareció {compra.data.evento.nombre}?</Texto>
          <Texto color="secundario">
            Tu reseña ayuda a otras personas a elegir y suma a la reputación del organizador.
          </Texto>
        </View>

        <View style={{ alignItems: "center", gap: espacio.sm }}>
          <Estrellas
            valor={puntuacion}
            tamanio={40}
            onCambiar={(valor) => {
              setPuntuacion(valor);
              setFaltaPuntaje(false);
            }}
          />
          <Texto variante="cuerpoFuerte" color={faltaPuntaje ? "peligro" : "secundario"}>
            {faltaPuntaje ? "Elegí de 1 a 5 estrellas" : SIGNIFICADO[puntuacion] || "Tocá las estrellas"}
          </Texto>
        </View>

        <View style={{ gap: espacio.xs }}>
          <Texto variante="etiqueta">Comentario (opcional)</Texto>
          <TextInput
            value={detalle}
            onChangeText={setDetalle}
            placeholder="Contá qué te gustó y qué mejorarías"
            placeholderTextColor={colores.textoTenue}
            accessibilityLabel="Comentario"
            multiline
            maxLength={LARGO_MAXIMO}
            textAlignVertical="top"
            style={{
              minHeight: 120,
              padding: espacio.md,
              borderRadius: radio.md,
              borderWidth: 1,
              borderColor: colores.bordeCampo,
              backgroundColor: colores.superficie,
              fontFamily: fuentes.regular,
              fontSize: 16,
              color: colores.texto,
            }}
          />
          <Texto variante="pequenio" color="tenue" style={{ textAlign: "right" }}>
            {detalle.length}/{LARGO_MAXIMO}
          </Texto>
        </View>

        <AvisoError>{reseniar.error?.message}</AvisoError>

        <Boton titulo="Publicar reseña" onPress={publicar} cargando={reseniar.isPending} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
