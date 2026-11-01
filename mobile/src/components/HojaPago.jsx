import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";

import { usePagar } from "../hooks/compras";
import { useMovimientoReducido } from "../hooks/useMovimientoReducido";
import { useTarjetas } from "../hooks/tarjetas";
import { formato } from "../utils/formato";
import { AREA_TACTIL, espacio, radio, tipografia, useTema } from "../theme";
import { useAvisos } from "./Avisos";
import { FormularioTarjeta } from "./FormularioTarjeta";
import { MiniTarjeta, nombreTarjeta } from "./VistaTarjeta";
import { AvisoError, Boton, Skeleton, Texto } from "./ui";

// El anillo se ve aunque la pasarela responda al instante: un pago que "no tarda nada" no da confianza.
const DURACION_MINIMA_MS = 1100;
const CIERRE_TRAS_EXITO_MS = 1500;
const TAMANIO_PROGRESO = 80;

// Fallas de un servicio del que depende el pago (no de lo que hizo la persona): se cierra la hoja, se
// avisa abajo y el resto de la app sigue andando. La reserva no se pierde.
const FALLAS_DEL_SERVICIO = {
  PASARELA_NO_DISPONIBLE:
    "Los pagos no están disponibles en este momento. Tu reserva sigue en pie: probá de nuevo en unos minutos.",
  SIN_CONEXION: "No hay conexión. Tu reserva sigue en pie: probá de nuevo cuando vuelva.",
};

const TITULOS = { resumen: "Confirmá el pago", elegir: "Pagar con", agregar: "Nueva tarjeta" };

const esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

function vibrar(tipo) {
  if (Platform.OS !== "web") Haptics.notificationAsync(tipo);
}

// Anillo que gira mientras se cobra y que, cuando el pago sale, se llena de verde con un tilde.
function Progreso({ listo, movimientoReducido }) {
  const { colores } = useTema();
  const [giro] = useState(() => new Animated.Value(0));
  const [relleno] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const vuelta = Animated.loop(
      Animated.timing(giro, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true }),
    );
    vuelta.start();
    return () => vuelta.stop();
  }, [giro]);

  useEffect(() => {
    if (!listo) return;
    const animacion = movimientoReducido
      ? Animated.timing(relleno, { toValue: 1, duration: 150, useNativeDriver: true })
      : Animated.spring(relleno, { toValue: 1, friction: 5, tension: 140, useNativeDriver: true });
    animacion.start();
  }, [listo, movimientoReducido, relleno]);

  const circulo = { ...StyleSheet.absoluteFillObject, borderRadius: TAMANIO_PROGRESO / 2 };
  return (
    <View
      accessible
      accessibilityRole={listo ? "image" : "progressbar"}
      accessibilityLabel={listo ? "Pago confirmado" : "Procesando el pago"}
      style={{ width: TAMANIO_PROGRESO, height: TAMANIO_PROGRESO }}
    >
      {!listo && (
        <Animated.View
          style={{
            ...circulo,
            borderWidth: 4,
            borderColor: colores.pista,
            borderTopColor: colores.acento,
            transform: [
              { rotate: giro.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) },
            ],
          }}
        />
      )}
      {listo && (
        <Animated.View
          style={{
            ...circulo,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colores.marca,
            opacity: relleno,
            transform: [{ scale: relleno.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
          }}
        >
          <Ionicons name="checkmark" size={44} color={colores.sobreMarca} />
        </Animated.View>
      )}
    </View>
  );
}

function BotonIcono({ icono, etiqueta, onPress }) {
  const { colores } = useTema();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      style={({ pressed }) => ({
        width: AREA_TACTIL,
        height: AREA_TACTIL,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radio.pill,
        backgroundColor: pressed ? colores.superficie : "transparent",
      })}
    >
      <Ionicons name={icono} size={24} color={colores.texto} />
    </Pressable>
  );
}

// Una tarjeta guardada como fila tocable: miniatura, "Visa •••• 4242" y el vencimiento.
function FilaTarjeta({ tarjeta, derecha, onPress, ...accesibilidad }) {
  const { colores } = useTema();
  return (
    <Pressable
      onPress={onPress}
      {...accesibilidad}
      style={({ pressed }) => ({
        minHeight: AREA_TACTIL + 20,
        flexDirection: "row",
        alignItems: "center",
        gap: espacio.md,
        paddingHorizontal: espacio.md,
        borderRadius: radio.md,
        backgroundColor: pressed ? colores.bordeFuerte : colores.superficie,
      })}
    >
      <MiniTarjeta marca={tarjeta.marca} />
      <View style={{ flex: 1 }}>
        <Texto variante="cuerpoFuerte">{nombreTarjeta(tarjeta)}</Texto>
        <Texto variante="pequenio" color="secundario">
          Vence {tarjeta.vencimiento}
        </Texto>
      </View>
      {derecha}
    </Pressable>
  );
}

