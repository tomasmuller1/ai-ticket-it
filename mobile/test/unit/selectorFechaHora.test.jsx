import { screen } from "@testing-library/react-native";

import { SelectorFechaHora } from "../../src/components/SelectorFechaHora";
import { renderConProveedores } from "../helpers/render";

beforeEach(() => {
  // El selector de iOS avisa que `onChange` está deprecado: no tiene que ver con estos tests.
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

const props = { etiqueta: "Fecha y hora", valor: new Date(2027, 0, 10, 21), onCambiar: () => {} };

describe("SelectorFechaHora", () => {
  it("el error se anuncia como el de los demás campos", async () => {
    await renderConProveedores(<SelectorFechaHora {...props} error="La fecha tiene que ser futura." />);

    expect(screen.getByText("La fecha tiene que ser futura.").props.accessibilityLiveRegion).toBe("polite");
  });

  it("el error lleva el ícono de alerta, no solo el color", async () => {
    await renderConProveedores(<SelectorFechaHora {...props} error="La fecha tiene que ser futura." />);

    // El ícono es el hermano que va antes del texto del error.
    const fila = screen.getByText("La fecha tiene que ser futura.").parent;
    expect(fila.children).toHaveLength(2);
  });

  it("sin error no muestra el aviso", async () => {
    await renderConProveedores(<SelectorFechaHora {...props} />);

    expect(screen.queryByText("La fecha tiene que ser futura.")).toBeNull();
  });
});
