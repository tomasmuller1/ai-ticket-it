import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

export const API = "http://api.test/api";

// La API simulada de los tests. Cada test agrega los handlers que necesita con servidor.use(...).
export const servidor = setupServer(
  // El botón de Google pide esto al montarse.
  http.get("https://accounts.google.com/.well-known/openid-configuration", () => HttpResponse.json({})),
  // Con las pestañas montadas, la barra consulta las no leídas cada 15 segundos: por defecto no hay ninguna.
  http.get(`${API}/notificaciones/resumen`, () => HttpResponse.json({ noLeidas: 0 })),
);

// Una página única de una lista paginada de la API ({ data, page, pageSize, total }).
export const paginaDe = (data) => ({ data, page: 1, pageSize: 10, total: data.length });
