import { act, renderHook, waitFor } from "@testing-library/react-native";
import { fireEvent, screen } from "expo-router/testing-library";
import { http, HttpResponse } from "msw";

import Comprar from "../../src/app/evento/[id]/comprar";
import DetalleEvento from "../../src/app/evento/[id]/index";
import EditarPerfil from "../../src/app/perfil/editar";
import { useBusquedaEventos } from "../../src/hooks/eventos";
import { conSesion, renderPantalla } from "../helpers/pantalla";
import { crearQueryClient, Proveedores } from "../helpers/render";
import { API, servidor } from "../helpers/servidor";

const RESUMEN = {
  id: "e-1",
  nombre: "Recital de prueba",
  categoria: { id: "musica", nombre: "Música" },
  fecha: "2026-12-10T21:00:00-03:00",
  lugar: "Estadio Único",
  imagen: "https://picsum.photos/1",
  precioDesde: 1000,
  agotado: false,
  finalizado: false,
  organizador: { id: "u-lucia", nombre: "Lucía", puntaje: null, cantidadResenias: 0 },
};
const DETALLE = {
  ...RESUMEN,
  descripcion: "Una noche inolvidable",
  multimedia: ["https://picsum.photos/1"],
  tiposEntrada: [{ id: "t-1", nombre: "Campo", descripcion: "", precio: 1000, cupo: 10, disponibles: 5 }],
  reseniasRecientes: [],
};
const RUTAS_EVENTO = {
  index: () => null,
  "evento/[id]/index": DetalleEvento,
  "evento/[id]/comprar": Comprar,
};

// Un backend que tarda: la respuesta sale recién cuando el test la libera.
function detalleDemorado() {
  const { promise, resolve } = Promise.withResolvers();
  servidor.use(
    http.get(`${API}/eventos/e-1`, async () => {
      await promise;
      return HttpResponse.json(DETALLE);
    }),
  );
  return resolve;
}

function clienteConBusqueda() {
  const queryClient = crearQueryClient();
  queryClient.setQueryData(["eventos", "busqueda", { q: "" }], {
    pages: [{ data: [RESUMEN], page: 1, pageSize: 10, total: 1 }],
    pageParams: [1],
  });
  return queryClient;
}

