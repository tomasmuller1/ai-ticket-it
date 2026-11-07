import { execFileSync } from "node:child_process";

import { formatearFecha, formatearMonto } from "../../src/utils/formato.js";

const MODULO = new URL("../../src/utils/formato.js", import.meta.url).href;

// Los textos de las notificaciones los arma el backend, que puede correr en UTC: la hora tiene que salir en
// la de Buenos Aires igual.
describe("formato de los textos de las notificaciones", () => {
  // jest.config.js fija TZ en Buenos Aires y dentro de Jest no se puede cambiar: se prueba en otro proceso.
  it("formatearFecha da lo mismo aunque el servidor corra en UTC", () => {
    const script = `import { formatearFecha } from "${MODULO}";
      process.stdout.write(formatearFecha(new Date("2026-12-20T00:00:00Z")));`;

    const enUtc = execFileSync(process.execPath, ["--input-type=module", "-e", script], {
      env: { ...process.env, TZ: "UTC" },
      encoding: "utf8",
    });

    expect(enUtc).toBe("Sáb 19 dic, 21:00");
  });

  it("formatearFecha muestra el día y la hora de Buenos Aires", () => {
    expect(formatearFecha(new Date("2026-12-20T00:00:00Z"))).toBe("Sáb 19 dic, 21:00");
  });

  it("formatearFecha usa el horario de 24 horas", () => {
    expect(formatearFecha(new Date("2026-11-05T12:30:00-03:00"))).toBe("Jue 5 nov, 12:30");
  });

  it("formatearMonto muestra pesos sin decimales, con punto de miles y un espacio común", () => {
    expect(formatearMonto(12000)).toBe("$ 12.000");
    expect(formatearMonto(0)).toBe("$ 0");
  });
});
