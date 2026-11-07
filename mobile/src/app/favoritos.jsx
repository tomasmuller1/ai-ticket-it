import { FlatList, View } from "react-native";
import { router } from "expo-router";

import { EventoCard } from "../components/EventoCard";
import { BloqueCargando, EstadoError, EstadoVacio, Skeleton } from "../components/ui";
import { useFavoritos } from "../hooks/eventos";
import { espacio, radio, useTema } from "../theme";

function EventoSkeleton() {
  return (
    <View style={{ gap: espacio.sm }}>
      <Skeleton alto={190} redondeo={radio.lg} />
      <Skeleton alto={20} ancho="80%" />
      <Skeleton alto={14} ancho="50%" />
    </View>
  );
}

// Los eventos que la persona guardó con el corazón. Ya no es una pestaña: se abre desde el encabezado de
// Explorar y desde Perfil.
export default function Favoritos() {
  const { colores } = useTema();
  const favoritos = useFavoritos();

  if (favoritos.isPending) {
    return (
      <BloqueCargando
        etiqueta="Cargando tus favoritos"
        style={{ flex: 1, backgroundColor: colores.fondo, padding: espacio.lg, gap: espacio.xxl }}
      >
        <EventoSkeleton />
        <EventoSkeleton />
      </BloqueCargando>
    );
  }
  if (favoritos.isLoadingError) {
    return <EstadoError error={favoritos.error} onReintentar={favoritos.refetch} />;
  }

  if (favoritos.data.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colores.fondo }}>
        <EstadoVacio
          icono="heart-outline"
          titulo="Guardá los eventos que te gustan"
          descripcion="Tocá el corazón en un evento para encontrarlo rápido acá."
          accion={{ titulo: "Explorar eventos", onPress: () => router.navigate("/") }}
        />
      </View>
    );
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colores.fondo }}
      data={favoritos.data}
      keyExtractor={(evento) => evento.id}
      renderItem={({ item }) => (
        <EventoCard evento={item} onPress={() => router.push(`/evento/${item.id}`)} />
      )}
      contentContainerStyle={{ padding: espacio.lg, paddingBottom: espacio.xxxl, gap: espacio.xxl }}
      refreshing={favoritos.isRefetching}
      onRefresh={favoritos.refetch}
    />
  );
}
