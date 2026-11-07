import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import {
  AvisoError,
  BloqueCargando,
  Boton,
  EstadoError,
  Skeleton,
  Stepper,
  Texto,
} from "../../../components/ui";
import { useComprar } from "../../../hooks/compras";
import { useEventoParaComprar } from "../../../hooks/eventos";
import { formato } from "../../../utils/formato";
import { espacio, radio, useTema } from "../../../theme";
import { volver } from "../../../utils/navegacion";

// La API acepta hasta 10 entradas por compra.
const MAXIMO_POR_COMPRA = 10;
// Igual que en el detalle del evento: el comprador ve "Disponible" o, si quedan pocas, cuántas.
const POCAS_ENTRADAS = 10;

function disponibilidad(tipo) {
  if (tipo.disponibles === 0) return "Agotado";
  if (tipo.disponibles <= POCAS_ENTRADAS) {
    return `¡${tipo.disponibles === 1 ? "Queda" : "Quedan"} ${tipo.disponibles}!`;
  }
  return "Disponible";
}

function OpcionTipo({ tipo, seleccionado, primero, onPress }) {
  const { colores } = useTema();
  const agotado = tipo.disponibles === 0;
  const pocas = !agotado && tipo.disponibles <= POCAS_ENTRADAS;
  return (
    <Pressable
      onPress={onPress}
      disabled={agotado}
      accessibilityRole="radio"
      accessibilityState={{ checked: seleccionado, disabled: agotado }}
      accessibilityLabel={`${tipo.nombre}, ${formato.precio(tipo.precio)}, ${disponibilidad(tipo)}`}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: espacio.md,
        padding: espacio.lg,
        borderTopWidth: primero ? 0 : StyleSheet.hairlineWidth,
        borderTopColor: colores.borde,
        backgroundColor: seleccionado || pressed ? colores.superficie : "transparent",
        opacity: agotado ? 0.5 : 1,
      })}
    >
      <Ionicons
        name={seleccionado ? "radio-button-on" : "radio-button-off"}
        size={22}
        color={seleccionado ? colores.texto : colores.textoTenue}
      />
      <View style={{ flex: 1, gap: 2 }}>
        <Texto variante="cuerpoFuerte">{tipo.nombre}</Texto>
        {tipo.descripcion.length > 0 && (
          <Texto variante="pequenio" color="secundario">
            {tipo.descripcion}
          </Texto>
        )}
        <Texto variante="pequenio" style={{ color: pocas ? colores.aviso : colores.textoSecundario }}>
          {disponibilidad(tipo)}
        </Texto>
      </View>
      <Texto variante="cuerpoFuerte">{formato.precio(tipo.precio)}</Texto>
    </Pressable>
  );
}

function ComprarSkeleton() {
  const { colores } = useTema();
  return (
    <BloqueCargando
      etiqueta="Cargando las entradas"
      style={{ flex: 1, backgroundColor: colores.fondo, padding: espacio.lg, gap: espacio.md }}
    >
      <Skeleton alto={32} ancho="65%" />
      <Skeleton alto={16} ancho="40%" />
      <Skeleton alto={140} redondeo={radio.md} style={{ marginTop: espacio.xl }} />
      <Skeleton alto={72} redondeo={radio.md} />
    </BloqueCargando>
  );
}