function Resumen({ compra, tarjeta, error, onCambiar, onPagar }) {
  const { colores } = useTema();
  const { cantidad } = compra;
  return (
    <>
      <View style={{ gap: espacio.xs }}>
        <Texto variante="cuerpoFuerte" numberOfLines={2}>
          {compra.evento.nombre}
        </Texto>
        <Texto color="secundario">
          {cantidad} {cantidad === 1 ? "entrada" : "entradas"} {compra.tipoEntrada.nombre}
        </Texto>
      </View>

      <View style={{ gap: espacio.sm }}>
        <Texto variante="etiqueta" color="secundario">
          Pagás con
        </Texto>
        <FilaTarjeta
          tarjeta={tarjeta}
          onPress={onCambiar}
          accessibilityRole="button"
          accessibilityLabel={`Pagás con ${tarjeta.marca} terminada en ${tarjeta.ultimos4}. Cambiar tarjeta`}
          derecha={
            <View style={{ flexDirection: "row", alignItems: "center", gap: espacio.xs }}>
              <Texto variante="etiqueta">Cambiar</Texto>
              <Ionicons name="chevron-forward" size={18} color={colores.textoSecundario} />
            </View>
          }
        />
      </View>

      <View
        accessible
        accessibilityLabel={`Total: ${formato.monto(compra.total)}`}
        style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}
      >
        <Texto variante="cuerpoFuerte">Total</Texto>
        <Texto style={tipografia.titulo}>{formato.monto(compra.total)}</Texto>
      </View>

      <AvisoError>{error}</AvisoError>
      <Boton titulo={`Pagar ${formato.monto(compra.total)}`} onPress={onPagar} />
      <Texto variante="pequenio" color="secundario" style={{ textAlign: "center" }}>
        Pago simulado: no se cobra dinero real.
      </Texto>
    </>
  );
}

function Elegir({ tarjetas, elegidaId, onElegir, onAgregar }) {
  const { colores } = useTema();
  return (
    <View style={{ gap: espacio.sm }} accessibilityRole="radiogroup">
      {tarjetas.map((tarjeta) => {
        const elegida = tarjeta.id === elegidaId;
        return (
          <FilaTarjeta
            key={tarjeta.id}
            tarjeta={tarjeta}
            onPress={() => onElegir(tarjeta.id)}
            accessibilityRole="radio"
            accessibilityState={{ checked: elegida }}
            accessibilityLabel={`${tarjeta.marca} terminada en ${tarjeta.ultimos4}, vence ${tarjeta.vencimiento}`}
            derecha={
              <Ionicons
                name={elegida ? "radio-button-on" : "radio-button-off"}
                size={22}
                color={elegida ? colores.acento : colores.textoTenue}
              />
            }
          />
        );
      })}
      <Boton titulo="Agregar otra tarjeta" variante="fantasma" icono="add" onPress={onAgregar} />
    </View>
  );
}

function Procesando({ compra, tarjeta, listo, movimientoReducido }) {
  return (
    <View style={{ alignItems: "center", gap: espacio.lg, paddingVertical: espacio.xxl }}>
      <Progreso listo={listo} movimientoReducido={movimientoReducido} />
      <View style={{ alignItems: "center", gap: espacio.xs }} accessibilityLiveRegion="polite">
        <Texto variante="subtitulo">{listo ? "Pago confirmado" : "Procesando el pago"}</Texto>
        <Texto color="secundario" style={{ textAlign: "center" }}>
          {listo
            ? "Tus entradas ya son válidas."
            : `${formato.monto(compra.total)} con ${nombreTarjeta(tarjeta)}`}
        </Texto>
      </View>
    </View>
  );
}

