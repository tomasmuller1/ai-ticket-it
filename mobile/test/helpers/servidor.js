import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

export const API = "http://api.test/api";

// La API simulada de los tests. Cada test agrega los handlers que necesita con servidor.use(...).
export const servidor = setupServer(
  // El botón de Google pide esto al montarse.
  http.get("https://accounts.google.com/.well-known/openid-configuration", () => HttpResponse.json({})),
);
