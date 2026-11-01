import { useEffect, useState } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Crypto from "expo-crypto";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri, ResponseType, useAuthRequest, useAutoDiscovery } from "expo-auth-session";

// Cierra la ventana emergente de Google cuando vuelve a la app (en web).
WebBrowser.maybeCompleteAuthSession();

const ID_CLIENTE_WEB = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const ID_CLIENTE_IOS = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

// Expo Go no permite volver a la app desde el login de Google (no tiene un esquema propio): ahí el botón
// no se muestra. Funciona en web y en una development build, con el ID de cliente de cada plataforma.
function idClienteDisponible() {
  if (Platform.OS === "web") return ID_CLIENTE_WEB;
  if (Constants.executionEnvironment === "storeClient") return undefined;
  return Platform.OS === "ios" ? ID_CLIENTE_IOS : undefined;
}

// Inicio de sesión con Google (OpenID Connect): Google devuelve un ID token y el backend lo verifica en
// /api/auth/google. `disponible` es false si no hay credenciales o la plataforma no lo permite.
export function useLoginGoogle({ alObtenerToken }) {
  const idCliente = idClienteDisponible();
  const descubrimiento = useAutoDiscovery("https://accounts.google.com");
  const [nonce] = useState(() => Crypto.randomUUID());
  const [pedido, respuesta, abrirGoogle] = useAuthRequest(
    {
      clientId: idCliente ?? "sin-configurar",
      responseType: ResponseType.IdToken,
      scopes: ["openid", "profile", "email"],
      redirectUri: makeRedirectUri(),
      usePKCE: false,
      extraParams: { nonce },
    },
    descubrimiento,
  );

  useEffect(() => {
    if (respuesta?.type === "success" && respuesta.params.id_token) {
      alObtenerToken(respuesta.params.id_token);
    }
  }, [respuesta, alObtenerToken]);

  return {
    disponible: Boolean(idCliente),
    listo: Boolean(idCliente && pedido),
    abrirGoogle,
    cancelado: respuesta?.type === "dismiss" || respuesta?.type === "cancel",
  };
}
