import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";

import { useAvisos } from "../../../../components/Avisos";
import { SoloSiSeGestiona } from "../../../../components/SoloSiSeGestiona";
import { SelectorFechaHora } from "../../../../components/SelectorFechaHora";
import {
  AvisoError,
  BloqueCargando,
  Boton,
  Campo,
  EstadoError,
  Skeleton,
  Texto,
} from "../../../../components/ui";
import { useFocoEnError } from "../../../../hooks/useFocoEnError";
import { useComprasDeEvento, usePosponerEvento } from "../../../../hooks/organizador";
import { mensajeDeGestionDeEvento } from "../../../../utils/errores";
import { formato } from "../../../../utils/formato";
import { volver } from "../../../../utils/navegacion";
import { espacio, useTema } from "../../../../theme";

const UNA_SEMANA_MS = 7 * 24 * 60 * 60 * 1000;
const MAXIMO_MOTIVO = 300;

function Formulario({ evento }) {
  const { colores } = useTema();
  const alturaHeader = useHeaderHeight();
  const { avisar } = useAvisos();
  const posponer = usePosponerEvento(evento.id);
  const [fecha, setFecha] = useState(
    () => new Date(Math.max(Date.now(), new Date(evento.fecha).getTime()) + UNA_SEMANA_MS),
  );
  const [motivo, setMotivo] = useState("");
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState(null);
  const { refDe, refScroll, enfocarErrores } = useFocoEnError();

  function enviar() {
    setErrorGeneral(null);
    // Validación en el dispositivo para avisar rápido; la definitiva la hace el backend.
    if (fecha <= new Date(evento.fecha)) {
      const encontrados = { fecha: "La nueva fecha tiene que ser posterior a la actual." };
      setErrores(encontrados);
      enfocarErrores(encontrados);
      return;
    }
    setErrores({});
    posponer.mutate(
      { fecha: fecha.toISOString(), motivo: motivo.trim() || undefined },
      {
        onSuccess: () => {
          avisar({
            tipo: "exito",
            titulo: "Pospusimos el evento y les avisamos a los compradores",
            duracion: 5000,
          });
          volver();
        },
        onError: (error) => {
          const mensaje = mensajeDeGestionDeEvento(error, "posponer");
          const porCampo = error.porCampo?.() ?? {};
          setErrores(porCampo);
          setErrorGeneral(mensaje);
          enfocarErrores(porCampo);
        },
      },
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colores.fondo }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={alturaHeader}
    >
      <ScrollView
        ref={refScroll}
        contentContainerStyle={{ padding: espacio.lg, gap: espacio.xl, paddingBottom: espacio.xxxl }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: espacio.xs }}>
          <Texto variante="titulo" accessibilityRole="header">
            {evento.nombre}
          </Texto>
          <Texto color="secundario">Fecha actual: {formato.fecha(evento.fecha)}</Texto>
        </View>
        <SelectorFechaHora
          ref={refDe("fecha")}
          etiqueta="Nueva fecha y hora"
          obligatorio
          valor={fecha}
          minimo={new Date(evento.fecha)}
          onCambiar={(nueva) => {
            setFecha(nueva);
            setErrores({});
          }}
          error={errores.fecha}
        />
        <Campo
          ref={refDe("motivo")}
          etiqueta="Motivo (opcional)"
          ayuda="Lo ven los compradores en el aviso."
          placeholder="Por el clima, por el escenario…"
          maxLength={MAXIMO_MOTIVO}
          multiline
          value={motivo}
          onChangeText={setMotivo}
          error={errores.motivo}
          style={{ minHeight: 100 }}
        />
        <AvisoError>{errorGeneral}</AvisoError>
        <Boton
          titulo="Posponer evento"
          icono="calendar-outline"
          onPress={enviar}
          cargando={posponer.isPending}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Cambiar la fecha de un evento: las entradas siguen valiendo y cada comprador recibe un aviso.
export default function PosponerEvento() {
  const { id } = useLocalSearchParams();
  const { colores } = useTema();
  const consulta = useComprasDeEvento(id);

  return (
    <View style={{ flex: 1, backgroundColor: colores.fondo }}>
      <Stack.Screen options={{ title: "Posponer evento" }} />
      {consulta.isPending ? (
        <BloqueCargando etiqueta="Cargando el evento" style={{ padding: espacio.lg, gap: espacio.md }}>
          <Skeleton alto={34} ancho="75%" />
          <Skeleton alto={52} />
        </BloqueCargando>
      ) : consulta.isLoadingError ? (
        <EstadoError
          error={consulta.error}
          onReintentar={consulta.refetch}
          recurso="evento"
          onVolver={volver}
        />
      ) : (
        <SoloSiSeGestiona evento={consulta.data.evento}>
          <Formulario evento={consulta.data.evento} />
        </SoloSiSeGestiona>
      )}
    </View>
  );
}
