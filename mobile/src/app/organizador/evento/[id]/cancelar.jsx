import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";

import { useAvisos } from "../../../../components/Avisos";
import { SoloSiSeGestiona } from "../../../../components/SoloSiSeGestiona";
import {
  AvisoError,
  BloqueCargando,
  Boton,
  Campo,
  EstadoError,
  Skeleton,
  Texto,
} from "../../../../components/ui";
import { useCancelarEvento, useComprasDeEvento } from "../../../../hooks/organizador";
import { confirmar } from "../../../../utils/confirmar";
import { mensajeDeGestionDeEvento } from "../../../../utils/errores";
import { volver } from "../../../../utils/navegacion";
import { espacio, useTema } from "../../../../theme";

const MAXIMO_MOTIVO = 300;

function Formulario({ evento }) {
  const { colores } = useTema();
  const alturaHeader = useHeaderHeight();
  const { avisar } = useAvisos();
  const cancelar = useCancelarEvento(evento.id);
  const [motivo, setMotivo] = useState("");
  const [errorGeneral, setErrorGeneral] = useState(null);

  function cancelarEvento() {
    setErrorGeneral(null);
    cancelar.mutate(
      { motivo: motivo.trim() || undefined },
      {
        onSuccess: () => {
          avisar({
            tipo: "exito",
            titulo: "Cancelaste el evento. Estamos devolviendo el dinero.",
            duracion: 5000,
          });
          volver();
        },
        onError: (error) => setErrorGeneral(mensajeDeGestionDeEvento(error, "cancelar")),
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
        contentContainerStyle={{ padding: espacio.lg, gap: espacio.xl, paddingBottom: espacio.xxxl }}
        keyboardShouldPersistTaps="handled"
      >
        <Texto variante="titulo" accessibilityRole="header">
          {evento.nombre}
        </Texto>
        <Texto>
          Vamos a cancelar todas las compras y devolverles el dinero a quienes pagaron. Les avisamos a todos.
          No se puede deshacer.
        </Texto>
        <Campo
          etiqueta="Motivo (opcional)"
          ayuda="Lo ven los compradores en el aviso."
          placeholder="Por qué se cancela"
          maxLength={MAXIMO_MOTIVO}
          multiline
          value={motivo}
          onChangeText={setMotivo}
          style={{ minHeight: 100 }}
        />
        <AvisoError>{errorGeneral}</AvisoError>
        <Boton
          titulo="Cancelar evento"
          variante="peligro"
          icono="close-circle-outline"
          cargando={cancelar.isPending}
          onPress={() =>
            confirmar({
              titulo: `¿Cancelar ${evento.nombre}?`,
              mensaje: "Se cancelan todas las compras y se devuelve el dinero. No se puede deshacer.",
              accion: "Cancelar evento",
              volver: "Mantener evento",
              destructiva: true,
              alConfirmar: cancelarEvento,
            })
          }
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Cancelar el evento: se cancelan y reembolsan todas las compras vigentes, incluso las ya utilizadas.
export default function CancelarEvento() {
  const { id } = useLocalSearchParams();
  const { colores } = useTema();
  const consulta = useComprasDeEvento(id);

  return (
    <View style={{ flex: 1, backgroundColor: colores.fondo }}>
      <Stack.Screen options={{ title: "Cancelar evento" }} />
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
