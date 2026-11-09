import { FlatList, Pressable, View } from "react-native";
import { router } from "expo-router";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import { useEspacioBarra } from "../../components/BarraNavegacion";
import { InsigniaEvento } from "../../components/InsigniaEvento";
import { Medidor } from "../../components/Medidor";
import { Pantalla } from "../../components/Pantalla";
import { BloqueCargando, Boton, EstadoError, EstadoVacio, Skeleton, Texto } from "../../components/ui";
import { useMisEventos } from "../../hooks/organizador";
import { etiquetaEstadoEvento } from "../../utils/estados";
import { formato } from "../../utils/formato";
import { AREA_TACTIL, espacio, radio, useTema } from "../../theme";

function EventoOrganizador({ evento }) {
  const { colores } = useTema();
  const insignia = etiquetaEstadoEvento(evento.estado);
  return (
    <Pressable
      onPress={() => router.push(`/organizador/evento/${evento.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${evento.nombre}. ${evento.finalizado ? "Ya se realizó" : formato.fecha(evento.fecha)}.${insignia ? ` ${insignia.texto}.` : ""} ${evento.vendidas} de ${evento.cupoTotal} entradas vendidas`}
      style={({ pressed }) => ({
        gap: espacio.md,
        padding: espacio.md,
        borderRadius: radio.md,
        backgroundColor: colores.superficieAlta,
        transform: [{ scale: pressed ? 0.985 : 1 }],
      })}
    >
      <View style={{ flexDirection: "row", gap: espacio.md }}>
        <Image
          source={evento.imagen}
          style={{
            width: 72,
            height: 72,
            borderRadius: radio.xl,
            backgroundColor: colores.imagenVacia,
            opacity: evento.finalizado ? 0.6 : 1,
          }}
          contentFit="cover"
          accessibilityIgnoresInvertColors
        />
        <View style={{ flex: 1, gap: 2 }}>
          <Texto variante="titulo" numberOfLines={2} style={{ fontSize: 22, lineHeight: 24 }}>
            {evento.nombre}
          </Texto>
          <Texto variante="etiqueta" color={evento.finalizado ? "tenue" : "secundario"}>
            {evento.finalizado ? "Ya se realizó" : formato.fecha(evento.fecha)}
          </Texto>
          <Texto variante="pequenio" color="secundario" numberOfLines={1}>
            {evento.lugar}
          </Texto>
          <InsigniaEvento estado={evento.estado} style={{ marginTop: espacio.xs }} />
        </View>
        <Ionicons
          name="chevron-forward"
          size={20}
          color={colores.textoTenue}
          style={{ alignSelf: "center" }}
        />
      </View>
      <Medidor etiqueta="Vendidas" valor={evento.vendidas} total={evento.cupoTotal} grosor={6} />
    </Pressable>
  );
}

// Panel del organizador: sus eventos con el avance de las ventas.
export default function MisEventos() {
  const { colores } = useTema();
  const eventos = useMisEventos();
  const espacioBarra = useEspacioBarra();
  const crear = () => router.push("/organizador/evento/nuevo");

  return (
    <Pantalla
      titulo="Mis eventos"
      subtitulo="Lo que publicaste y cómo se vende"
      accion={
        <Pressable
          onPress={crear}
          accessibilityRole="button"
          accessibilityLabel="Crear evento"
          style={({ pressed }) => ({
            width: AREA_TACTIL,
            height: AREA_TACTIL,
            borderRadius: radio.pill,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: pressed ? colores.acentoPresionado : colores.acento,
          })}
        >
          <Ionicons name="add" size={26} color={colores.sobreAcento} />
        </Pressable>
      }
    >
      {eventos.isPending ? (
        <BloqueCargando etiqueta="Cargando tus eventos" style={{ padding: espacio.lg, gap: espacio.md }}>
          {[1, 2].map((n) => (
            <Skeleton key={n} alto={140} redondeo={radio.lg} />
          ))}
        </BloqueCargando>
      ) : eventos.isLoadingError ? (
        <EstadoError error={eventos.error} onReintentar={eventos.refetch} />
      ) : (
        <FlatList
          data={eventos.data}
          keyExtractor={(evento) => evento.id}
          renderItem={({ item }) => <EventoOrganizador evento={item} />}
          contentContainerStyle={{
            padding: espacio.lg,
            paddingBottom: espacioBarra,
            gap: espacio.md,
            flexGrow: 1,
          }}
          refreshing={eventos.isRefetching}
          onRefresh={eventos.refetch}
          ListEmptyComponent={
            <EstadoVacio
              icono="calendar-outline"
              titulo="Publicá tu primer evento"
              descripcion="Creá un evento con distintos tipos de entrada y seguí las ventas desde acá."
              accion={{ titulo: "Crear evento", onPress: crear }}
            />
          }
          ListFooterComponent={
            eventos.data.length > 0 ? (
              <Boton titulo="Crear otro evento" variante="secundario" icono="add" onPress={crear} />
            ) : null
          }
        />
      )}
    </Pantalla>
  );
}
