import { FlatList, View } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { api } from "../../api/endpoints";
import { EventoCard } from "../../components/EventoCard";
import { Pantalla } from "../../components/Pantalla";
import { EstadoError, EstadoVacio, Skeleton } from "../../components/ui";
import { useSesion } from "../../context/SesionContext";
import { espacio, radio } from "../../theme";

function EventoSkeleton() {
  return (
    <View style={{ gap: espacio.sm }}>
      <Skeleton alto={190} redondeo={radio.lg} />
      <Skeleton alto={12} ancho="30%" />
      <Skeleton alto={20} ancho="80%" />
      <Skeleton alto={14} ancho="50%" />
    </View>
  );
}

// Versión inicial de Explorar: la búsqueda, los filtros y el orden (CU3, CU11) llegan en la próxima fase.
export default function Explorar() {
  const { usuario } = useSesion();
  const consulta = useQuery({ queryKey: ["eventos", {}], queryFn: () => api.eventos.buscar({}) });

  return (
    <Pantalla antetitulo={`Hola, ${usuario.nombre}`} titulo="¿Qué vas a ver hoy?">
      {consulta.isPending ? (
        <View style={{ padding: espacio.lg, gap: espacio.xl }}>
          <EventoSkeleton />
          <EventoSkeleton />
        </View>
      ) : consulta.isError ? (
        <EstadoError error={consulta.error} onReintentar={consulta.refetch} />
      ) : (
        <FlatList
          data={consulta.data.data}
          keyExtractor={(evento) => evento.id}
          renderItem={({ item }) => <EventoCard evento={item} />}
          contentContainerStyle={{ padding: espacio.lg, gap: espacio.xl }}
          refreshing={consulta.isRefetching}
          onRefresh={consulta.refetch}
          ListEmptyComponent={
            <EstadoVacio
              icono="calendar-outline"
              titulo="No hay eventos próximos"
              descripcion="Volvé pronto."
            />
          }
        />
      )}
    </Pantalla>
  );
}
