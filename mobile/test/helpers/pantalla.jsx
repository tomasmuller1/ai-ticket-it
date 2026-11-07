import { renderRouter } from "expo-router/testing-library";
import { http, HttpResponse } from "msw";

import { almacenamiento } from "../../src/api/almacenamiento";
import { SesionProvider, useSesion } from "../../src/context/SesionContext";
import { crearQueryClient, Proveedores } from "./render";
import { API, servidor } from "./servidor";

export const USUARIO = {
  id: "u-sofia",
  nombre: "Sofía",
  apellido: "Ruiz",
  email: "sofia@aiticketit.com",
  tieneContrasenia: true,
};

// Deja guardada una sesión: al montar, SesionProvider la restaura contra la API simulada, como al abrir la app.
export async function conSesion(usuario = USUARIO) {
  await almacenamiento.guardarRefreshToken("refresh-de-prueba");
  servidor.use(
    http.post(`${API}/auth/refresh`, () =>
      HttpResponse.json({ accessToken: "token-de-prueba", refreshToken: "refresh-de-prueba", usuario }),
    ),
  );
}

// Lo mismo que hace el layout raíz: no muestra nada hasta saber si hay sesión.
function EsperarSesion({ children }) {
  const { estado } = useSesion();
  return estado === "cargando" ? null : children;
}

// Monta pantallas reales con Expo Router, a partir de un mapa de rutas: { "evento/[id]/index": Detalle }.
export function renderPantalla(rutas, { initialUrl = "/", queryClient = crearQueryClient() } = {}) {
  return renderRouter(rutas, {
    initialUrl,
    wrapper: ({ children }) => (
      <Proveedores queryClient={queryClient}>
        <SesionProvider>
          <EsperarSesion>{children}</EsperarSesion>
        </SesionProvider>
      </Proveedores>
    ),
  });
}
