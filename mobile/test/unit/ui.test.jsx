import { fireEvent, screen } from "@testing-library/react-native";

import { EstadoVacio } from "../../src/components/ui";
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
