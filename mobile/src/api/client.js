import { Platform } from "react-native";
import Constants from "expo-constants";

import { almacenamiento } from "./almacenamiento";

// En desarrollo el backend corre en la misma máquina que Expo: en el celular se usa la IP de la red
// local de esa máquina y en web, localhost. Se puede forzar con EXPO_PUBLIC_API_URL en mobile/.env.local.
function resolverApiUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (Platform.OS === "web") {
    return "http://localhost:3000/api";
  }
  const host = Constants.expoConfig?.hostUri?.split(":")[0] ?? "localhost";
  return `http://${host}:3000/api`;
}

export const API_URL = resolverApiUrl();

// Error de la API con el formato del backend: { error: { codigo, mensaje, detalles? } }.
export class ApiError extends Error {
  constructor(status, { codigo, mensaje, detalles } = {}) {
    super(mensaje ?? "No pudimos completar la operación. Probá de nuevo.");
    this.status = status;
    this.codigo = codigo ?? "ERROR";
    this.detalles = detalles ?? [];
  }

  // Mensaje de validación de un campo puntual, para mostrarlo debajo del input.
  errorDe(campo) {
    return this.detalles.find((detalle) => detalle.campo === campo)?.mensaje;
  }
}

const SIN_CONEXION = new ApiError(0, {
  codigo: "SIN_CONEXION",
  mensaje: "No pudimos conectarnos. Revisá tu conexión e intentá de nuevo.",
});

// Estado de la sesión del lado del cliente. El access token vive solo en memoria;
// el refresh token, en el almacenamiento seguro.
const sesion = {
  accessToken: null,
  refrescando: null,
  alCerrarse: () => {},
};

export function configurarSesion({ accessToken, alCerrarse }) {
  if (accessToken !== undefined) sesion.accessToken = accessToken;
  if (alCerrarse) sesion.alCerrarse = alCerrarse;
}

async function enviar(ruta, { metodo = "GET", body, query, autenticado = true } = {}) {
  const url = new URL(`${API_URL}${ruta}`);
  for (const [clave, valor] of Object.entries(query ?? {})) {
    if (valor !== undefined && valor !== null && valor !== "") url.searchParams.set(clave, String(valor));
  }

  let respuesta;
  try {
    respuesta = await fetch(url, {
      method: metodo,
      headers: {
        Accept: "application/json",
        ...(body && { "Content-Type": "application/json" }),
        ...(autenticado && sesion.accessToken && { Authorization: `Bearer ${sesion.accessToken}` }),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw SIN_CONEXION;
  }

  if (respuesta.status === 204) return null;
  const datos = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    throw new ApiError(respuesta.status, datos?.error);
  }
  return datos;
}

// Pide una sesión nueva con el refresh token. Si llegan varias requests con 401 a la vez,
// todas esperan el mismo refresh (así no se gasta el refresh token dos veces).
export function refrescarSesion() {
  sesion.refrescando ??= (async () => {
    try {
      const refreshToken = await almacenamiento.obtenerRefreshToken();
      if (!refreshToken) return null;
      const nueva = await enviar("/auth/refresh", {
        metodo: "POST",
        body: { refreshToken },
        autenticado: false,
      });
      await guardarSesion(nueva);
      return nueva;
    } catch (error) {
      if (error.status === 401) {
        await olvidarSesion();
        return null;
      }
      throw error;
    } finally {
      sesion.refrescando = null;
    }
  })();
  return sesion.refrescando;
}

export async function guardarSesion({ accessToken, refreshToken }) {
  sesion.accessToken = accessToken;
  await almacenamiento.guardarRefreshToken(refreshToken);
}

export async function olvidarSesion() {
  sesion.accessToken = null;
  await almacenamiento.borrarRefreshToken();
}

// Si el access token venció, se refresca una sola vez y se reintenta. Si no se puede, se cierra la sesión.
export async function pedir(ruta, opciones = {}) {
  try {
    return await enviar(ruta, opciones);
  } catch (error) {
    if (error.status !== 401 || opciones.autenticado === false) throw error;
    const nueva = await refrescarSesion();
    if (!nueva) {
      sesion.alCerrarse();
      throw error;
    }
    return enviar(ruta, opciones);
  }
}
