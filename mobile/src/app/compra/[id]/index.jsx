import { ScrollView, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Entrada } from "../../../components/Entrada";
import { Historial } from "../../../components/Historial";
import { DatoPanel, FilaPanel, Panel } from "../../../components/Panel";
import { AvisoError, Boton, EstadoError, Estrellas, Skeleton, Texto } from "../../../components/ui";
import { useSesion } from "../../../context/SesionContext";
import { useAccionCompra, useCompra } from "../../../hooks/compras";
import { confirmar } from "../../../utils/confirmar";
import { formato } from "../../../utils/formato";
import { espacio, radio, useTema } from "../../../theme";

// Una línea arriba de la entrada con el estado y lo que significa ("faltan 5 días", "$ X devueltos").
function EstadoDeLaCompra({ compra }) {
  const { estados } = useTema();
  const { etiqueta, icono, texto } = estados[compra.estado];
  const dias = compra.diasRestantes;
  const detalle =
    compra.estado === "CONFIRMADA" && dias !== null
      ? dias === 0
        ? "es hoy"
        : dias === 1
          ? "falta 1 día"
          : `faltan ${dias} días`
      : compra.estado === "REEMBOLSADA"
        ? `${formato.monto(compra.total)} devueltos`
        : null;
  return (
    <View
      accessible
      accessibilityLabel={`Estado: ${etiqueta}${detalle ? `, ${detalle}` : ""}`}
      style={{ flexDirection: "row", alignItems: "center", gap: espacio.sm }}
    >
      <Ionicons name={icono} size={18} color={texto} />
      <Texto variante="etiqueta">
        {etiqueta}
        {detalle && <Texto color="secundario">, {detalle}</Texto>}
      </Texto>
    </View>
  );
}

function SeccionTitulo({ children }) {
  return (
    <Texto variante="subtitulo" accessibilityRole="header">
      {children}
    </Texto>
  );
}

function CompraSkeleton({ fondo }) {
  return (
    <View style={{ flex: 1, backgroundColor: fondo, padding: espacio.lg, gap: espacio.md }}>
      <Skeleton alto={18} ancho="45%" />
      <Skeleton alto={460} redondeo={radio.xl} />
      <Skeleton alto={56} redondeo={radio.md} />
    </View>
  );
}

