import { fireEvent, screen } from "@testing-library/react-native";

import { EstadoError, EstadoVacio } from "../../src/components/ui";
import { renderConProveedores } from "../helpers/render";

describe("EstadoVacio", () => {
  it("muestra el título y ejecuta la acción al tocarla", async () => {
    const alTocar = jest.fn();

    await renderConProveedores(
      <EstadoVacio titulo="Sin entradas" accion={{ titulo: "Explorar eventos", onPress: alTocar }} />,
    );
    await fireEvent.press(screen.getByRole("button", { name: "Explorar eventos" }));

    expect(screen.getByText("Sin entradas")).toBeTruthy();
    expect(alTocar).toHaveBeenCalledTimes(1);
  });
});

describe("EstadoError", () => {
  it.each([
    ["sin conexión", { status: 0 }],
    ["un 5xx", { status: 500 }],
  ])("con %s ofrece Reintentar", async (_nombre, error) => {
    const reintentar = jest.fn();

    await renderConProveedores(<EstadoError error={error} onReintentar={reintentar} />);
    await fireEvent.press(screen.getByRole("button", { name: "Reintentar" }));

    expect(reintentar).toHaveBeenCalledTimes(1);
  });

  it.each([400, 403, 404, 409, 429])(
    "con un %i no ofrece Reintentar aunque la pantalla lo pase",
    async (status) => {
      await renderConProveedores(<EstadoError error={{ status, message: "Algo" }} onReintentar={() => {}} />);

      expect(screen.queryByRole("button", { name: "Reintentar" })).toBeNull();
    },
  );

  it("con un 404 muestra solo el mensaje, sin el id que manda el backend", async () => {
    await renderConProveedores(
      <EstadoError error={{ status: 404, message: "No existe el evento 00000-1" }} recurso="evento" />,
    );

    expect(screen.getByText("Este evento ya no existe")).toBeTruthy();
    expect(screen.queryByText(/00000-1/)).toBeNull();
  });
});
