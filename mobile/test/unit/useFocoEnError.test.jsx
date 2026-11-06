import { act, renderHook } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";

import { useFocoEnError } from "../../src/hooks/useFocoEnError";

const campo = (y) => ({ measureLayout: jest.fn((_relativo, ok) => ok(0, y)) });
const crearScroll = () => ({ getInnerViewRef: () => "contenido", scrollTo: jest.fn() });

async function montar({ scroll, campos, reducido = false }) {
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(reducido);
  jest.spyOn(AccessibilityInfo, "announceForAccessibility").mockImplementation(() => {});
  const hook = await renderHook(() => useFocoEnError());
  if (scroll) hook.result.current.refScroll.current = scroll;
  // Se registran en el orden de la pantalla.
  Object.entries(campos).forEach(([nombre, nodo]) => hook.result.current.refDe(nombre)(nodo));
  // Deja que "Reducir movimiento" termine de leerse.
  await act(async () => {});
  return hook;
}

afterEach(() => jest.restoreAllMocks());

describe("useFocoEnError: desplazamiento", () => {
  it("desplaza hasta el primer campo con error, en el orden de la pantalla", async () => {
    const scroll = crearScroll();
    const hook = await montar({ scroll, campos: { nombre: campo(400), lugar: campo(900) } });

    await act(async () => hook.result.current.enfocarErrores({ lugar: "x", nombre: "y" }));

    expect(scroll.scrollTo).toHaveBeenCalledTimes(1);
    expect(scroll.scrollTo).toHaveBeenCalledWith({ y: 304, animated: true });
  });

  it("deja un margen y nunca pide una posición negativa", async () => {
    const scroll = crearScroll();
    const hook = await montar({ scroll, campos: { nombre: campo(20) } });

    await act(async () => hook.result.current.enfocarErrores({ nombre: "x" }));

    expect(scroll.scrollTo).toHaveBeenCalledWith({ y: 0, animated: true });
  });

  it("sin refScroll no desplaza ni rompe", async () => {
    const nombre = campo(400);
    const hook = await montar({ campos: { nombre } });

    await act(async () => hook.result.current.enfocarErrores({ nombre: "x" }));

    expect(nombre.measureLayout).not.toHaveBeenCalled();
  });

  it("no desplaza si ningún error tiene un campo", async () => {
    const scroll = crearScroll();
    const hook = await montar({ scroll, campos: { nombre: campo(400) } });

    await act(async () => hook.result.current.enfocarErrores({ general: "x" }));

    expect(scroll.scrollTo).not.toHaveBeenCalled();
  });

  it("con 'Reducir movimiento' no anima", async () => {
    const scroll = crearScroll();
    const hook = await montar({ scroll, campos: { nombre: campo(400) }, reducido: true });

    await act(async () => hook.result.current.enfocarErrores({ nombre: "x" }));

    expect(scroll.scrollTo).toHaveBeenCalledWith({ y: 304, animated: false });
  });
});
