import { FlatList } from "react-native";
import { router } from "expo-router";

import { useEspacioBarra } from "../../components/BarraNavegacion";
import { EventoCard } from "../../components/EventoCard";
import { Pantalla } from "../../components/Pantalla";
import { Cargando, EstadoError, EstadoVacio } from "../../components/ui";
import { useFavoritos } from "../../hooks/eventos";
import { espacio } from "../../theme";

export default function Favoritos() {
  const favoritos = useFavoritos();
  const espacioBarra = useEspacioBarra();

  return (
    <Pantalla titulo="Favoritos" subtitulo="Los eventos que guardaste para no perderlos">
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