describe("Caché entre pantallas", () => {
  beforeEach(async () => {
    await conSesion();
    servidor.use(http.get(`${API}/usuarios/me/favoritos`, () => HttpResponse.json([])));
  });

  describe("Detalle de evento", () => {
    it("muestra enseguida lo que ya trajo la lista, sin el skeleton de toda la pantalla", async () => {
      const liberar = detalleDemorado();

      await renderPantalla(RUTAS_EVENTO, { initialUrl: "/evento/e-1", queryClient: clienteConBusqueda() });

      expect(await screen.findByText("Recital de prueba")).toBeTruthy();
      expect(screen.getByText("Estadio Único")).toBeTruthy();
      expect(screen.queryByRole("progressbar", { name: "Cargando el evento" })).toBeNull();
      expect(screen.getByRole("progressbar", { name: "Cargando el detalle" })).toBeTruthy();
      liberar();
    });

    it("completa el resto cuando llega el detalle", async () => {
      const liberar = detalleDemorado();
      await renderPantalla(RUTAS_EVENTO, { initialUrl: "/evento/e-1", queryClient: clienteConBusqueda() });
      await screen.findByText("Recital de prueba");

      liberar();

      expect(await screen.findByText("Una noche inolvidable")).toBeTruthy();
      expect(screen.getByText("Campo")).toBeTruthy();
      expect(screen.queryByRole("progressbar", { name: "Cargando el detalle" })).toBeNull();
    });

    it("también aprovecha los favoritos", async () => {
      const liberar = detalleDemorado();
      const queryClient = crearQueryClient();
      queryClient.setQueryData(["favoritos"], [RESUMEN]);
      servidor.use(http.get(`${API}/usuarios/me/favoritos`, () => HttpResponse.json([RESUMEN])));

      await renderPantalla(RUTAS_EVENTO, { initialUrl: "/evento/e-1", queryClient });

      expect(await screen.findByText("Recital de prueba")).toBeTruthy();
      liberar();
    });

    it("sin datos previos muestra el skeleton de la pantalla", async () => {
      const liberar = detalleDemorado();

      await renderPantalla(RUTAS_EVENTO, { initialUrl: "/evento/e-1" });

      expect(await screen.findByRole("progressbar", { name: "Cargando el evento" })).toBeTruthy();
      liberar();
    });
  });

  describe("Comprar", () => {
    it("pide los disponibles aunque el detalle esté en caché: 30 s de atraso importan si quedan pocas", async () => {
      const queryClient = crearQueryClient();
      // Los datos son recientes: para el resto de la app (30 s de staleTime) no haría falta pedirlos.
      queryClient.setDefaultOptions({ queries: { retry: false, gcTime: Infinity, staleTime: 30_000 } });
      queryClient.setQueryData(["eventos", "e-1"], DETALLE);
      servidor.use(
        http.get(`${API}/eventos/e-1`, () =>
          HttpResponse.json({
            ...DETALLE,
            tiposEntrada: [{ ...DETALLE.tiposEntrada[0], nombre: "Campo actualizado", disponibles: 1 }],
          }),
        ),
      );

      await renderPantalla(RUTAS_EVENTO, { initialUrl: "/evento/e-1/comprar", queryClient });

      expect(await screen.findByText("Campo actualizado")).toBeTruthy();
    });
  });

  describe("Búsqueda", () => {
    const pagina = (nombre) => ({
      data: [{ ...RESUMEN, id: nombre, nombre }],
      page: 1,
      pageSize: 10,
      total: 1,
    });

    function usarBusqueda(filtrosIniciales) {
      const queryClient = crearQueryClient();
      return renderHook(({ filtros }) => useBusquedaEventos(filtros), {
        initialProps: { filtros: filtrosIniciales },
        wrapper: ({ children }) => <Proveedores queryClient={queryClient}>{children}</Proveedores>,
      });
    }

    it("al cambiar los filtros mantiene la lista anterior hasta tener la nueva", async () => {
      const { promise, resolve } = Promise.withResolvers();
      servidor.use(
        http.get(`${API}/eventos`, async ({ request }) => {
          const q = new URL(request.url).searchParams.get("q");
          if (q === "b") await promise;
          return HttpResponse.json(pagina(q));
        }),
      );
      const { result, rerender } = await usarBusqueda({ q: "a" });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      await rerender({ filtros: { q: "b" } });

      expect(result.current.isPending).toBe(false);
      expect(result.current.isPlaceholderData).toBe(true);
      expect(result.current.data.pages[0].data[0].nombre).toBe("a");

      await act(async () => resolve());
      await waitFor(() => expect(result.current.data.pages[0].data[0].nombre).toBe("b"));
    });

    it("cancela la request anterior al cambiar los filtros", async () => {
      let cancelada = false;
      servidor.use(
        http.get(`${API}/eventos`, async ({ request }) => {
          const q = new URL(request.url).searchParams.get("q");
          if (q === "b") return HttpResponse.json(pagina(q));
          request.signal.addEventListener("abort", () => (cancelada = true));
          return new Promise(() => {});
        }),
      );
      const { result, rerender } = await usarBusqueda({ q: "a" });
      await waitFor(() => expect(result.current.isFetching).toBe(true));

      await rerender({ filtros: { q: "b" } });

      await waitFor(() => expect(cancelada).toBe(true));
    });
  });

  describe("Editar el perfil", () => {
    const RUTAS_PERFIL = { index: () => null, "perfil/editar": EditarPerfil };

    it("guarda los cambios y lo confirma", async () => {
      let cuerpo;
      servidor.use(
        http.patch(`${API}/usuarios/me`, async ({ request }) => {
          cuerpo = await request.json();
          return HttpResponse.json({ id: "u-sofia", nombre: "Sofi", apellido: "Ruiz", email: "s@a.com" });
        }),
      );
      await renderPantalla(RUTAS_PERFIL, { initialUrl: "/perfil/editar" });

      await fireEvent.changeText(await screen.findByLabelText("Nombre, obligatorio"), "Sofi");
      await fireEvent.press(screen.getByRole("button", { name: "Guardar cambios" }));

      expect(await screen.findByText("Guardamos tus datos.")).toBeTruthy();
      expect(cuerpo).toEqual({ nombre: "Sofi" });
    });

    it("muestra el error junto al campo", async () => {
      servidor.use(
        http.patch(`${API}/usuarios/me`, () =>
          HttpResponse.json(
            { error: { codigo: "EMAIL_EN_USO", mensaje: "Ya existe una cuenta con ese email" } },
            { status: 409 },
          ),
        ),
      );
      await renderPantalla(RUTAS_PERFIL, { initialUrl: "/perfil/editar" });

      await fireEvent.changeText(await screen.findByLabelText("Email, obligatorio"), "otra@a.com");
      await fireEvent.press(screen.getByRole("button", { name: "Guardar cambios" }));

      expect(await screen.findByText("Ya existe una cuenta con ese email")).toBeTruthy();
    });
  });
});
