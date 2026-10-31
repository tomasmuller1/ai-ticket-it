import { createApp } from "../../src/app.js";
import { cargarConfig } from "../../src/infra/config.js";
import { ServicioTokens } from "../../src/auth/ServicioTokens.js";
import { unReloj } from "./fabricas.js";

export function configDePrueba(env = {}) {
  return cargarConfig({ NODE_ENV: "test", ...env });
}

// App con datos de ejemplo y el reloj fijo en HOY, para que los tests sean deterministas.
export function crearAppDePrueba(dependencias = {}) {
  return createApp({ config: configDePrueba(), reloj: unReloj(), ...dependencias });
}

// Header Authorization con un access token válido para el usuario (firmado con la config de prueba).
export function comoUsuario(usuarioId) {
  const { token } = new ServicioTokens(configDePrueba().auth, unReloj()).emitirAccessToken({ id: usuarioId });
  return { Authorization: `Bearer ${token}` };
}

export const SECRETO_PRODUCCION = "x".repeat(32);