// CU12: comprar eligiendo tipo de entrada y cantidad, sin superar el cupo disponible.
export default function Comprar() {
  const { id } = useLocalSearchParams();
  const { colores } = useTema();
  const insets = useSafeAreaInsets();
  const evento = useEventoParaComprar(id);
  const comprar = useComprar();
  const [tipoId, setTipoId] = useState(null);
  const [cantidad, setCantidad] = useState(1);

  if (evento.isPending) return <ComprarSkeleton />;
  if (evento.isLoadingError) {
    return (
      <EstadoError error={evento.error} onReintentar={evento.refetch} recurso="evento" onVolver={volver} />
    );
  }

  const e = evento.data;
  // Arranca con el primer tipo que tiene entradas: un paso menos para la mayoría de las compras.
  const elegidoId = tipoId ?? e.tiposEntrada.find((t) => t.disponibles > 0)?.id;
  const tipo = e.tiposEntrada.find((t) => t.id === elegidoId);
  const maximo = tipo ? Math.min(tipo.disponibles, MAXIMO_POR_COMPRA) : 1;
  // Si cambian los disponibles (por ejemplo, después de un SIN_CUPO), la cantidad se ajusta sola.
  const cantidadValida = Math.min(cantidad, maximo);
  const total = tipo ? tipo.precio * cantidadValida : 0;

  // Con la reserva en vuelo no se cambia nada: reset() desconecta la pantalla de ese pedido, que igual crearía la
  // reserva, y nadie navegaría hasta ella.
  function elegir(nuevo) {
    if (comprar.isPending) return;
    setTipoId(nuevo.id);
    setCantidad((actual) => Math.min(actual, Math.min(nuevo.disponibles, MAXIMO_POR_COMPRA)));
    comprar.reset();
  }

  // Otra cantidad es otra intención de reservar: el aviso de que "no se va a duplicar" ya no vale.
  function cambiarCantidad(nueva) {
    if (comprar.isPending) return;
    setCantidad(nueva);
    comprar.reset();
  }

  function confirmar() {
    comprar.mutate(
      { eventoId: e.id, tipoEntradaId: tipo.id, cantidad: cantidadValida },
      {
        onSuccess: (compra) => router.replace(`/compra/${compra.id}?pagar=1`),
        // Si alguien compró antes y ya no alcanza el cupo, se actualizan los disponibles.
        onError: (error) => error.codigo === "SIN_CUPO" && evento.refetch(),
      },
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colores.fondo }}>
      <Stack.Screen options={{ title: "Comprar entradas" }} />
      <ScrollView contentContainerStyle={{ padding: espacio.lg, gap: espacio.xl, paddingBottom: 200 }}>
        <View style={{ gap: espacio.xs }}>
          <Texto variante="titulo" accessibilityRole="header">
            {e.nombre}
          </Texto>
          <View>
            <Texto variante="etiqueta">{formato.fecha(e.fecha)}</Texto>
            <Texto variante="pequenio" color="secundario">
              {e.lugar}
            </Texto>
          </View>
        </View>

        <View style={{ gap: espacio.md }}>
          <Texto variante="subtitulo" accessibilityRole="header">
            Elegí tu entrada
          </Texto>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel="Tipo de entrada"
            style={{ borderRadius: radio.md, backgroundColor: colores.superficieAlta, overflow: "hidden" }}
          >
            {e.tiposEntrada.map((t, indice) => (
              <OpcionTipo
                key={t.id}
                tipo={t}
                primero={indice === 0}
                seleccionado={t.id === elegidoId}
                onPress={() => elegir(t)}
              />
            ))}
          </View>
        </View>

        {tipo && (
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              padding: espacio.lg,
              borderRadius: radio.md,
              backgroundColor: colores.superficieAlta,
            }}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Texto variante="cuerpoFuerte">Cantidad</Texto>
              <Texto variante="pequenio" color="secundario">
                {maximo === MAXIMO_POR_COMPRA
                  ? `Hasta ${MAXIMO_POR_COMPRA} por compra`
                  : `${maximo === 1 ? "Queda" : "Quedan"} ${maximo}`}
              </Texto>
            </View>
            <Stepper
              valor={cantidadValida}
              maximo={maximo}
              onCambiar={cambiarCantidad}
              etiqueta="Cantidad de entradas"
            />
          </View>
        )}

        <AvisoError>
          {comprar.error?.status === 0
            ? "No pudimos confirmar tu reserva. Tocá Reservar de nuevo: no se va a duplicar."
            : comprar.error?.message}
        </AvisoError>
      </ScrollView>

      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          gap: espacio.md,
          paddingHorizontal: espacio.lg,
          paddingTop: espacio.lg,
          paddingBottom: insets.bottom + espacio.md,
          backgroundColor: colores.superficieAlta,
          borderTopLeftRadius: radio.xl + espacio.sm,
          borderTopRightRadius: radio.xl + espacio.sm,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
          <View>
            <Texto color="secundario">Total</Texto>
            {tipo && (
              <Texto variante="pequenio" color="secundario">
                {cantidadValida} × {formato.precio(tipo.precio)}
              </Texto>
            )}
          </View>
          <Texto variante="titulo" accessibilityLiveRegion="polite">
            {tipo ? formato.monto(total) : "—"}
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
          Reservás ahora y pagás en el paso siguiente.
        </Texto>
      </View>
    </View>
  );
}
