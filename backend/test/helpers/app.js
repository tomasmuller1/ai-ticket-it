import { createApp } from "../../src/app.js";
import { cargarConfig } from "../../src/infra/config.js";

export function configDePrueba(env = {}) {
  return cargarConfig({ NODE_ENV: "test", ...env });
}

export function crearAppDePrueba(dependencias = {}) {
  return createApp({ config: configDePrueba(), ...dependencias });
}
