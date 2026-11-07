import { POLLING_PAGO, siguienteConsultaPago } from "../../src/hooks/pago";

const consulta = (state) => ({
  state: { data: undefined, error: null, dataUpdateCount: 0, errorUpdateCount: 0, ...state },
});

describe("siguienteConsultaPago", () => {
  it("consulta de nuevo mientras la operación sigue pendiente", () => {
    const query = consulta({ data: { estado: "PENDIENTE" }, dataUpdateCount: 3 });

    expect(siguienteConsultaPago(query)).toBe(POLLING_PAGO.intervaloMs);
  });

  it.each(["APROBADA", "RECHAZADA"])("deja de consultar cuando queda %s", (estado) => {
    expect(siguienteConsultaPago(consulta({ data: { estado } }))).toBe(false);
  });

  it("deja de consultar al llegar al máximo de intentos", () => {
    const query = consulta({ data: { estado: "PENDIENTE" }, dataUpdateCount: POLLING_PAGO.maxConsultas });

    expect(siguienteConsultaPago(query)).toBe(false);
  });

  it("los errores de conexión cuentan como intentos, pero no frenan el polling", () => {
    const error = { status: 0 };

    expect(siguienteConsultaPago(consulta({ error, errorUpdateCount: 1 }))).toBe(POLLING_PAGO.intervaloMs);
    expect(siguienteConsultaPago(consulta({ error, errorUpdateCount: POLLING_PAGO.maxConsultas }))).toBe(
      false,
    );
  });

  it("un error que no se arregla reintentando frena el polling", () => {
    expect(siguienteConsultaPago(consulta({ error: { status: 404 }, errorUpdateCount: 1 }))).toBe(false);
  });
});
