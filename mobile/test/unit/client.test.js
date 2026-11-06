import { http, HttpResponse } from "msw";

import { almacenamiento } from "../../src/api/almacenamiento";
import { ApiError, configurarSesion, olvidarSesion, pedir } from "../../src/api/client";
import { API, servidor } from "../helpers/servidor";

// Un backend que nunca contesta (sin un timer de por medio, para que Jest pueda terminar).
const sinRespuesta = () => new Promise(() => {});

const pedirSinSesion = (ruta, opciones) => pedir(ruta, { autenticado: false, ...opciones });
const fallaAl = (promesa) =>
  promesa.then(
    () => {
      throw new Error("Se esperaba que fallara");
    },
    (error) => error,
  );

describe("pedir", () => {
  it("devuelve el JSON de la respuesta", async () => {
    servidor.use(http.get(`${API}/categorias`, () => HttpResponse.json([{ id: "musica" }])));

    await expect(pedirSinSesion("/categorias")).resolves.toEqual([{ id: "musica" }]);
  });

  it("convierte el error del backend en un ApiError con su código", async () => {
    servidor.use(
      http.get(`${API}/compras/x`, () =>
        HttpResponse.json({ error: { codigo: "SIN_CUPO", mensaje: "No quedan entradas" } }, { status: 409 }),
      ),
    );

    const error = await fallaAl(pedirSinSesion("/compras/x"));

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, codigo: "SIN_CUPO", message: "No quedan entradas" });
  });

  it("devuelve el detalle de validación de cada campo", async () => {
    servidor.use(
      http.post(`${API}/auth/login`, () =>
        HttpResponse.json(
          {
            error: { codigo: "VALIDACION", mensaje: "Datos", detalles: [{ campo: "email", mensaje: "Mal" }] },
          },
          { status: 400 },
        ),
      ),
    );

    const error = await fallaAl(pedirSinSesion("/auth/login", { metodo: "POST", body: {} }));

    expect(error.errorDe("email")).toBe("Mal");
  });

  describe("mensajes que no dependen del backend", () => {
    it("un 500 no muestra el texto crudo del servidor", async () => {
      servidor.use(
        http.get(`${API}/x`, () =>
          HttpResponse.json(
            { error: { codigo: "ERROR_INTERNO", mensaje: "Error interno del servidor" } },
            { status: 500 },
          ),
        ),
      );

      const error = await fallaAl(pedirSinSesion("/x"));

      expect(error.message).toBe("Tuvimos un problema interno. Probá de nuevo en unos minutos.");
    });

    it("un 404 no le muestra el id a la persona", async () => {
      servidor.use(
        http.get(`${API}/x`, () =>
          HttpResponse.json(
            { error: { codigo: "NO_ENCONTRADO", mensaje: "No existe el evento 00000000-0000" } },
            { status: 404 },
          ),
        ),
      );

      const error = await fallaAl(pedirSinSesion("/x"));

      expect(error.status).toBe(404);
      expect(error.message).not.toContain("00000000");
    });

    it("un 503 con un motivo propio conserva el mensaje del servicio", async () => {
      servidor.use(
        http.get(`${API}/x`, () =>
          HttpResponse.json(
            { error: { codigo: "PASARELA_NO_DISPONIBLE", mensaje: "Los pagos no están disponibles" } },
            { status: 503 },
          ),
        ),
      );

      const error = await fallaAl(pedirSinSesion("/x"));

      expect(error.message).toBe("Los pagos no están disponibles");
    });

    it("una respuesta de error sin JSON (un proxy, por ejemplo) se trata como problema interno", async () => {
      servidor.use(http.get(`${API}/x`, () => new HttpResponse("Bad gateway", { status: 502 })));

      const error = await fallaAl(pedirSinSesion("/x"));

      expect(error.message).toBe("Tuvimos un problema interno. Probá de nuevo en unos minutos.");
    });
  });

  describe("429", () => {
    it("guarda cuánto esperar según Retry-After en segundos", async () => {
      servidor.use(
        http.get(
          `${API}/x`,
          () =>
            new HttpResponse(null, {
              status: 429,
              headers: { "Retry-After": "30" },
            }),
        ),
      );

      const error = await fallaAl(pedirSinSesion("/x"));

      expect(error).toMatchObject({ status: 429, retryAfterMs: 30_000 });
      expect(error.message).toBe("Hiciste muchos intentos. Probá de nuevo en unos minutos.");
    });

    it("entiende Retry-After como fecha", async () => {
      const enUnMinuto = new Date(Date.now() + 60_000).toUTCString();
      servidor.use(
        http.get(
          `${API}/x`,
          () => new HttpResponse(null, { status: 429, headers: { "Retry-After": enUnMinuto } }),
        ),
      );

      const error = await fallaAl(pedirSinSesion("/x"));

      expect(error.retryAfterMs).toBeGreaterThan(50_000);
      expect(error.retryAfterMs).toBeLessThanOrEqual(60_000);
    });

    it("sin Retry-After no inventa una espera", async () => {
      servidor.use(http.get(`${API}/x`, () => new HttpResponse(null, { status: 429 })));

      const error = await fallaAl(pedirSinSesion("/x"));

      expect(error.retryAfterMs).toBeNull();
    });
  });

  describe("sin respuesta del servidor", () => {
    it("una falla de red es SIN_CONEXION con status 0", async () => {
      servidor.use(http.get(`${API}/x`, () => HttpResponse.error()));

      const error = await fallaAl(pedirSinSesion("/x"));

      expect(error).toMatchObject({ status: 0, codigo: "SIN_CONEXION" });
    });

    it("un backend colgado corta por timeout y cuenta como reintentable", async () => {
      servidor.use(http.get(`${API}/x`, sinRespuesta));

      const error = await fallaAl(pedirSinSesion("/x", { timeoutMs: 20 }));

      expect(error).toMatchObject({ status: 0, codigo: "TIMEOUT" });
    });

    it("cancelar con signal no se confunde con un error de conexión", async () => {
      servidor.use(http.get(`${API}/x`, sinRespuesta));
      const controlador = new AbortController();

      const pedido = fallaAl(pedirSinSesion("/x", { signal: controlador.signal }));
      controlador.abort();
      const error = await pedido;

      expect(error.name).toBe("AbortError");
    });
  });

  describe("sesión", () => {
    beforeEach(async () => {
      await olvidarSesion();
    });

    it("con un 401 renueva el token una vez y repite la request", async () => {
      await almacenamiento.guardarRefreshToken("refresh-viejo");
      configurarSesion({ accessToken: "vencido", alCerrarse: () => {} });
      const autorizaciones = [];
      servidor.use(
        http.get(`${API}/usuarios/me`, ({ request }) => {
          const autorizacion = request.headers.get("Authorization");
          autorizaciones.push(autorizacion);
          return autorizacion === "Bearer nuevo"
            ? HttpResponse.json({ id: "u-1" })
            : new HttpResponse(null, { status: 401 });
        }),
        http.post(`${API}/auth/refresh`, () =>
          HttpResponse.json({ accessToken: "nuevo", refreshToken: "refresh-nuevo" }),
        ),
      );

      await expect(pedir("/usuarios/me")).resolves.toEqual({ id: "u-1" });

      expect(autorizaciones).toEqual(["Bearer vencido", "Bearer nuevo"]);
      await expect(almacenamiento.obtenerRefreshToken()).resolves.toBe("refresh-nuevo");
    });

    it("si no se puede renovar, cierra la sesión", async () => {
      await almacenamiento.guardarRefreshToken("refresh-revocado");
      const alCerrarse = jest.fn();
      configurarSesion({ accessToken: "vencido", alCerrarse });
      servidor.use(
        http.get(`${API}/usuarios/me`, () => new HttpResponse(null, { status: 401 })),
        http.post(`${API}/auth/refresh`, () => new HttpResponse(null, { status: 401 })),
      );

      const error = await fallaAl(pedir("/usuarios/me"));

      expect(error.status).toBe(401);
      expect(alCerrarse).toHaveBeenCalledTimes(1);
      await expect(almacenamiento.obtenerRefreshToken()).resolves.toBeNull();
    });
  });
});
