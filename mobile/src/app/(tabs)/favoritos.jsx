import { useRef } from "react";
import { FlatList } from "react-native";
import { router, useScrollToTop } from "expo-router";

import { useEspacioBarra } from "../../components/BarraNavegacion";
import { EventoSkeleton, PieDeListaPaginada } from "../../components/Esqueletos";
import { EventoCard } from "../../components/EventoCard";
import { Pantalla } from "../../components/Pantalla";
import { BloqueCargando, EstadoError, EstadoVacio } from "../../components/ui";
import { useAlternarFavorito, useFavoritos } from "../../hooks/eventos";
import { itemsDe, totalDe } from "../../utils/paginas";
import { espacio } from "../../theme";

// Pestaña del comprador con los eventos que guardó con el corazón, paginados (el último guardado primero).
// El corazón de cada tarjeta lo quita sin abrir el evento.
export default function Favoritos() {
  const favoritos = useFavoritos();
  const alternarFavorito = useAlternarFavorito();
  const espacioBarra = useEspacioBarra();
  // Tocar Favoritos estando en Favoritos vuelve al principio de la lista.
  const lista = useRef(null);
  useScrollToTop(lista);

  const eventos = itemsDe(favoritos.data);
  const cantidad = totalDe(favoritos.data);

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
          ref={lista}
          accessibilityLabel="Tus favoritos"
          data={eventos}
          keyExtractor={(evento) => evento.id}
          renderItem={({ item }) => (
            <EventoCard
              evento={item}
              onPress={() => router.push(`/evento/${item.id}`)}
              favorito={{
                activo: true,
                onAlternar: () => alternarFavorito.mutate({ evento: item, esFavorito: true }),
              }}
            />
          )}
          contentContainerStyle={{
            padding: espacio.lg,
            paddingBottom: espacioBarra,
            gap: espacio.xxl,
            flexGrow: 1,
          }}
          refreshing={favoritos.isRefetching && !favoritos.isFetchingNextPage}
          onRefresh={favoritos.refetch}
          onEndReached={() =>
            favoritos.hasNextPage && !favoritos.isFetchingNextPage && favoritos.fetchNextPage()
          }
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            <PieDeListaPaginada lista={favoritos} etiqueta="Cargando más favoritos">
              <EventoSkeleton />
            </PieDeListaPaginada>
          }
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
