import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { AvisoError, Boton, Cargando, EstadoError, Stepper, Texto } from "../../../components/ui";
import { useComprar } from "../../../hooks/compras";
import { useEvento } from "../../../hooks/eventos";
import { formato } from "../../../utils/formato";
import { espacio, radio, useTema } from "../../../theme";

// La API acepta hasta 10 entradas por compra.
const MAXIMO_POR_COMPRA = 10;

function OpcionTipo({ tipo, seleccionado, onPress }) {
  const { colores } = useTema();
  const agotado = tipo.disponibles === 0;
  return (
    <Pressable
      onPress={onPress}
      disabled={agotado}
      accessibilityRole="radio"
      accessibilityState={{ checked: seleccionado, disabled: agotado }}
      accessibilityLabel={`${tipo.nombre}, ${formato.precio(tipo.precio)}, ${agotado ? "agotado" : `${tipo.disponibles} disponibles`}`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: espacio.md,
        padding: espacio.lg,
        borderRadius: radio.lg,
        borderWidth: seleccionado ? 2 : 1,
        borderColor: seleccionado ? colores.acento : colores.borde,
        backgroundColor: seleccionado ? colores.acentoSuave : colores.fondo,
        opacity: agotado ? 0.5 : 1,
      }}
    >
      <Ionicons
        name={seleccionado ? "radio-button-on" : "radio-button-off"}
        size={22}
        color={seleccionado ? colores.acento : colores.textoTenue}
      />
      <View style={{ flex: 1 }}>
        <Texto variante="cuerpoFuerte">{tipo.nombre}</Texto>
        <Texto variante="pequenio" color="secundario">
          {agotado
            ? "Agotado"
            : `${tipo.disponibles} ${tipo.disponibles === 1 ? "disponible" : "disponibles"}`}
        </Texto>
      </View>
      <Texto variante="cuerpoFuerte">{formato.precio(tipo.precio)}</Texto>
    </Pressable>
  );
}

// CU12: comprar eligiendo tipo de entrada y cantidad, sin superar el cupo disponible.
export default function Comprar() {
  const { id } = useLocalSearchParams();
  const { colores } = useTema();
  const insets = useSafeAreaInsets();
  const evento = useEvento(id);
  const comprar = useComprar();
  const [tipoId, setTipoId] = useState(null);
  const [cantidad, setCantidad] = useState(1);

  if (evento.isPending) return <Cargando />;
  if (evento.isError) return <EstadoError error={evento.error} onReintentar={evento.refetch} />;

  const e = evento.data;
  // Arranca con el primer tipo que tiene entradas: un paso menos para la mayoría de las compras.
  const elegidoId = tipoId ?? e.tiposEntrada.find((t) => t.disponibles > 0)?.id;
  const tipo = e.tiposEntrada.find((t) => t.id === elegidoId);
  const maximo = tipo ? Math.min(tipo.disponibles, MAXIMO_POR_COMPRA) : 1;
  // Si cambian los disponibles (por ejemplo, después de un SIN_CUPO), la cantidad se ajusta sola.
  const cantidadValida = Math.min(cantidad, maximo);
  const total = tipo ? tipo.precio * cantidadValida : 0;

  function elegir(nuevo) {
    setTipoId(nuevo.id);
    setCantidad((actual) => Math.min(actual, Math.min(nuevo.disponibles, MAXIMO_POR_COMPRA)));
    comprar.reset();
  }

  function confirmar() {
    comprar.mutate(
      { eventoId: e.id, tipoEntradaId: tipo.id, cantidad: cantidadValida },
      {
        onSuccess: (compra) => router.replace(`/compra/${compra.id}`),
        // Si alguien compró antes y ya no alcanza el cupo, se actualizan los disponibles.
        onError: (error) => error.codigo === "SIN_CUPO" && evento.refetch(),
      },
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colores.fondo }}>
      <Stack.Screen options={{ title: "Comprar entradas" }} />
      <ScrollView contentContainerStyle={{ padding: espacio.lg, gap: espacio.xl, paddingBottom: 160 }}>
        <View style={{ gap: espacio.xs }}>
          <Texto variante="titulo">{e.nombre}</Texto>
          <Texto color="secundario">
            {formato.fecha(e.fecha)} · {e.lugar}
          </Texto>
        </View>

        <View style={{ gap: espacio.md }} accessibilityRole="radiogroup">
          <Texto variante="subtitulo" accessibilityRole="header">
            Elegí tu entrada
          </Texto>
          {e.tiposEntrada.map((t) => (
            <OpcionTipo key={t.id} tipo={t} seleccionado={t.id === elegidoId} onPress={() => elegir(t)} />
          ))}
        </View>

        {tipo && (
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              padding: espacio.lg,
              borderRadius: radio.lg,
              backgroundColor: colores.superficie,
            }}
          >
            <View>
              <Texto variante="cuerpoFuerte">Cantidad</Texto>
              <Texto variante="pequenio" color="secundario">
                Máximo {maximo} {maximo === 1 ? "entrada" : "entradas"}
              </Texto>
            </View>
            <Stepper valor={cantidadValida} maximo={maximo} onCambiar={setCantidad} />
          </View>
        )}

        <AvisoError>{comprar.error?.message}</AvisoError>
      </ScrollView>

      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          gap: espacio.md,
          paddingHorizontal: espacio.lg,
          paddingTop: espacio.md,
          paddingBottom: insets.bottom + espacio.md,
          backgroundColor: colores.fondo,
          borderTopWidth: 1,
          borderTopColor: colores.borde,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
          <Texto color="secundario">Total</Texto>
          <Texto variante="titulo" accessibilityLiveRegion="polite">
            {tipo ? formato.precio(total) : "—"}
          </Texto>
        </View>
        <Boton
          titulo={
            tipo
              ? `Reservar ${cantidadValida} ${cantidadValida === 1 ? "entrada" : "entradas"}`
              : "No quedan entradas"
          }
          deshabilitado={!tipo}
          cargando={comprar.isPending}
          onPress={confirmar}
        />
        <Texto variante="pequenio" color="tenue" style={{ textAlign: "center" }}>
          Reservamos tus entradas y en el paso siguiente las pagás.
        </Texto>
      </View>
    </View>
  );
}
