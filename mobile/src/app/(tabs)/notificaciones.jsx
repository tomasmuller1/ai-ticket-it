import { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, View } from "react-native";
import { router, useFocusEffect } from "expo-router";

import { useAvisos } from "../../components/Avisos";
import { useEspacioBarra } from "../../components/BarraNavegacion";
import { NotificacionItem } from "../../components/NotificacionItem";
import { Pantalla } from "../../components/Pantalla";
import { BloqueCargando, Boton, EstadoError, EstadoVacio, Skeleton } from "../../components/ui";
import {
  useMarcarLeida,
  useMarcarTodasLeidas,
  useNotificaciones,
  useResumenNotificaciones,
} from "../../hooks/notificaciones";
import { rutaDeNotificacion } from "../../utils/notificaciones";
import { AREA_TACTIL, espacio, radio, useTema } from "../../theme";

function NotificacionSkeleton() {
  return (
    <View style={{ flexDirection: "row", gap: espacio.md, padding: espacio.sm }}>
      <Skeleton alto={AREA_TACTIL} ancho={AREA_TACTIL} redondeo={radio.pill} />
      <View style={{ flex: 1, gap: espacio.sm }}>
        <Skeleton alto={16} ancho="70%" />
        <Skeleton alto={12} />
        <Skeleton alto={12} ancho="25%" />
      </View>
    </View>
  );
}

// La paginación es por posición: si llega una notificación nueva entre una página y la siguiente, la última
// de una página se repite al principio de la otra. Se muestra una sola vez.
function sinRepetidas(paginas = []) {
  const vistas = new Set();
  const notificaciones = [];
  for (const n of paginas.flatMap((pagina) => pagina.data)) {
    if (vistas.has(n.id)) continue;
    vistas.add(n.id);
    notificaciones.push(n);
  }
  return notificaciones;
}

// Las pestañas quedan montadas al pasar a otra: al volver a esta, la lista se pide de nuevo, porque la
// burbuja pudo haber avisado de algo nuevo. La primera vez no hace falta: ya se está pidiendo.
function useRefrescarAlVolver(refrescar) {
  const primeraVez = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (primeraVez.current) {
        primeraVez.current = false;
        return;
      }
      refrescar();
    }, [refrescar]),
  );
}

// Centro de notificaciones: lo que pasó con tus compras y tus eventos, la más reciente primero.
export default function Notificaciones() {
  const { colores } = useTema();
  const { avisar } = useAvisos();
  const espacioBarra = useEspacioBarra();
  const resumen = useResumenNotificaciones();
  const lista = useNotificaciones();
  const marcarLeida = useMarcarLeida();
  const marcarTodas = useMarcarTodasLeidas();
  const [refrescando, setRefrescando] = useState(false);
  useRefrescarAlVolver(lista.refetch);

  const notificaciones = useMemo(() => sinRepetidas(lista.data?.pages), [lista.data]);
  const noLeidas = resumen.data?.noLeidas;
  const subtitulo =
    noLeidas === undefined ? undefined : noLeidas > 0 ? `Tenés ${noLeidas} sin leer` : "Estás al día";

  function abrir(notificacion) {
    if (!notificacion.leida) marcarLeida.mutate(notificacion.id);
    router.push(rutaDeNotificacion(notificacion));
  }

  function marcarTodasLeidas() {
    marcarTodas.mutate(undefined, {
      onError: (error) =>
        avisar({ tipo: "error", titulo: "No pudimos marcarlas como leídas", mensaje: error.message }),
    });
  }

  // El spinner de arriba solo para cuando la persona tira de la lista, no para los refrescos solos.
  async function refrescar() {
    setRefrescando(true);
    try {
      await Promise.all([lista.refetch(), resumen.refetch()]);
    } finally {
      setRefrescando(false);
    }
  }

  return (
    <Pantalla titulo="Notificaciones" subtitulo={subtitulo}>
      {lista.data && noLeidas > 0 && (
        <View style={{ alignItems: "flex-end", paddingHorizontal: espacio.sm }}>
          <Boton
            titulo="Marcar todas como leídas"
            variante="fantasma"
            icono="checkmark-done"
            onPress={marcarTodasLeidas}
          />
        </View>
      )}

      {lista.isPending ? (
        <BloqueCargando etiqueta="Cargando tus notificaciones" style={{ padding: espacio.sm }}>
          {[1, 2, 3, 4].map((n) => (
            <NotificacionSkeleton key={n} />
          ))}
        </BloqueCargando>
      ) : lista.isLoadingError ? (
        <EstadoError error={lista.error} onReintentar={lista.refetch} />
      ) : (
        <FlatList
          data={notificaciones}
          keyExtractor={(n) => n.id}
          renderItem={({ item }) => <NotificacionItem notificacion={item} onPress={() => abrir(item)} />}
          contentContainerStyle={{
            paddingHorizontal: espacio.sm,
            paddingTop: espacio.sm,
            paddingBottom: espacioBarra,
            gap: espacio.xs,
            flexGrow: 1,
          }}
          refreshing={refrescando}
          onRefresh={refrescar}
          onEndReached={() => lista.hasNextPage && !lista.isFetchingNextPage && lista.fetchNextPage()}
          onEndReachedThreshold={0.5}
          ListFooterComponent={lista.isFetchingNextPage ? <ActivityIndicator color={colores.acento} /> : null}
          ListEmptyComponent={
            <EstadoVacio
              icono="notifications-outline"
              titulo="No tenés notificaciones"
              descripcion="Te avisamos acá cuando se confirme un pago, te escriban o cambie un evento."
            />
          }
        />
      )}
    </Pantalla>
  );
}
