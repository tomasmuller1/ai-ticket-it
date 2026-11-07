import { describirError } from "../../src/utils/errores";

describe("describirError", () => {
  it.each([
    ["sin conexión", { status: 0, codigo: "SIN_CONEXION" }],
    ["timeout", { status: 0, codigo: "TIMEOUT" }],
  ])("con %s ofrece reintentar y habla de la conexión", (_nombre, error) => {
    expect(describirError(error)).toMatchObject({ titulo: "No pudimos conectarnos", reintentable: true });
  });

  it("con un 5xx distingue el problema interno de la falta de conexión", () => {
    const interno = describirError({ status: 500 });

    expect(interno).toMatchObject({ titulo: "Tuvimos un problema interno", reintentable: true });
    expect(interno.icono).not.toBe(describirError({ status: 0 }).icono);
  });

  it("con un 429 pide esperar, sin botón", () => {
    expect(describirError({ status: 429 })).toMatchObject({
      mensaje: "Probá de nuevo en unos minutos.",
      reintentable: false,
    });
  });

  it.each([
    ["evento", "Este evento ya no existe"],
    ["compra", "Esta compra ya no existe"],
    [undefined, "Esto ya no existe"],
  ])("con un 404 de %s solo avisa que no existe", (recurso, titulo) => {
    expect(describirError({ status: 404, message: "No existe 00000-1" }, recurso)).toEqual({
      icono: expect.any(String),
      titulo,
      reintentable: false,
    });
  });

  it.each([
    ["compra", "No tenés acceso a esta compra"],
    ["evento", "No tenés acceso a este evento"],
    [undefined, "No tenés acceso a esto"],
  ])("con un 403 de %s avisa que no tiene acceso", (recurso, titulo) => {
    expect(describirError({ status: 403 }, recurso)).toMatchObject({ titulo, reintentable: false });
  });

  it("con otro 4xx muestra el mensaje del backend, que explica la regla, sin reintentar", () => {
    expect(describirError({ status: 409, message: "Ya hay una operación en curso" })).toMatchObject({
      mensaje: "Ya hay una operación en curso",
      reintentable: false,
    });
  });

  it("con un error desconocido no ofrece reintentar", () => {
    expect(describirError(new TypeError("x is not a function"))).toMatchObject({
      titulo: "No pudimos cargar esto",
      reintentable: false,
    });
  });
});
