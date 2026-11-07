import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { AccessibilityInfo, Platform, Pressable, Text } from "react-native";

import { useAvisos } from "../../src/components/Avisos";
import { RequisitosContrasenia } from "../../src/components/RequisitosContrasenia";
import { AvisoError, BloqueCargando, Campo, Skeleton } from "../../src/components/ui";
import { renderConProveedores } from "../helpers/render";

let anuncio;

beforeEach(() => {
  anuncio = jest.spyOn(AccessibilityInfo, "announceForAccessibility").mockImplementation(() => {});
  anuncio.mockClear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("Campo", () => {
  it("un campo obligatorio se marca con un asterisco y lo dice en su etiqueta", async () => {
    await renderConProveedores(<Campo etiqueta="Email" obligatorio />);

    expect(screen.getByLabelText("Email, obligatorio")).toBeTruthy();
    // El asterisco se ve pero el lector no lo lee: ya oye "obligatorio".
    expect(screen.getByText("*", { includeHiddenElements: true })).toBeTruthy();
  });

  it("un campo opcional no lleva marca", async () => {
    await renderConProveedores(<Campo etiqueta="Imagen" />);

    expect(screen.getByLabelText("Imagen")).toBeTruthy();
    expect(screen.queryByText("*", { includeHiddenElements: true })).toBeNull();
  });

  it("asocia el error al campo: el lector lo lee junto con la etiqueta", async () => {
    await renderConProveedores(<Campo etiqueta="Email" error="Ingresá un email válido." />);

    expect(screen.getByLabelText("Email").props.accessibilityHint).toBe("Error: Ingresá un email válido.");
  });

  it("sin error, la ayuda es lo que se asocia al campo", async () => {
    await renderConProveedores(<Campo etiqueta="Contraseña" ayuda="Al menos 8 caracteres." />);

    expect(screen.getByLabelText("Contraseña").props.accessibilityHint).toBe("Al menos 8 caracteres.");
  });
});

describe("AvisoError", () => {
  it("en iOS se anuncia al aparecer: accessibilityLiveRegion es solo de Android", async () => {
    jest.replaceProperty(Platform, "OS", "ios");

    await renderConProveedores(<AvisoError>No pudimos guardar.</AvisoError>);

    expect(anuncio).toHaveBeenCalledWith("No pudimos guardar.");
  });

  it("en Android no se anuncia a mano, para que no se lea dos veces", async () => {
    jest.replaceProperty(Platform, "OS", "android");

    await renderConProveedores(<AvisoError>No pudimos guardar.</AvisoError>);

    expect(anuncio).not.toHaveBeenCalled();
  });

  it("sin mensaje no anuncia nada", async () => {
    await renderConProveedores(<AvisoError>{null}</AvisoError>);

    expect(anuncio).not.toHaveBeenCalled();
  });
});

describe("BloqueCargando", () => {
  it("le da un nombre a la carga y agrupa los bloques en un solo elemento", async () => {
    await renderConProveedores(
      <BloqueCargando etiqueta="Cargando eventos">
        <Skeleton />
        <Skeleton />
      </BloqueCargando>,
    );

    expect(screen.getByRole("progressbar", { name: "Cargando eventos" })).toBeTruthy();
  });

  it("anuncia la carga si tarda", async () => {
    await renderConProveedores(<BloqueCargando etiqueta="Cargando eventos" />);

    await waitFor(() => expect(anuncio).toHaveBeenCalledWith("Cargando eventos"));
  });

  it("no anuncia nada si los datos llegan enseguida", async () => {
    const { unmount } = await renderConProveedores(<BloqueCargando etiqueta="Cargando eventos" />);

    await unmount();
    await new Promise((resolver) => setTimeout(resolver, 700));

    expect(anuncio).not.toHaveBeenCalled();
  });
});

describe("RequisitosContrasenia", () => {
  const cumplido = (texto) => screen.getByLabelText(`${texto}: cumplido`);
  const pendiente = (texto) => screen.getByLabelText(`${texto}: falta`);

  it("sin contraseña, faltan todos", async () => {
    await renderConProveedores(<RequisitosContrasenia valor="" />);

    expect(pendiente("Al menos 8 caracteres")).toBeTruthy();
    expect(pendiente("Una letra")).toBeTruthy();
    expect(pendiente("Un número")).toBeTruthy();
  });

  it("tilda cada requisito a medida que se cumple", async () => {
    await renderConProveedores(<RequisitosContrasenia valor="abc1" />);

    expect(pendiente("Al menos 8 caracteres")).toBeTruthy();
    expect(cumplido("Una letra")).toBeTruthy();
    expect(cumplido("Un número")).toBeTruthy();
  });

  it("con una contraseña válida, están todos cumplidos", async () => {
    await renderConProveedores(<RequisitosContrasenia valor="aiticketit123" />);

    expect(cumplido("Al menos 8 caracteres")).toBeTruthy();
  });
});

describe("Avisos", () => {
  function Avisador({ aviso }) {
    const { avisar } = useAvisos();
    return (
      <Pressable accessibilityRole="button" onPress={() => avisar(aviso)}>
        <Text>Avisar</Text>
      </Pressable>
    );
  }
  const avisar = () => fireEvent.press(screen.getByRole("button", { name: "Avisar" }));
  const pasan = (ms) => act(() => new Promise((resolver) => setTimeout(resolver, ms)));

  it("uno informativo se cierra solo", async () => {
    await renderConProveedores(<Avisador aviso={{ tipo: "exito", titulo: "Listo", duracion: 20 }} />);
    await avisar();

    expect(screen.getByText("Listo")).toBeTruthy();
    await waitFor(() => expect(screen.queryByText("Listo")).toBeNull());
  });

  it("uno de error se queda hasta que la persona lo cierra: necesita tiempo para leerlo", async () => {
    await renderConProveedores(<Avisador aviso={{ tipo: "error", titulo: "Falló", duracion: 20 }} />);
    await avisar();

    await pasan(100);
    expect(screen.getByText("Falló")).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: "Cerrar aviso" }));
    expect(screen.queryByText("Falló")).toBeNull();
  });
});
