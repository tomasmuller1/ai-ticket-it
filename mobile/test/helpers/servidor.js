import { setupServer } from "msw/node";

export const API = "http://api.test/api";

// La API simulada de los tests. Cada test agrega los handlers que necesita con servidor.use(...).
export const servidor = setupServer();