// Hoja de pago que sube desde abajo: resumen con la tarjeta elegida, cambio de tarjeta o alta de una
// nueva, y después el cobro con un anillo que termina en un tilde verde. Se monta al abrirla y avisa con
// `onCerrar` cuando terminó de bajar.
export function HojaPago({ compra, onCerrar }) {
  const { colores } = useTema();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { avisar } = useAvisos();
  const movimientoReducido = useMovimientoReducido();
  const tarjetas = useTarjetas();
  const pagar = usePagar();
  const [paso, setPaso] = useState("resumen");
  const [tarjetaId, setTarjetaId] = useState(null);
  const [error, setError] = useState(null);
  const [entrada] = useState(() => new Animated.Value(0));
  const temporizador = useRef(null);

  useEffect(() => {
    Animated.timing(entrada, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    return () => clearTimeout(temporizador.current);
  }, [entrada]);

  const lista = tarjetas.data ?? [];
  const tarjeta = lista.find((t) => t.id === tarjetaId) ?? lista[0];
  const cobrando = paso === "procesando" || paso === "listo";
  // Sin tarjetas guardadas, lo primero es agregar una.
  const pasoVisible = !cobrando && tarjetas.isSuccess && !tarjeta ? "agregar" : paso;

  function salir(despues) {
    Animated.timing(entrada, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      onCerrar();
      despues?.();
    });
  }

  function cerrar() {
    if (!cobrando) salir();
  }

  async function confirmarPago() {
    setError(null);
    setPaso("procesando");
    AccessibilityInfo.announceForAccessibility("Procesando el pago");
    const [falla] = await Promise.all([
      pagar.mutateAsync({ id: compra.id, tarjetaId: tarjeta.id }).then(
        () => null,
        (e) => e,
      ),
      esperar(DURACION_MINIMA_MS),
    ]);

    if (!falla) {
      setPaso("listo");
      vibrar(Haptics.NotificationFeedbackType.Success);
      AccessibilityInfo.announceForAccessibility("Pago confirmado. Tus entradas ya son válidas.");
      temporizador.current = setTimeout(() => salir(), CIERRE_TRAS_EXITO_MS);
      return;
    }
    vibrar(Haptics.NotificationFeedbackType.Error);
    const mensajeServicio = FALLAS_DEL_SERVICIO[falla.codigo];
    if (mensajeServicio) {
      salir(() => avisar({ tipo: "error", titulo: "No pudimos cobrar", mensaje: mensajeServicio }));
      return;
    }
    setError(falla.message);
    setPaso("resumen");
  }

  function alGuardarTarjeta(nueva) {
    setTarjetaId(nueva.id);
    setPaso("resumen");
  }

  let contenido;
  if (cobrando) {
    contenido = (
      <Procesando
        compra={compra}
        tarjeta={tarjeta}
        listo={paso === "listo"}
        movimientoReducido={movimientoReducido}
      />
    );
  } else if (tarjetas.isPending) {
    contenido = (
      <View style={{ gap: espacio.lg }}>
        <Skeleton alto={44} ancho="70%" />
        <Skeleton alto={64} redondeo={radio.md} />
        <Skeleton alto={52} redondeo={radio.md} />
      </View>
    );
  } else if (tarjetas.isError) {
    contenido = (
      <View style={{ gap: espacio.md }}>
        <AvisoError>No pudimos cargar tus tarjetas. {tarjetas.error.message}</AvisoError>
        <Boton titulo="Reintentar" variante="secundario" onPress={() => tarjetas.refetch()} />
      </View>
    );
  } else if (pasoVisible === "agregar") {
    contenido = (
      <FormularioTarjeta
        tituloBoton={tarjeta ? "Guardar tarjeta" : "Guardar y seguir"}
        onGuardada={alGuardarTarjeta}
      />
    );
  } else if (pasoVisible === "elegir") {
    contenido = (
      <Elegir
        tarjetas={lista}
        elegidaId={tarjeta.id}
        onElegir={(id) => {
          setTarjetaId(id);
          setPaso("resumen");
        }}
        onAgregar={() => setPaso("agregar")}
      />
    );
  } else {
    contenido = (
      <Resumen
        compra={compra}
        tarjeta={tarjeta}
        error={error}
        onCambiar={() => setPaso("elegir")}
        onPagar={confirmarPago}
      />
    );
  }

  const puedeVolver = !cobrando && pasoVisible !== "resumen" && Boolean(tarjeta);
  const titulo = cobrando ? null : tarjeta ? TITULOS[pasoVisible] : "Agregá una tarjeta";

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={cerrar}>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: colores.cortina, opacity: entrada }]}
        >
          <Pressable
            style={{ flex: 1 }}
            onPress={cerrar}
            accessibilityRole="button"
            accessibilityLabel="Cerrar el pago"
            disabled={cobrando}
          />
        </Animated.View>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Animated.View
            accessibilityViewIsModal
            style={{
              width: "100%",
              maxWidth: 560,
              alignSelf: "center",
              maxHeight: height * 0.92,
              paddingBottom: insets.bottom + espacio.lg,
              borderTopLeftRadius: radio.xl,
              borderTopRightRadius: radio.xl,
              backgroundColor: colores.superficieAlta,
              opacity: movimientoReducido ? entrada : 1,
              transform: [
                {
                  translateY: entrada.interpolate({
                    inputRange: [0, 1],
                    outputRange: [movimientoReducido ? 0 : height * 0.5, 0],
                  }),
                },
              ],
            }}
          >
            <View
              style={{
                alignSelf: "center",
                width: 36,
                height: 5,
                marginTop: espacio.sm,
                borderRadius: radio.pill,
                backgroundColor: colores.bordeFuerte,
              }}
            />
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                minHeight: AREA_TACTIL + espacio.sm,
                paddingHorizontal: espacio.sm,
              }}
            >
              <View style={{ width: AREA_TACTIL }}>
                {puedeVolver && (
                  <BotonIcono icono="chevron-back" etiqueta="Volver" onPress={() => setPaso("resumen")} />
                )}
              </View>
              <Texto variante="subtitulo" accessibilityRole="header" style={{ flex: 1, textAlign: "center" }}>
                {titulo}
              </Texto>
              <View style={{ width: AREA_TACTIL }}>
                {!cobrando && <BotonIcono icono="close" etiqueta="Cerrar el pago" onPress={cerrar} />}
              </View>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{
                paddingHorizontal: espacio.lg,
                paddingTop: espacio.sm,
                gap: espacio.lg,
              }}
            >
              {contenido}
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
