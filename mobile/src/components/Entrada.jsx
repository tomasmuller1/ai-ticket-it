import { View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";

import { formato } from "../utils/formato";
import { espacio, radio, useTema } from "../theme";
import { LogoTicket } from "./Marca";
import { Texto } from "./ui";

// Sello sobre una entrada que ya no sirve para entrar.
const SELLOS = {
  REEMBOLSADA: { texto: "Reembolsada", color: "tintaSello" },
  CANCELADA: { texto: "Cancelada", color: "tintaSello" },
  UTILIZADA: { texto: "Utilizada", color: "tintaPapel" },
};

const GUIONES = 28;

function Campo({ etiqueta, valor, lineas = 1, flex = 1 }) {
  const { colores } = useTema();
  return (
    <View style={{ flex, minWidth: 0, gap: 2 }}>
      <Texto variante="pequenio" style={{ color: colores.tintaPapelSecundaria, fontSize: 12 }}>
        {etiqueta}
      </Texto>
      <Texto variante="cuerpoFuerte" numberOfLines={lineas} style={{ color: colores.tintaPapel }}>
        {valor}
      </Texto>
    </View>
  );
}

// El troquel: guiones (iOS no dibuja bordes punteados de un solo lado) y dos muescas que dejan ver el
// fondo de la pantalla.
function Troquel({ fondo }) {
  const { colores } = useTema();
  const muesca = {
    position: "absolute",
    top: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: fondo,
  };
  return (
    <View style={{ height: 20, justifyContent: "center" }} importantForAccessibility="no-hide-descendants">
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginHorizontal: espacio.lg + 2,
          overflow: "hidden",
        }}
      >
        {Array.from({ length: GUIONES }, (_, i) => (
          <View
            key={i}
            style={{ width: 6, height: 2, borderRadius: 1, backgroundColor: colores.bordeFuerte }}
          />
        ))}
      </View>
      <View style={[muesca, { left: -10 }]} />
      <View style={[muesca, { right: -10 }]} />
    </View>
  );
}

// La entrada impresa: la foto del evento con el nombre en letra de afiche, los datos en campos, el
// troquel y el talón con el QR. Si ya no sirve para entrar lleva un sello y el QR se apaga.
// `fondo` es el color de la pantalla, que se ve a través de las muescas.
export function Entrada({ compra, fondo }) {
  const { colores } = useTema();
  const { evento } = compra;
  const sello = SELLOS[compra.estado];
  const valida = compra.estado === "CONFIRMADA";
  const pendiente = compra.estado === "PENDIENTE";

  return (
    <View
      accessible
      accessibilityLabel={`Entrada para ${evento.nombre}. ${formato.fecha(evento.fecha)}, ${evento.lugar}. ${compra.cantidad} × ${compra.tipoEntrada.nombre}. Código ${compra.codigoEntrada.split("").join(" ")}.${sello ? ` ${sello.texto}.` : valida ? " Entrada válida." : ""}`}
      style={{ borderRadius: radio.xl, backgroundColor: colores.papel, overflow: "hidden" }}
    >
      <View style={{ backgroundColor: colores.imagenVacia }}>
        {evento.imagen && (
          <Image
            source={evento.imagen}
            style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
            contentFit="cover"
            accessibilityIgnoresInvertColors
          />
        )}
        <View style={{ backgroundColor: colores.velo, padding: espacio.lg, paddingBottom: espacio.xl }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: espacio.md,
            }}
          >
            <Texto variante="pequenio" numberOfLines={1} style={{ flex: 1, color: "#FFFFFF", opacity: 0.85 }}>
              {evento.organizador.nombre} presenta
            </Texto>
            <LogoTicket ancho={40} />
          </View>
          <Texto
            variante="display"
            numberOfLines={3}
            style={{ color: "#FFFFFF", fontSize: 36, lineHeight: 36, marginTop: espacio.lg }}
          >
            {evento.nombre}
          </Texto>
          <Texto variante="pequenio" numberOfLines={2} style={{ color: "#FFFFFF", marginTop: espacio.xs }}>
            {evento.lugar}
          </Texto>
        </View>
      </View>

      <View style={{ padding: espacio.lg, gap: espacio.md }}>
        <View style={{ flexDirection: "row", gap: espacio.md }}>
          <Campo etiqueta="Fecha" valor={formato.dia(evento.fecha)} flex={1.3} />
          <Campo etiqueta="Hora" valor={formato.hora(evento.fecha)} />
          <Campo etiqueta="Cant." valor={compra.cantidad} flex={0.6} />
        </View>
        <View style={{ flexDirection: "row", gap: espacio.md }}>
          <Campo etiqueta="Entrada" valor={compra.tipoEntrada.nombre} lineas={2} flex={2.3} />
          <Campo etiqueta="Total" valor={formato.monto(compra.total)} flex={1.3} />
        </View>
      </View>

      <Troquel fondo={fondo} />

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: espacio.lg,
          padding: espacio.lg,
          paddingTop: espacio.md,
        }}
      >
        <View style={{ opacity: valida ? 1 : 0.22 }}>
          <QRCode
            value={`AITICKETIT:${compra.codigoEntrada}`}
            size={104}
            color={colores.tintaPapel}
            backgroundColor={colores.papel}
          />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Texto variante="pequenio" style={{ color: colores.tintaPapelSecundaria, fontSize: 12 }}>
            Código
          </Texto>
          <Texto
            variante="subtitulo"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            style={{
              color: colores.tintaPapel,
              letterSpacing: 1.5,
              fontVariant: ["tabular-nums"],
              // Una entrada anulada apaga su código; el mensaje de abajo queda legible.
              opacity: valida || pendiente ? 1 : 0.4,
            }}
          >
            {compra.codigoEntrada}
          </Texto>
          {valida ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: espacio.xs }}>
              <Ionicons name="checkmark-circle" size={16} color={colores.marca} />
              <Texto variante="pequenio" style={{ color: colores.tintaPapel }}>
                {compra.cantidad === 1 ? "Válida" : `Válida para ${compra.cantidad}`}. Mostrala en la puerta
              </Texto>
            </View>
          ) : (
            <Texto variante="pequenio" style={{ color: colores.tintaPapelSecundaria, marginTop: espacio.xs }}>
              {pendiente ? "Se activa cuando pagues" : "Ya no sirve para entrar"}
            </Texto>
          )}
        </View>
      </View>

      {sello && (
        <View
          pointerEvents="none"
          style={{ position: "absolute", left: 0, right: 0, bottom: 52, alignItems: "center" }}
        >
          <View
            style={{
              transform: [{ rotate: "-10deg" }],
              borderWidth: 3,
              borderColor: colores[sello.color],
              borderRadius: radio.sm,
              paddingHorizontal: espacio.lg,
              paddingVertical: espacio.xs,
              backgroundColor: `${colores.papel}CC`,
            }}
          >
            <Texto variante="titulo" style={{ color: colores[sello.color] }}>
              {sello.texto}
            </Texto>
          </View>
        </View>
      )}
    </View>
  );
}
