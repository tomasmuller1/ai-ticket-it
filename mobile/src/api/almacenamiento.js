import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

// En el celular el refresh token se guarda cifrado (Keychain / Keystore).
// SecureStore no existe en web: ahí se usa localStorage, solo para desarrollo.
const CLAVE_REFRESH = "aiticketit.refreshToken";

const web = {
  obtener: async (clave) => globalThis.localStorage?.getItem(clave) ?? null,
  guardar: async (clave, valor) => globalThis.localStorage?.setItem(clave, valor),
  borrar: async (clave) => globalThis.localStorage?.removeItem(clave),
};

const nativo = {
  obtener: (clave) => SecureStore.getItemAsync(clave),
  guardar: (clave, valor) => SecureStore.setItemAsync(clave, valor),
  borrar: (clave) => SecureStore.deleteItemAsync(clave),
};

const almacen = Platform.OS === "web" ? web : nativo;

export const almacenamiento = {
  obtenerRefreshToken: () => almacen.obtener(CLAVE_REFRESH),
  guardarRefreshToken: (token) => almacen.guardar(CLAVE_REFRESH, token),
  borrarRefreshToken: () => almacen.borrar(CLAVE_REFRESH),
};
