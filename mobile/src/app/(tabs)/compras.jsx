import { useState } from "react";
import { FlatList, View } from "react-native";
import { router } from "expo-router";

import { useEspacioBarra } from "../../components/BarraNavegacion";
import { CompraCard } from "../../components/CompraCard";
import { FilaDeChips } from "../../components/FilaDeChips";
import { Pantalla } from "../../components/Pantalla";
import { Chip, EstadoError, EstadoVacio, Skeleton } from "../../components/ui";
import { useMisCompras } from "../../hooks/compras";
import { FILTROS_ESTADO } from "../../utils/estados";
import { espacio, radio } from "../../theme";

// CU1: mis compras, con el estado bien visible y los días que faltan si están confirmadas.
export default function MisEntradas() {
  const [estado, setEstado] = useState(undefined);
  const compras = useMisCompras(estado);
  const espacioBarra = useEspacioBarra();

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
        <View style={{ padding: espacio.lg, gap: espacio.md }}>
          {[1, 2, 3].map((n) => (
            <Skeleton key={n} alto={120} redondeo={radio.lg} />
          ))}
        </View>
      ) : compras.isError ? (
        <EstadoError error={compras.error} onReintentar={compras.refetch} />
      ) : (
        <FlatList
          data={compras.data}
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
          refreshing={compras.isRefetching}
          onRefresh={compras.refetch}
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
