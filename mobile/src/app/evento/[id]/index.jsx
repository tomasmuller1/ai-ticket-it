import { ScrollView, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import { BotonFlotante } from "../../../components/BotonFlotante";
import { ReseniaItem } from "../../../components/ReseniaItem";
import { Boton, Cargando, EstadoError, Estrellas, Texto } from "../../../components/ui";
import { useSesion } from "../../../context/SesionContext";
import { useAlternarFavorito, useEvento, useFavoritos } from "../../../hooks/eventos";
import { formato } from "../../../utils/formato";
import { espacio, radio, useTema } from "../../../theme";

const POCAS_ENTRADAS = 10;

function Dato({ icono, children }) {
  const { colores } = useTema();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: espacio.sm }}>
      <Ionicons name={icono} size={18} color={colores.textoSecundario} />
      <Texto color="secundario" style={{ flex: 1 }}>
        {children}
      </Texto>
    </View>
  );
}

function TipoEntrada({ tipo }) {
  const { colores } = useTema();
  const agotado = tipo.disponibles === 0;
  const pocas = !agotado && tipo.disponibles <= POCAS_ENTRADAS;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: espacio.md,
        padding: espacio.lg,
        borderRadius: radio.lg,
        borderWidth: 1,
        borderColor: colores.borde,
        opacity: agotado ? 0.55 : 1,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Texto variante="cuerpoFuerte">{tipo.nombre}</Texto>
        {tipo.descripcion.length > 0 && (
          <Texto variante="pequenio" color="secundario">
            {tipo.descripcion}
          </Texto>
        )}
        <Texto
          variante="pequenio"
          style={{ color: agotado ? colores.textoTenue : pocas ? colores.aviso : colores.textoSecundario }}
        >
          {agotado
            ? "Agotado"
            : pocas
              ? `¡${tipo.disponibles === 1 ? "Queda" : "Quedan"} ${tipo.disponibles}!`
              : "Disponible"}
        </Texto>
      </View>
      <Texto variante="subtitulo">{formato.precio(tipo.precio)}</Texto>
    </View>
  );
}

export default function DetalleEvento() {
  const { id } = useLocalSearchParams();
  const { usuario } = useSesion();
  const { colores } = useTema();
  const insets = useSafeAreaInsets();
  const evento = useEvento(id);
  const favoritos = useFavoritos();
  const alternarFavorito = useAlternarFavorito();

  if (evento.isPending) return <Cargando />;
  if (evento.isError) return <EstadoError error={evento.error} onReintentar={evento.refetch} />;

  const e = evento.data;
  const { organizador } = e;
  const esFavorito = favoritos.data?.some((f) => f.id === e.id) ?? false;
  const esPropio = organizador.id === usuario.id;
  const yaPaso = new Date(e.fecha) <= new Date();

  return (
    <View style={{ flex: 1, backgroundColor: colores.fondo }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={{ backgroundColor: colores.imagenVacia }}>
          <Image
            source={e.multimedia[0]}
            style={{ width: "100%", aspectRatio: 4 / 3 }}
            contentFit="cover"
            transition={200}
          />
          <View
            style={{
              position: "absolute",
              top: insets.top + espacio.sm,
              left: espacio.lg,
              right: espacio.lg,
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            <BotonFlotante icono="chevron-back" etiqueta="Volver" onPress={() => router.back()} />
            <BotonFlotante
              icono={esFavorito ? "heart" : "heart-outline"}
              color={esFavorito ? colores.acento : undefined}
              etiqueta={esFavorito ? "Quitar de favoritos" : "Agregar a favoritos"}
              seleccionado={esFavorito}
              onPress={() => alternarFavorito.mutate({ evento: e, esFavorito })}
            />
          </View>
        </View>

        <View style={{ padding: espacio.lg, gap: espacio.xl }}>
          <View style={{ gap: espacio.sm }}>
            <Texto variante="overline" color="acento">
              {e.categoria.nombre}
            </Texto>
            <Texto variante="display" accessibilityRole="header">
              {e.nombre}
            </Texto>
            <Dato icono="calendar-outline">{formato.fecha(e.fecha)}</Dato>
            <Dato icono="location-outline">{e.lugar}</Dato>
          </View>

          <Texto>{e.descripcion}</Texto>

          <View style={{ gap: espacio.md }}>
            <Texto variante="subtitulo" accessibilityRole="header">
              Entradas
            </Texto>
            {e.tiposEntrada.map((tipo) => (
              <TipoEntrada key={tipo.id} tipo={tipo} />
            ))}
          </View>

          <View style={{ gap: espacio.md }}>
            <Texto variante="subtitulo" accessibilityRole="header">
              Quién organiza
            </Texto>
            <View style={{ flexDirection: "row", alignItems: "center", gap: espacio.md }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: radio.pill,
                  backgroundColor: colores.acentoSuave,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="person" size={22} color={colores.textoAcento} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Texto variante="cuerpoFuerte">{organizador.nombre}</Texto>
                {organizador.puntaje === null ? (
                  <Texto variante="pequenio" color="secundario">
                    Todavía no tiene reseñas
                  </Texto>
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: espacio.sm }}>
                    <Estrellas valor={organizador.puntaje} />
                    <Texto variante="pequenio" color="secundario">
                      {organizador.puntaje.toFixed(1)} · {organizador.cantidadResenias}{" "}
                      {organizador.cantidadResenias === 1 ? "reseña" : "reseñas"}
                    </Texto>
                  </View>
                )}
              </View>
            </View>
            {e.reseniasRecientes.map((resenia) => (
              <ReseniaItem key={resenia.id} resenia={resenia} />
            ))}
          </View>
        </View>
      </ScrollView>

      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          flexDirection: "row",
          alignItems: "center",
          gap: espacio.lg,
          paddingHorizontal: espacio.lg,
          paddingTop: espacio.md,
          paddingBottom: insets.bottom + espacio.md,
          backgroundColor: colores.fondo,
          borderTopWidth: 1,
          borderTopColor: colores.borde,
        }}
      >
        <View>
          <Texto variante="pequenio" color="secundario">
            {e.precioDesde === 0 ? "Entrada" : "Desde"}
          </Texto>
          <Texto variante="subtitulo">{formato.precio(e.precioDesde)}</Texto>
        </View>
        {esPropio ? (
          <Boton
            style={{ flex: 1 }}
            titulo="Gestionar evento"
            variante="secundario"
            icono="stats-chart-outline"
            onPress={() => router.push(`/organizador/evento/${e.id}`)}
          />
        ) : (
          <Boton
            style={{ flex: 1 }}
            titulo={yaPaso ? "Ya se realizó" : e.agotado ? "Agotado" : "Comprar entradas"}
            deshabilitado={yaPaso || e.agotado}
            onPress={() => router.push(`/evento/${e.id}/comprar`)}
          />
        )}
      </View>
    </View>
  );
}
