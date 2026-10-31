import Constants from "expo-constants";

// En desarrollo, el backend corre en la misma máquina que el servidor de Expo:
// tomamos su IP de la red local para que el celular pueda alcanzarlo.
// Se puede forzar otra URL con EXPO_PUBLIC_API_URL en mobile/.env.local.
function resolverApiUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  const host = Constants.expoConfig?.hostUri?.split(":")[0] ?? "localhost";
  return `http://${host}:3000/api`;
}

export const API_URL = resolverApiUrl();

async function get(path) {
  const res = await fetch(`${API_URL}${path}`);
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error ?? `Error ${res.status}`);
  }
  return body;
}

export const api = {
  listarEventos: () => get("/eventos"),
};
