import { FlatList } from "react-native";
import { router } from "expo-router";

import { EventoCard } from "../../components/EventoCard";
import { Pantalla } from "../../components/Pantalla";
import { Cargando, EstadoError, EstadoVacio } from "../../components/ui";
import { useFavoritos } from "../../hooks/eventos";
import { espacio } from "../../theme";

export default function Favoritos() {
  const favoritos = useFavoritos();

  return (
    <Pantalla titulo="Favoritos">
      {favoritos.isPending ? (
        <Cargando />
      ) : favoritos.isError ? (
        <EstadoError error={favoritos.error} onReintentar={favoritos.refetch} />
      ) : (
        <FlatList
          data={favoritos.data}
          keyExtractor={(evento) => evento.id}
          renderItem={({ item }) => (
            <EventoCard evento={item} onPress={() => router.push(`/evento/${item.id}`)} />
          )}
          contentContainerStyle={{ padding: espacio.lg, gap: espacio.xl, flexGrow: 1 }}
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
