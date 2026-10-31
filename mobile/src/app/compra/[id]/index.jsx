import { ScrollView, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { DiasRestantes } from "../../../components/CompraCard";
import { Historial } from "../../../components/Historial";
import {
  AvisoError,
  BadgeEstado,
  Boton,
  Cargando,
  EstadoError,
  Estrellas,
  Texto,
} from "../../../components/ui";
import { useSesion } from "../../../context/SesionContext";
import { useAccionCompra, useCompra } from "../../../hooks/compras";
import { confirmar } from "../../../utils/confirmar";
import { formato } from "../../../utils/formato";
import { espacio, radio, useTema } from "../../../theme";

function Fila({ etiqueta, valor, fuerte = false }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Texto color="secundario">{etiqueta}</Texto>
      <Texto variante={fuerte ? "cuerpoFuerte" : "cuerpo"}>{valor}</Texto>
    </View>
  );
}

// La entrada: bloque oscuro con un talón troquelado y el código para mostrar en el ingreso.
function Entrada({ compra }) {
  const { colores } = useTema();
  const fondoEntrada = colores.tinta;
  const textoEntrada = colores.fondo;
  return (
    <View
      style={{ borderRadius: radio.xl, backgroundColor: fondoEntrada, padding: espacio.xl, gap: espacio.md }}
    >
      <Texto variante="overline" style={{ color: colores.textoTenue }}>
        {formato.fecha(compra.evento.fecha)}
      </Texto>
      <Texto variante="titulo" style={{ color: textoEntrada }}>
        {compra.evento.nombre}
      </Texto>
      <View style={{ flexDirection: "row", alignItems: "center", gap: espacio.xs }}>
        <Ionicons name="location-outline" size={16} color={colores.textoTenue} />
        <Texto variante="pequenio" style={{ color: colores.textoTenue }}>
          {compra.evento.lugar}
        </Texto>
      </View>
      <View
        style={{
          borderTopWidth: 2,
          borderStyle: "dashed",
          borderColor: colores.textoSecundario,
          marginVertical: espacio.xs,
        }}
      />
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
        <View style={{ gap: espacio.sm }}>
          <Texto variante="subtitulo" style={{ color: textoEntrada }}>
            {compra.cantidad} × {compra.tipoEntrada.nombre}
          </Texto>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: espacio.sm }}>
            <BadgeEstado estado={compra.estado} />
            <DiasRestantes dias={compra.diasRestantes} />
          </View>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Texto variante="overline" style={{ color: colores.textoTenue, fontSize: 10 }}>
            Código
          </Texto>
          <Texto
            variante="titulo"
            style={{ color: textoEntrada, letterSpacing: 2 }}
            accessibilityLabel={`Código de entrada ${compra.codigoEntrada.split("").join(" ")}`}
          >
            {compra.codigoEntrada}
          </Texto>
        </View>
      </View>
    </View>
  );
}

export default function DetalleCompra() {
  const { id } = useLocalSearchParams();
  const { usuario } = useSesion();
  const { colores } = useTema();
  const compra = useCompra(id);
  const pagar = useAccionCompra("pagar");
  const cancelar = useAccionCompra("cancelar");
  const validar = useAccionCompra("validar");

  if (compra.isPending) return <Cargando />;
  if (compra.isError) return <EstadoError error={compra.error} onReintentar={compra.refetch} />;

  const c = compra.data;
  const { acciones } = c;
  const esComprador = c.comprador.id === usuario.id;
  const error = pagar.error ?? cancelar.error ?? validar.error;

  return (
    <View style={{ flex: 1, backgroundColor: colores.fondo }}>
      <Stack.Screen options={{ title: esComprador ? "Tu entrada" : "Compra" }} />
      <ScrollView
        contentContainerStyle={{ padding: espacio.lg, gap: espacio.xl, paddingBottom: espacio.xxxl }}
      >
        <Entrada compra={c} />

        {c.estado === "PENDIENTE" && esComprador && (
          <View
            style={{
              flexDirection: "row",
              gap: espacio.md,
              padding: espacio.lg,
              borderRadius: radio.lg,
              backgroundColor: colores.superficie,
            }}
          >
            <Ionicons name="time-outline" size={22} color={colores.aviso} />
            <Texto style={{ flex: 1 }}>
              Tus entradas están reservadas. Pagalas para confirmar la compra.
            </Texto>
          </View>
        )}

        <AvisoError>{error?.message}</AvisoError>

        <View style={{ gap: espacio.md }}>
          {acciones.pagar && (
            <Boton
              titulo={`Pagar ${formato.precio(c.total)}`}
              icono="card-outline"
              cargando={pagar.isPending}
              onPress={() =>
                confirmar({
                  titulo: `¿Pagar ${formato.precio(c.total)}?`,
                  mensaje: `Se van a cobrar ${formato.precio(c.total)} con el medio de pago de prueba.`,
                  accion: `Pagar ${formato.precio(c.total)}`,
                  alConfirmar: () => pagar.mutate(c.id),
                })
              }
            />
          )}
          {acciones.validar && (
            <Boton
              titulo="Validar entrada"
              icono="checkmark-done-outline"
              cargando={validar.isPending}
              onPress={() =>
                confirmar({
                  titulo: "¿Validar esta entrada?",
                  mensaje: `Confirmá que ${c.comprador.nombre} ingresó con el código ${c.codigoEntrada}.`,
                  accion: "Validar",
                  alConfirmar: () => validar.mutate(c.id),
                })
              }
            />
          )}
          {acciones.reseniar && (
            <Boton
              titulo="Calificar evento"
              icono="star-outline"
              onPress={() => router.push(`/compra/${c.id}/resenia`)}
            />
          )}
          {acciones.chatear && (
            <Boton
              titulo={
                c.cantidadMensajes > 0
                  ? `Ver mensajes (${c.cantidadMensajes})`
                  : esComprador
                    ? "Escribirle al organizador"
                    : `Escribirle a ${c.comprador.nombre.split(" ")[0]}`
              }
              variante="secundario"
              icono="chatbubbles-outline"
              onPress={() => router.push(`/compra/${c.id}/chat`)}
            />
          )}
        </View>

        {c.resenia && (
          <View
            style={{
              gap: espacio.sm,
              padding: espacio.lg,
              borderRadius: radio.lg,
              backgroundColor: colores.superficie,
            }}
          >
            <Texto variante="cuerpoFuerte">Tu calificación</Texto>
            <Estrellas valor={c.resenia.puntuacion} tamanio={20} />
            {c.resenia.detalle.length > 0 && <Texto color="secundario">{c.resenia.detalle}</Texto>}
          </View>
        )}

        <View style={{ gap: espacio.md }}>
          <Texto variante="subtitulo" accessibilityRole="header">
            Detalle
          </Texto>
          <Fila etiqueta="Precio por entrada" valor={formato.precio(c.precioUnitario)} />
          <Fila etiqueta="Cantidad" valor={c.cantidad} />
          <Fila etiqueta="Total" valor={formato.precio(c.total)} fuerte />
          {!esComprador && <Fila etiqueta="Comprador" valor={c.comprador.nombre} />}
          <Fila etiqueta="Organiza" valor={c.evento.organizador.nombre} />
        </View>

        <View style={{ gap: espacio.md }}>
          <Texto variante="subtitulo" accessibilityRole="header">
            Historial
          </Texto>
          <Historial historial={c.historial} />
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
                    ? `Te vamos a reembolsar ${formato.precio(c.total)} y las entradas quedan libres para otras personas.`
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
