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

const TIMEOUT_MS = 15_000;
const MENSAJE_INTERNO = "Tuvimos un problema interno. Probá de nuevo en unos minutos.";

// El mensaje del backend solo llega a la persona si explica algo que puede resolver (una regla de negocio
// o un servicio caído). El 500 es un texto técnico y el 404 puede traer ids.
function mensajeParaLaPersona(status, mensaje) {
  if (status === 429) return "Hiciste muchos intentos. Probá de nuevo en unos minutos.";
  if (status === 404) return "Esto ya no existe.";
  if (status === 500 || (status > 500 && !mensaje)) return MENSAJE_INTERNO;
  return mensaje ?? "No pudimos completar la operación. Probá de nuevo.";
}

// Error de la API con el formato del backend: { error: { codigo, mensaje, detalles? } }.
export class ApiError extends Error {
  constructor(status, { codigo, mensaje, detalles } = {}, retryAfterMs = null) {
    super(mensajeParaLaPersona(status, mensaje));
    this.status = status;
    this.codigo = codigo ?? "ERROR";
    this.detalles = detalles ?? [];
    this.retryAfterMs = retryAfterMs;
  }

  // Los errores de validación como { campo: mensaje }.
  porCampo() {
    return Object.fromEntries(this.detalles.map(({ campo, mensaje }) => [campo, mensaje]));
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

const TIMEOUT = new ApiError(0, {
  codigo: "TIMEOUT",
  mensaje: "El servidor tardó demasiado en responder. Revisá tu conexión e intentá de nuevo.",
});

// Retry-After puede venir en segundos o como fecha.
function leerRetryAfter(respuesta) {
  const valor = respuesta.headers.get("Retry-After");
  if (!valor) return null;
  const segundos = Number(valor);
  if (Number.isFinite(segundos)) return Math.max(0, segundos) * 1000;
  const fecha = Date.parse(valor);
  return Number.isNaN(fecha) ? null : Math.max(0, fecha - Date.now());
}

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

async function enviar(
  ruta,
  { metodo = "GET", body, query, autenticado = true, signal, timeoutMs = TIMEOUT_MS } = {},
) {
  const url = new URL(`${API_URL}${ruta}`);
  for (const [clave, valor] of Object.entries(query ?? {})) {
    if (valor !== undefined && valor !== null && valor !== "") url.searchParams.set(clave, String(valor));
  }

  // Un solo controlador para las dos formas de cortar: el timeout y quien pidió los datos (React Query).
  const corte = new AbortController();
  const cortar = () => corte.abort();
  const vencimiento = setTimeout(cortar, timeoutMs);
  if (signal?.aborted) cortar();
  signal?.addEventListener("abort", cortar);

  let respuesta;
  let datos = null;
  try {
    respuesta = await fetch(url, {
      method: metodo,
      headers: {
        Accept: "application/json",
        ...(body && { "Content-Type": "application/json" }),
        ...(autenticado && sesion.accessToken && { Authorization: `Bearer ${sesion.accessToken}` }),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: corte.signal,
    });
    if (respuesta.status !== 204) datos = await respuesta.json().catch(() => null);
    // El corte pudo llegar mientras se leía el cuerpo: esos datos no sirven.
    if (corte.signal.aborted) throw new Error("La request se cortó");
  } catch (error) {
    if (signal?.aborted) throw error;
    throw corte.signal.aborted ? TIMEOUT : SIN_CONEXION;
  } finally {
    clearTimeout(vencimiento);
    signal?.removeEventListener("abort", cortar);
  }

  if (!respuesta.ok) {
    throw new ApiError(respuesta.status, datos?.error, leerRetryAfter(respuesta));
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
