import { FlatList, Pressable, View } from "react-native";
import { router } from "expo-router";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import { Medidor } from "../../components/Medidor";
import { Pantalla } from "../../components/Pantalla";
import { Boton, EstadoError, EstadoVacio, Skeleton, Texto } from "../../components/ui";
import { useMisEventos } from "../../hooks/organizador";
import { formato } from "../../utils/formato";
import { AREA_TACTIL, espacio, radio, useTema } from "../../theme";

function EventoOrganizador({ evento }) {
  const { colores } = useTema();
  const yaPaso = new Date(evento.fecha) <= new Date();
  return (
    <Pressable
      onPress={() => router.push(`/organizador/evento/${evento.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${evento.nombre}, ${evento.vendidas} de ${evento.cupoTotal} entradas vendidas`}
      style={({ pressed }) => ({
        gap: espacio.md,
        padding: espacio.md,
        borderRadius: radio.lg,
        borderWidth: 1,
        borderColor: colores.borde,
        backgroundColor: pressed ? colores.superficie : colores.fondo,
      })}
    >
      <View style={{ flexDirection: "row", gap: espacio.md }}>
        <Image
          source={evento.imagen}
          style={{ width: 64, height: 64, borderRadius: radio.md, backgroundColor: colores.imagenVacia }}
          contentFit="cover"
        />
        <View style={{ flex: 1, gap: 2 }}>
          <Texto variante="overline" color={yaPaso ? "tenue" : "acento"} style={{ fontSize: 11 }}>
            {yaPaso ? "Ya se realizó" : formato.fecha(evento.fecha)}
          </Texto>
          <Texto variante="cuerpoFuerte" numberOfLines={2}>
            {evento.nombre}
          </Texto>
          <Texto variante="pequenio" color="secundario" numberOfLines={1}>
            {evento.lugar}
          </Texto>
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
  const crear = () => router.push("/organizador/evento/nuevo");

  return (
    <Pantalla
      titulo="Mis eventos"
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
        <View style={{ padding: espacio.lg, gap: espacio.md }}>
          {[1, 2].map((n) => (
            <Skeleton key={n} alto={140} redondeo={radio.lg} />
          ))}
        </View>
      ) : eventos.isError ? (
        <EstadoError error={eventos.error} onReintentar={eventos.refetch} />
      ) : (
        <FlatList
          data={eventos.data}
          keyExtractor={(evento) => evento.id}
          renderItem={({ item }) => <EventoOrganizador evento={item} />}
          contentContainerStyle={{ padding: espacio.lg, gap: espacio.md, flexGrow: 1 }}
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