// El detalle de una compra: la entrada impresa arriba, las acciones que permite la API, el detalle del
// pago y el historial. El comprador y el organizador del evento ven la misma pantalla.
export default function DetalleCompra() {
  const { id } = useLocalSearchParams();
  const { usuario } = useSesion();
  const { colores } = useTema();
  const compra = useCompra(id);
  const pagar = useAccionCompra("pagar");
  const cancelar = useAccionCompra("cancelar");
  const validar = useAccionCompra("validar");
  // Un escalón más oscuro que el fondo para que el papel de la entrada y sus muescas se distingan.
  const fondo = colores.superficie;

  if (compra.isPending) return <CompraSkeleton fondo={fondo} />;
  if (compra.isError) return <EstadoError error={compra.error} onReintentar={compra.refetch} />;

  const c = compra.data;
  const { acciones } = c;
  const esComprador = c.comprador.id === usuario.id;
  const error = pagar.error ?? cancelar.error ?? validar.error;
  const primerNombre = c.comprador.nombre.split(" ")[0];

  return (
    <View style={{ flex: 1, backgroundColor: fondo }}>
      <Stack.Screen
        options={{
          title: esComprador ? "Tu entrada" : `Compra de ${primerNombre}`,
          headerStyle: { backgroundColor: fondo },
        }}
      />
      <ScrollView
        contentContainerStyle={{ padding: espacio.lg, gap: espacio.xl, paddingBottom: espacio.xxxl }}
      >
        {acciones.pagar && (
          // Si falta pagar, eso es lo único que importa: va antes que la entrada (que todavía no sirve).
          <View style={{ gap: espacio.md }}>
            <View
              style={{
                flexDirection: "row",
                gap: espacio.md,
                padding: espacio.lg,
                borderRadius: radio.md,
                backgroundColor: colores.superficieAlta,
              }}
            >
              <Ionicons name="time-outline" size={22} color={colores.aviso} />
              <Texto style={{ flex: 1 }}>
                Tus entradas están reservadas. Pagalas para confirmar la compra.
              </Texto>
            </View>
            <Boton
              titulo={`Pagar ${formato.monto(c.total)}`}
              icono="card-outline"
              cargando={pagar.isPending}
              onPress={() =>
                confirmar({
                  titulo: `¿Pagar ${formato.monto(c.total)}?`,
                  mensaje: `Se van a cobrar ${formato.monto(c.total)} con el medio de pago de prueba.`,
                  accion: `Pagar ${formato.monto(c.total)}`,
                  alConfirmar: () => pagar.mutate(c.id),
                })
              }
            />
          </View>
        )}

        <AvisoError>{error?.message}</AvisoError>

        <View style={{ gap: espacio.md }}>
          <EstadoDeLaCompra compra={c} />
          <Entrada compra={c} fondo={fondo} />
        </View>

        {acciones.validar && (
          <Boton
            titulo="Validar entrada"
            icono="checkmark-done-outline"
            cargando={validar.isPending}
            onPress={() =>
              confirmar({
                titulo: "¿Validar esta entrada?",
                mensaje: `Confirmá que ${primerNombre} entró con el código ${c.codigoEntrada}.`,
                accion: "Validar entrada",
                volver: "Todavía no",
                alConfirmar: () => validar.mutate(c.id),
              })
            }
          />
        )}

        {(acciones.chatear || acciones.reseniar) && (
          <Panel>
            {acciones.chatear && (
              <FilaPanel
                icono="chatbubbles-outline"
                titulo={esComprador ? "Escribile al organizador" : `Escribile a ${primerNombre}`}
                detalle={
                  c.cantidadMensajes > 0
                    ? `${c.cantidadMensajes} ${c.cantidadMensajes === 1 ? "mensaje" : "mensajes"}`
                    : "Todavía no hay mensajes"
                }
                onPress={() => router.push(`/compra/${c.id}/chat`)}
              />
            )}
            {acciones.reseniar && (
              <FilaPanel
                icono="star-outline"
                titulo="Calificá el evento"
                detalle="Tu opinión suma a la reputación del organizador"
                onPress={() => router.push(`/compra/${c.id}/resenia`)}
              />
            )}
          </Panel>
        )}

        {c.resenia && (
          <View style={{ gap: espacio.md }}>
            <SeccionTitulo>{esComprador ? "Tu calificación" : "Su calificación"}</SeccionTitulo>
            <View
              style={{
                gap: espacio.sm,
                padding: espacio.lg,
                borderRadius: radio.md,
                backgroundColor: colores.superficieAlta,
              }}
            >
              <Estrellas valor={c.resenia.puntuacion} tamanio={20} />
              {c.resenia.detalle.length > 0 && <Texto color="secundario">{c.resenia.detalle}</Texto>}
            </View>
          </View>
        )}

        <View style={{ gap: espacio.md }}>
          <SeccionTitulo>Detalle</SeccionTitulo>
          <Panel>
            <DatoPanel etiqueta="Precio por entrada" valor={formato.monto(c.precioUnitario)} />
            <DatoPanel etiqueta="Cantidad" valor={c.cantidad} />
            <DatoPanel etiqueta="Total" valor={formato.monto(c.total)} fuerte />
            {!esComprador && <DatoPanel etiqueta="Comprador" valor={c.comprador.nombre} />}
            <DatoPanel etiqueta="Organiza" valor={c.evento.organizador.nombre} />
          </Panel>
        </View>

        <View style={{ gap: espacio.md }}>
          <SeccionTitulo>Historial</SeccionTitulo>
          <View
            style={{ padding: espacio.lg, borderRadius: radio.md, backgroundColor: colores.superficieAlta }}
          >
            <Historial historial={c.historial} />
          </View>
        </View>

        {acciones.cancelar && (
          <Boton
            titulo="Cancelar compra"
            icono="close-circle-outline"
            variante="peligroSutil"
            cargando={cancelar.isPending}
            onPress={() =>
              confirmar({
                titulo: "¿Cancelar la compra?",
                mensaje:
                  c.estado === "CONFIRMADA"
                    ? `Te devolvemos ${formato.monto(c.total)} y las entradas quedan libres para otras personas.`
                    : "Liberamos tu reserva y no se te cobra nada.",
                accion: "Cancelar compra",
                volver: "Mantener compra",
                destructiva: true,
                alConfirmar: () => cancelar.mutate(c.id),
              })
            }
          />
        )}
      </ScrollView>
    </View>
  );
}
