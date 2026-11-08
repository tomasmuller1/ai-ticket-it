import { screen } from "@testing-library/react-native";

import { BarraNavegacion } from "../../src/components/BarraNavegacion";
import { burbuja } from "../../src/theme";
import { Proveedores, renderConProveedores } from "../helpers/render";

// Lo que las Tabs de Expo Router le pasan a la barra en SDK 58: sin `navigation`, con `emitter` y `navigateToTab`.
function propsDeBarra({ indice = 0, avisos = {} } = {}) {
  return {
    state: {
      index: indice,
      routes: [
        { key: "index-1", name: "index" },
        { key: "notificaciones-2", name: "notificaciones" },
      ],
    },
    descriptors: {
      "index-1": { options: { title: "Explorar", icono: "compass" } },
      "notificaciones-2": { options: { title: "Avisos", icono: "notifications", ...avisos } },
    },
    emitter: { emit: jest.fn(() => ({ defaultPrevented: false })) },
    navigateToTab: jest.fn(),
    insets: { top: 0, right: 0, bottom: 0, left: 0 },
  };
}

const CON_TRES = { tabBarBadge: "3", tabBarAccessibilityLabel: "Notificaciones, 3 sin leer" };

describe("BarraNavegacion", () => {
  // La burbuja se ve, pero el lector no la lee suelta: ya oye la etiqueta de la pestaña.
  it.each([
    ["inactiva", 0],
    ["activa", 1],
  ])("muestra la burbuja con el texto de tabBarBadge (pestaña %s)", async (_caso, indice) => {
    await renderConProveedores(<BarraNavegacion {...propsDeBarra({ indice, avisos: CON_TRES })} />);

    expect(screen.getByText("3", { includeHiddenElements: true })).toBeTruthy();
  });

  it("el lector no lee la burbuja suelta: la cantidad ya está en la etiqueta de la pestaña", async () => {
    await renderConProveedores(<BarraNavegacion {...propsDeBarra({ avisos: CON_TRES })} />);

    expect(screen.queryByText("3")).toBeNull();
  });

  // Hallazgo de la verificación en Expo web: en la píldora activa, la burbuja sobresale del ícono y pisaba la "A".
  it("en la píldora activa, el nombre se corre para que la burbuja no lo pise", async () => {
    await renderConProveedores(<BarraNavegacion {...propsDeBarra({ indice: 1, avisos: CON_TRES })} />);

    expect(screen.getByText("Avisos")).toHaveStyle({ marginLeft: burbuja.margenTexto });
  });

  it("sin burbuja, el nombre de la píldora activa no se corre", async () => {
    await renderConProveedores(<BarraNavegacion {...propsDeBarra({ indice: 1 })} />);

    expect(screen.getByText("Avisos")).toHaveStyle({ marginLeft: 0 });
  });

  it("con la letra agrandada, la burbuja crece hasta un tope en lugar de cortar el número", async () => {
    await renderConProveedores(<BarraNavegacion {...propsDeBarra({ avisos: CON_TRES })} />);

    const numero = screen.getByText("3", { includeHiddenElements: true });
    expect(numero.props.maxFontSizeMultiplier).toBe(burbuja.escalaMaxima);
    expect(numero.parent).toHaveStyle({ minHeight: burbuja.alto });
    expect(numero.parent).not.toHaveStyle({ height: burbuja.alto });
  });

  it("la pestaña anuncia la etiqueta accesible con las no leídas", async () => {
    await renderConProveedores(<BarraNavegacion {...propsDeBarra({ avisos: CON_TRES })} />);

    expect(screen.getByRole("tab", { name: "Notificaciones, 3 sin leer" })).toBeTruthy();
  });

  it("sin etiqueta accesible, la pestaña se anuncia con su título", async () => {
    await renderConProveedores(<BarraNavegacion {...propsDeBarra()} />);

    expect(screen.getByRole("tab", { name: "Explorar" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Avisos" })).toBeTruthy();
  });

  it("sin tabBarBadge no dibuja la burbuja", async () => {
    await renderConProveedores(<BarraNavegacion {...propsDeBarra({ avisos: CON_TRES })} />);
    expect(screen.getByText("3", { includeHiddenElements: true })).toBeTruthy();

    await screen.rerender(
      <Proveedores>
        <BarraNavegacion {...propsDeBarra({ avisos: { tabBarBadge: undefined } })} />
      </Proveedores>,
    );

    expect(screen.queryByText("3", { includeHiddenElements: true })).toBeNull();
  });
});
