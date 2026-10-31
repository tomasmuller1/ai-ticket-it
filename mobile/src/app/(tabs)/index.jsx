import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { EventoCard } from "../../components/EventoCard";
import { FilaDeChips } from "../../components/FilaDeChips";
import { HojaFiltros, ORDENES, PRECIOS } from "../../components/HojaFiltros";
import { Pantalla } from "../../components/Pantalla";
import { Chip, EstadoError, EstadoVacio, Skeleton, Texto } from "../../components/ui";
import { useSesion } from "../../context/SesionContext";
import { useBusquedaEventos, useCategorias } from "../../hooks/eventos";
import { useDebounce } from "../../hooks/useDebounce";
import { AREA_TACTIL, espacio, fuentes, radio, useTema } from "../../theme";

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

// CU3 (buscar por texto o por categoría) y CU11 (ordenar por precio, fecha o puntaje).
export default function Explorar() {
  const { usuario } = useSesion();
  const { colores } = useTema();
  const [texto, setTexto] = useState("");
  const [categoria, setCategoria] = useState(null);
  const [ordenId, setOrdenId] = useState(ORDENES[0].id);
  const [precioId, setPrecioId] = useState(PRECIOS[0].id);
  const [filtrosVisibles, setFiltrosVisibles] = useState(false);
  const q = useDebounce(texto.trim());

  const categorias = useCategorias();
  const filtros = useMemo(() => {
    const { orden, dir } = ORDENES.find((o) => o.id === ordenId);
    const { precioMin, precioMax } = PRECIOS.find((p) => p.id === precioId);
    return { q, categoria, orden, dir, precioMin, precioMax };
  }, [q, categoria, ordenId, precioId]);
  const busqueda = useBusquedaEventos(filtros);

  const eventos = busqueda.data?.pages.flatMap((pagina) => pagina.data) ?? [];
  const total = busqueda.data?.pages[0]?.total ?? 0;
  const hayFiltros = ordenId !== ORDENES[0].id || precioId !== PRECIOS[0].id;

  return (
    <Pantalla antetitulo={`Hola, ${usuario.nombre}`} titulo="¿Qué vas a ver hoy?">
      <View style={{ gap: espacio.md, paddingBottom: espacio.sm }}>
        <View
          style={{
            marginHorizontal: espacio.lg,
            flexDirection: "row",
            alignItems: "center",
            gap: espacio.sm,
            minHeight: AREA_TACTIL + 4,
            paddingHorizontal: espacio.md,
            borderRadius: radio.md,
            borderWidth: 1,
            borderColor: colores.bordeCampo,
            backgroundColor: colores.superficie,
          }}
        >
          <Ionicons name="search" size={20} color={colores.textoSecundario} />
          <TextInput
            value={texto}
            onChangeText={setTexto}
            placeholder="Buscá eventos, lugares o artistas"
            placeholderTextColor={colores.textoTenue}
            accessibilityLabel="Buscar eventos"
            returnKeyType="search"
            autoCorrect={false}
            style={{ flex: 1, fontFamily: fuentes.regular, fontSize: 16, color: colores.texto }}
          />
          {texto.length > 0 && (
            <Pressable
              onPress={() => setTexto("")}
              accessibilityRole="button"
              accessibilityLabel="Borrar búsqueda"
              hitSlop={12}
            >
              <Ionicons name="close-circle" size={20} color={colores.textoTenue} />
            </Pressable>
          )}
        </View>

        <FilaDeChips>
          <Chip titulo="Todos" seleccionado={!categoria} onPress={() => setCategoria(null)} />
          {categorias.data?.map((c) => (
            <Chip
              key={c.id}
              titulo={c.nombre}
              seleccionado={categoria === c.id}
              onPress={() => setCategoria(categoria === c.id ? null : c.id)}
            />
          ))}
        </FilaDeChips>

        <View
          style={{
            marginHorizontal: espacio.lg,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Texto variante="pequenio" color="secundario" accessibilityLiveRegion="polite">
            {busqueda.isPending ? "Buscando…" : `${total} ${total === 1 ? "evento" : "eventos"}`}
          </Texto>
          <Pressable
            onPress={() => setFiltrosVisibles(true)}
            accessibilityRole="button"
            accessibilityLabel={`Ordenar y filtrar. Orden actual: ${ORDENES.find((o) => o.id === ordenId).etiqueta}`}
            hitSlop={8}
            style={{ flexDirection: "row", alignItems: "center", gap: espacio.xs, minHeight: AREA_TACTIL }}
          >
            <Ionicons name="swap-vertical" size={18} color={colores.textoAcento} />
            <Texto variante="etiqueta" color="acento">
              {ORDENES.find((o) => o.id === ordenId).etiqueta}
            </Texto>
            {hayFiltros && (
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colores.acento }} />
            )}
          </Pressable>
        </View>
      </View>

      {busqueda.isPending ? (
        <View style={{ padding: espacio.lg, gap: espacio.xl }}>
          <EventoSkeleton />
          <EventoSkeleton />
        </View>
      ) : busqueda.isError ? (
        <EstadoError error={busqueda.error} onReintentar={busqueda.refetch} />
      ) : (
        <FlatList
          data={eventos}
          keyExtractor={(evento) => evento.id}
          renderItem={({ item }) => (
            <EventoCard evento={item} onPress={() => router.push(`/evento/${item.id}`)} />
          )}
          contentContainerStyle={{
            paddingHorizontal: espacio.lg,
            paddingTop: espacio.sm,
            paddingBottom: espacio.xl,
            gap: espacio.xl,
            flexGrow: 1,
          }}
          keyboardDismissMode="on-drag"
          refreshing={busqueda.isRefetching && !busqueda.isFetchingNextPage}
          onRefresh={busqueda.refetch}
          onEndReached={() =>
            busqueda.hasNextPage && !busqueda.isFetchingNextPage && busqueda.fetchNextPage()
          }
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            busqueda.isFetchingNextPage ? <ActivityIndicator color={colores.acento} /> : null
          }
          ListEmptyComponent={
            <EstadoVacio
              icono="search-outline"
              titulo="No encontramos eventos"
              descripcion="Probá con otra búsqueda, otra categoría o sacando los filtros."
            />
          }
        />
      )}

      <HojaFiltros
        visible={filtrosVisibles}
        ordenId={ordenId}
        precioId={precioId}
        onCambiar={({ ordenId: nuevoOrden, precioId: nuevoPrecio }) => {
          if (nuevoOrden) setOrdenId(nuevoOrden);
          if (nuevoPrecio) setPrecioId(nuevoPrecio);
        }}
        onCerrar={() => setFiltrosVisibles(false)}
      />
    </Pantalla>
  );
}
