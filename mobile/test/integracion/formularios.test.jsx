import { fireEvent, screen, waitFor } from "expo-router/testing-library";
import { http, HttpResponse } from "msw";
import { Stack } from "expo-router";
import { AccessibilityInfo } from "react-native";

import NuevoEvento from "../../src/app/organizador/evento/nuevo";
import Registro from "../../src/app/registro";
import { conSesion, renderPantalla } from "../helpers/pantalla";
import { API, servidor } from "../helpers/servidor";

const RUTAS = { index: () => null, registro: Registro, login: () => null };

let enfocar;
let anunciar;

beforeEach(() => {
  enfocar = jest.fn();
  AccessibilityInfo.sendAccessibilityEvent = enfocar;
  anunciar = jest.spyOn(AccessibilityInfo, "announceForAccessibility").mockImplementation(() => {});
  anunciar.mockClear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// Qué elemento recibió el foco del lector: busca el campo cuya etiqueta coincide.
const elementoEnfocado = () => enfocar.mock.calls.at(-1)[0];

describe("Registro", () => {
  it("marca los obligatorios y explica cómo se marcan", async () => {
    await renderPantalla(RUTAS, { initialUrl: "/registro" });

    expect(await screen.findByText("Los campos con * son obligatorios.")).toBeTruthy();
    expect(screen.getByLabelText("Nombre, obligatorio")).toBeTruthy();
    expect(screen.getByLabelText("Email, obligatorio")).toBeTruthy();
  });

  it("al enviarlo vacío, muestra cada error junto a su campo", async () => {
    await renderPantalla(RUTAS, { initialUrl: "/registro" });

    await fireEvent.press(await screen.findByRole("button", { name: "Crear cuenta" }));

    expect(screen.getByText("Ingresá tu nombre.")).toBeTruthy();
    expect(screen.getByText("Ingresá un email válido.")).toBeTruthy();
    expect(screen.getByLabelText("Nombre, obligatorio").props.accessibilityHint).toBe(
      "Error: Ingresá tu nombre.",
    );
  });

  it("lleva el foco del lector al primer campo con error", async () => {
    await renderPantalla(RUTAS, { initialUrl: "/registro" });

    await fireEvent.press(await screen.findByRole("button", { name: "Crear cuenta" }));

    await waitFor(() => expect(enfocar).toHaveBeenCalledTimes(1));
    expect(enfocar).toHaveBeenCalledWith(expect.anything(), "focus");
    expect(elementoEnfocado()).toBeTruthy();
  });

  it("no mueve el foco mientras la persona corrige un campo", async () => {
    await renderPantalla(RUTAS, { initialUrl: "/registro" });
    await fireEvent.press(await screen.findByRole("button", { name: "Crear cuenta" }));
    await waitFor(() => expect(enfocar).toHaveBeenCalledTimes(1));

    await fireEvent.changeText(screen.getByLabelText("Nombre, obligatorio"), "Sofía");

    expect(enfocar).toHaveBeenCalledTimes(1);
  });

  it("anuncia cuántos campos hay que revisar", async () => {
    await renderPantalla(RUTAS, { initialUrl: "/registro" });

    await fireEvent.press(await screen.findByRole("button", { name: "Crear cuenta" }));

    await waitFor(() => expect(anunciar).toHaveBeenCalledWith("Revisá 4 campos con errores."));
  });

  it("también lleva el foco cuando el error lo devuelve el backend", async () => {
    servidor.use(
      http.post(`${API}/auth/registro`, () =>
        HttpResponse.json(
          { error: { codigo: "EMAIL_EN_USO", mensaje: "Ya existe una cuenta con ese email" } },
          { status: 409 },
        ),
      ),
    );
    await renderPantalla(RUTAS, { initialUrl: "/registro" });
    await fireEvent.changeText(await screen.findByLabelText("Nombre, obligatorio"), "Sofía");
    await fireEvent.changeText(screen.getByLabelText("Apellido, obligatorio"), "Ruiz");
    await fireEvent.changeText(screen.getByLabelText("Email, obligatorio"), "sofia@aiticketit.com");
    await fireEvent.changeText(screen.getByLabelText("Contraseña, obligatorio"), "aiticketit123");

    await fireEvent.press(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(await screen.findByText("Ya existe una cuenta con ese email")).toBeTruthy();
    await waitFor(() => expect(enfocar).toHaveBeenCalledTimes(1));
    expect(anunciar).toHaveBeenCalledWith("Ya existe una cuenta con ese email");
  });

  it("muestra los requisitos de la contraseña y los tilda mientras se escribe", async () => {
    await renderPantalla(RUTAS, { initialUrl: "/registro" });

    await fireEvent.changeText(await screen.findByLabelText("Contraseña, obligatorio"), "abc1");

    expect(screen.getByLabelText("Una letra: cumplido")).toBeTruthy();
    expect(screen.getByLabelText("Al menos 8 caracteres: falta")).toBeTruthy();
  });
});

describe("Nuevo evento", () => {
  it("un error de la API en multimedia.0 se muestra debajo de Imagen", async () => {
    // El selector de fecha de iOS avisa que `onChange` está deprecado: no tiene que ver con este test.
    jest.spyOn(console, "warn").mockImplementation(() => {});
    await conSesion();
    servidor.use(
      http.get(`${API}/categorias`, () => HttpResponse.json([{ id: "c-musica", nombre: "Música" }])),
      http.post(`${API}/eventos`, () =>
        HttpResponse.json(
          {
            error: {
              codigo: "VALIDACION",
              mensaje: "Revisá los datos",
              detalles: [{ campo: "multimedia.0", mensaje: "La imagen tiene que ser una URL válida." }],
            },
          },
          { status: 400 },
        ),
      ),
    );
    await renderPantalla(
      { _layout: () => <Stack />, index: () => null, "organizador/evento/nuevo": NuevoEvento },
      {
        initialUrl: "/organizador/evento/nuevo",
      },
    );
    await fireEvent.changeText((await screen.findAllByLabelText("Nombre, obligatorio"))[0], "Recital");
    await fireEvent.changeText(screen.getByLabelText("Descripción, obligatorio"), "Un recital");
    await fireEvent.press(await screen.findByRole("button", { name: "Música" }));
    await fireEvent.changeText(screen.getByLabelText("Lugar, obligatorio"), "La Trastienda");
    await fireEvent.changeText(screen.getAllByLabelText("Nombre, obligatorio")[1], "General");
    await fireEvent.changeText(screen.getByLabelText("Precio ($), obligatorio"), "1000");
    await fireEvent.changeText(screen.getByLabelText("Cupo, obligatorio"), "50");
    await fireEvent.changeText(
      screen.getByLabelText("Imagen (opcional)"),
      "https://imagenes.test/portada.jpg",
    );

    await fireEvent.press(screen.getByRole("button", { name: "Publicar evento" }));

    expect(await screen.findByText("La imagen tiene que ser una URL válida.")).toBeTruthy();
    expect(screen.getByLabelText("Imagen (opcional)").props.accessibilityHint).toBe(
      "Error: La imagen tiene que ser una URL válida.",
    );
  });
});
