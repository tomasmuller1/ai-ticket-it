import { FlatList, View } from "react-native";
import { router } from "expo-router";

import { useEspacioBarra } from "../../components/BarraNavegacion";
import { EventoCard } from "../../components/EventoCard";
import { Pantalla } from "../../components/Pantalla";
import { BloqueCargando, EstadoError, EstadoVacio, Skeleton } from "../../components/ui";
import { useFavoritos } from "../../hooks/eventos";
import { espacio, radio } from "../../theme";

function EventoSkeleton() {
  return (
    <View style={{ gap: espacio.sm }}>
      <Skeleton alto={190} redondeo={radio.lg} />
      <Skeleton alto={20} ancho="80%" />
      <Skeleton alto={14} ancho="50%" />
    </View>
  );
}

// Pestaña del comprador con los eventos que guardó con el corazón.
export default function Favoritos() {
  const favoritos = useFavoritos();
  const espacioBarra = useEspacioBarra();
  const cantidad = favoritos.data?.length;

  return (
    <Pantalla
      titulo="Favoritos"
      subtitulo={
        cantidad ? `${cantidad} ${cantidad === 1 ? "evento guardado" : "eventos guardados"}` : undefined
      }
    >
      {favoritos.isPending ? (
        <BloqueCargando etiqueta="Cargando tus favoritos" style={{ padding: espacio.lg, gap: espacio.xxl }}>
          <EventoSkeleton />
          <EventoSkeleton />
        </BloqueCargando>
      ) : favoritos.isLoadingError ? (
        <EstadoError error={favoritos.error} onReintentar={favoritos.refetch} />
      ) : (
        <FlatList
          data={favoritos.data}
          keyExtractor={(evento) => evento.id}
          renderItem={({ item }) => (
            <EventoCard evento={item} onPress={() => router.push(`/evento/${item.id}`)} />
          )}
          contentContainerStyle={{
            padding: espacio.lg,
            paddingBottom: espacioBarra,
            gap: espacio.xxl,
            flexGrow: 1,
          }}
          refreshing={favoritos.isRefetching}
          onRefresh={favoritos.refetch}
          ListEmptyComponent={
            <EstadoVacio
              icono="heart-outline"
              titulo="Guardá los eventos que te gustan"
              descripcion="Tocá el corazón en un evento para encontrarlo rápido acá."
              accion={{ titulo: "Explorar eventos", onPress: () => router.navigate("/") }}
            />
          }
        />
      )}
    </Pantalla>
  );
}
