import { useState } from "react";
import { FlatList, View } from "react-native";
import { router } from "expo-router";

import { CompraCard } from "../../components/CompraCard";
import { FilaDeChips } from "../../components/FilaDeChips";
import { Pantalla } from "../../components/Pantalla";
import { Chip, EstadoError, EstadoVacio, Skeleton } from "../../components/ui";
import { useMisCompras } from "../../hooks/compras";
import { espacio, radio } from "../../theme";

const FILTROS = [
  { estado: undefined, etiqueta: "Todas" },
  { estado: "CONFIRMADA", etiqueta: "Confirmadas" },
  { estado: "PENDIENTE", etiqueta: "Pendientes" },
  { estado: "UTILIZADA", etiqueta: "Utilizadas" },
  { estado: "CANCELADA", etiqueta: "Canceladas" },
  { estado: "REEMBOLSADA", etiqueta: "Reembolsadas" },
];

// CU1: mis compras, con el estado bien visible y los días que faltan si están confirmadas.
export default function MisEntradas() {
  const [estado, setEstado] = useState(undefined);
  const compras = useMisCompras(estado);

  return (
    <Pantalla titulo="Mis entradas">
      <View style={{ paddingBottom: espacio.sm }}>
        <FilaDeChips>
          {FILTROS.map((filtro) => (
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
          renderItem={({ item }) => <CompraCard compra={item} onPress={() => router.push(`/compra/${item.id}`)} />}
          contentContainerStyle={{ padding: espacio.lg, gap: espacio.md, flexGrow: 1 }}
          refreshing={compras.isRefetching}
          onRefresh={compras.refetch}
          ListEmptyComponent={
            estado ? (
              <EstadoVacio icono="filter-outline" titulo="No tenés compras en este estado" />
            ) : (
              <EstadoVacio
                icono="ticket-outline"
                titulo="Todavía no tenés entradas"
                descripcion="Buscá un evento que te guste y comprá tus entradas en segundos."
                accion={{ titulo: "Explorar eventos", onPress: () => router.navigate("/") }}
              />
            )
          }
        />
      )}
    </Pantalla>
  );
}
