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

const UN_DIA_MS = 24 * 60 * 60 * 1000;
const UNA_SEMANA_MS = 7 * UN_DIA_MS;
// La misma regla que el backend (`Evento.ANTICIPACION_MINIMA_MS`), para avisar antes de enviar: la nueva fecha
// tiene que estar a 2 días de ahora como mínimo, antes o después de la actual.
const ANTICIPACION_MINIMA_MS = 2 * UN_DIA_MS;
const MAXIMO_MOTIVO = 300;

// Qué tiene de malo la fecha elegida, o null si se puede enviar.
function errorDeFecha(fecha, actual) {
  if (fecha.getTime() === actual.getTime()) return "La nueva fecha tiene que ser distinta de la actual.";
  if (fecha.getTime() < Date.now() + ANTICIPACION_MINIMA_MS) {
    return "La nueva fecha tiene que ser dentro de 2 días como mínimo.";
  }
  return null;
}

function Formulario({ evento }) {
  const { colores } = useTema();
  const alturaHeader = useHeaderHeight();
  const { avisar } = useAvisos();
  const posponer = usePosponerEvento(evento.id);
  const [fecha, setFecha] = useState(
    () => new Date(Math.max(Date.now(), new Date(evento.fecha).getTime()) + UNA_SEMANA_MS),
  );
  // El mínimo que ofrece el selector se calcula al abrir: la validación al enviar usa la hora de ese momento.
  const [minimo] = useState(() => new Date(Date.now() + ANTICIPACION_MINIMA_MS));
  const [motivo, setMotivo] = useState("");
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState(null);
  const { refDe, refScroll, enfocarErrores } = useFocoEnError();

  function enviar() {
    setErrorGeneral(null);
    // Validación en el dispositivo para avisar rápido; la definitiva la hace el backend.
    const problema = errorDeFecha(fecha, new Date(evento.fecha));
    if (problema) {
      const encontrados = { fecha: problema };
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
        <Texto variante="pequenio" color="secundario">
          Puede ser antes o después de la actual, con 2 días de anticipación como mínimo para que los
          compradores se enteren a tiempo.
        </Texto>
        <SelectorFechaHora
          ref={refDe("fecha")}
          etiqueta="Nueva fecha y hora"
          obligatorio
          valor={fecha}
          minimo={minimo}
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
