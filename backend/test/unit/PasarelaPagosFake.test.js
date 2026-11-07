import { PasarelaNoDisponibleError, PagoRechazadoError } from "../../src/errors/index.js";
import { PasarelaPagosFake, TARJETA_RECHAZADA } from "../../src/infra/PasarelaPagosFake.js";

const COBRO = { referencia: "c-1", monto: 1000, token: "tok_1" };

describe("PasarelaPagosFake", () => {
  it("aprueba un cobro y lo registra", async () => {
    const pasarela = new PasarelaPagosFake();

    const { transaccionId } = await pasarela.cobrar(COBRO);

    expect(pasarela.operaciones).toEqual([
      { id: transaccionId, tipo: "COBRO", referencia: "c-1", monto: 1000, token: "tok_1" },
    ]);
  });

  it("espera la demora configurada antes de resolver", async () => {
    const esperas = [];
    const pasarela = new PasarelaPagosFake({
      demoraMs: 1500,
      esperar: async (ms) => esperas.push(ms),
    });

    await pasarela.cobrar(COBRO);

    expect(esperas).toEqual([1500]);
  });

  it("rechaza un cobro con la tarjeta de prueba, sin registrarlo", async () => {
    const pasarela = new PasarelaPagosFake();
    const { token } = await pasarela.tokenizar({ numero: TARJETA_RECHAZADA });

    await expect(pasarela.cobrar({ ...COBRO, token })).rejects.toThrow(PagoRechazadoError);
    expect(pasarela.operaciones).toEqual([]);
  });

  it("falla si está apagada", async () => {
    const pasarela = new PasarelaPagosFake();
    pasarela.cambiarDisponibilidad(false);

    await expect(pasarela.cobrar(COBRO)).rejects.toThrow(PasarelaNoDisponibleError);
  });

  it("falla si se cae durante el cobro", async () => {
    const pasarela = new PasarelaPagosFake({
      esperar: async () => pasarela.cambiarDisponibilidad(false),
    });

    await expect(pasarela.cobrar(COBRO)).rejects.toThrow(PasarelaNoDisponibleError);
    expect(pasarela.operaciones).toEqual([]);
  });
});
