import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useAvisos } from "../../../components/Avisos";
import { Panel } from "../../../components/Panel";
import { MiniTarjeta, nombreTarjeta } from "../../../components/VistaTarjeta";
import { Boton, EstadoError, EstadoVacio, Skeleton, Texto } from "../../../components/ui";
import { useQuitarTarjeta, useTarjetas } from "../../../hooks/tarjetas";
import { AREA_TACTIL, espacio, radio, useTema } from "../../../theme";

// Una tarjeta guardada. Quitarla pide confirmación en la misma fila, sin diálogo.
function Tarjeta({ tarjeta }) {
  const { colores } = useTema();
  const { avisar } = useAvisos();
  const quitar = useQuitarTarjeta();
  const [confirmando, setConfirmando] = useState(false);
  const nombre = nombreTarjeta(tarjeta);

  function quitarTarjeta() {
    quitar.mutate(tarjeta.id, {
      onSuccess: () => avisar({ tipo: "exito", titulo: "Quitaste la tarjeta", mensaje: nombre }),
      onError: (error) => {
        setConfirmando(false);
        avisar({ tipo: "error", titulo: "No pudimos quitar la tarjeta", mensaje: error.message });
      },
    });
  }

  return (
    <View style={{ padding: espacio.lg, gap: espacio.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: espacio.md }}>
        <MiniTarjeta marca={tarjeta.marca} />
        <View
          accessible
          accessibilityLabel={`${tarjeta.marca} terminada en ${tarjeta.ultimos4}, vence ${tarjeta.vencimiento}, a nombre de ${tarjeta.titular}`}
          style={{ flex: 1, gap: 2 }}
        >
          <Texto variante="cuerpoFuerte">{nombre}</Texto>
          <Texto variante="pequenio" color="secundario" numberOfLines={1}>
            {tarjeta.titular}
          </Texto>
          <Texto variante="pequenio" color="secundario">
            Vence {tarjeta.vencimiento}
          </Texto>
        </View>
        {!confirmando && (
          <Pressable
            onPress={() => setConfirmando(true)}
            accessibilityRole="button"
            accessibilityLabel={`Quitar ${tarjeta.marca} terminada en ${tarjeta.ultimos4}`}
            style={({ pressed }) => ({
              width: AREA_TACTIL,
              height: AREA_TACTIL,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: radio.pill,
              backgroundColor: pressed ? colores.superficie : "transparent",
            })}
          >
            <Ionicons name="trash-outline" size={22} color={colores.textoSecundario} />
          </Pressable>
        )}
      </View>
      {confirmando && (
        <View style={{ gap: espacio.sm }}>
          <Texto>¿Quitar esta tarjeta? Para volver a usarla vas a tener que cargarla de nuevo.</Texto>
          <View style={{ flexDirection: "row", gap: espacio.sm }}>
            <Boton
              titulo="Mantener"
              variante="secundario"
              style={{ flex: 1 }}
              onPress={() => setConfirmando(false)}
            />
            <Boton
              titulo="Quitar"
              variante="peligro"
              style={{ flex: 1 }}
              cargando={quitar.isPending}
              onPress={quitarTarjeta}
            />
          </View>
        </View>
      )}
    </View>
  );
}

// Medios de pago guardados: con qué tarjetas se pueden pagar las entradas.
export default function MediosDePago() {
  const { colores } = useTema();
  const tarjetas = useTarjetas();

  if (tarjetas.isPending) {
    return (
      <View style={{ flex: 1, backgroundColor: colores.fondo, padding: espacio.lg, gap: espacio.md }}>
        <Skeleton alto={72} redondeo={radio.md} />
        <Skeleton alto={72} redondeo={radio.md} />
      </View>
    );
  }
  if (tarjetas.isError) return <EstadoError error={tarjetas.error} onReintentar={tarjetas.refetch} />;

  const agregar = () => router.push("/perfil/tarjetas/nueva");
  if (tarjetas.data.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colores.fondo }}>
        <EstadoVacio
          icono="card-outline"
          titulo="Todavía no guardaste tarjetas"
          descripcion="Guardá una para pagar tus entradas en un toque."
          accion={{ titulo: "Agregar tarjeta", onPress: agregar }}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colores.fondo }}
      contentContainerStyle={{ padding: espacio.lg, gap: espacio.lg, paddingBottom: espacio.xxxl }}
    >
      <Panel>
        {tarjetas.data.map((tarjeta) => (
          <Tarjeta key={tarjeta.id} tarjeta={tarjeta} />
        ))}
      </Panel>
      <Boton titulo="Agregar tarjeta" icono="add" variante="secundario" onPress={agregar} />
      <Texto variante="pequenio" color="secundario">
        Guardamos solo la marca, los últimos 4 dígitos y el vencimiento. El número completo y el código quedan
        en la pasarela de pagos.
      </Texto>
    </ScrollView>
  );
}
