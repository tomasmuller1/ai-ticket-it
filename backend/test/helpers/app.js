import { createApp } from "../../src/app.js";
import { cargarConfig } from "../../src/infra/config.js";
import { unReloj } from "./fabricas.js";

export function configDePrueba(env = {}) {
  return cargarConfig({ NODE_ENV: "test", ...env });
}

// App con datos de ejemplo y el reloj fijo en HOY, para que los tests sean deterministas.
export function crearAppDePrueba(dependencias = {}) {
  return createApp({ config: configDePrueba(), reloj: unReloj(), ...dependencias });
}

export const autenticadorQueRechaza = { autenticar: async () => null };
