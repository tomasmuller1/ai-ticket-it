import { useRef, useState } from "react";
import { FlatList, View } from "react-native";
import { router, useScrollToTop } from "expo-router";

import { useEspacioBarra } from "../../components/BarraNavegacion";
import { CompraCard } from "../../components/CompraCard";
import { CompraSkeleton, PieDeListaPaginada } from "../../components/Esqueletos";
import { FilaDeChips } from "../../components/FilaDeChips";
import { Pantalla } from "../../components/Pantalla";
import { BloqueCargando, Chip, EstadoError, EstadoVacio } from "../../components/ui";
import { useMisCompras } from "../../hooks/compras";
import { FILTROS_ESTADO } from "../../utils/estados";
import { itemsDe } from "../../utils/paginas";
import { espacio } from "../../theme";

// CU1: mis compras, con el estado bien visible y los días que faltan si están confirmadas. Paginadas, la
// más reciente primero.
export default function MisEntradas() {
  const [estado, setEstado] = useState(undefined);
  const compras = useMisCompras(estado);
  const espacioBarra = useEspacioBarra();
  // Tocar Entradas estando en Entradas vuelve al principio de la lista.
  const lista = useRef(null);
  useScrollToTop(lista);

  return (
    <Pantalla titulo="Mis entradas">
      <View style={{ paddingBottom: espacio.sm }}>
        <FilaDeChips>
          {FILTROS_ESTADO.map((filtro) => (
            <Chip
              key={filtro.etiqueta}
              titulo={filtro.etiqueta}
              seleccionado={estado === filtro.estado}
              onPress={() => setEstado(filtro.estado)}
            />
          ))}
        </FilaDeChips>
      </View>

      {compras.isPending ? (
        <BloqueCargando etiqueta="Cargando tus entradas" style={{ padding: espacio.lg, gap: espacio.md }}>
          {[1, 2, 3].map((n) => (
            <CompraSkeleton key={n} />
          ))}
        </BloqueCargando>
      ) : compras.isLoadingError ? (
        <EstadoError error={compras.error} onReintentar={compras.refetch} />
      ) : (
        <FlatList
          ref={lista}
          accessibilityLabel="Tus entradas"
          data={itemsDe(compras.data)}
          keyExtractor={(compra) => compra.id}
          renderItem={({ item }) => (
            <CompraCard compra={item} onPress={() => router.push(`/compra/${item.id}`)} />
          )}
          contentContainerStyle={{
            padding: espacio.lg,
            paddingBottom: espacioBarra,
            gap: espacio.md,
            flexGrow: 1,
          }}
          refreshing={compras.isRefetching && !compras.isFetchingNextPage}
          onRefresh={compras.refetch}
          onEndReached={() => compras.hasNextPage && !compras.isFetchingNextPage && compras.fetchNextPage()}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            <PieDeListaPaginada lista={compras} etiqueta="Cargando más entradas">
              <CompraSkeleton />
            </PieDeListaPaginada>
          }
          ListEmptyComponent={
            estado ? (
              <EstadoVacio
                icono="filter-outline"
                titulo="Ninguna compra en este estado"
                descripcion="Probá con otro filtro."
              />
            ) : (
              <EstadoVacio
                icono="ticket-outline"
                titulo="Todavía no tenés entradas"
                descripcion="Cuando compres, tus entradas van a aparecer acá."
                accion={{ titulo: "Explorar eventos", onPress: () => router.navigate("/") }}
              />
            )
          }
        />
      )}
    </Pantalla>
  );
}
