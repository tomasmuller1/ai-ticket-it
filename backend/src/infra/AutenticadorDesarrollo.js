// Solo para desarrollo y tests, hasta que exista la autenticación con JWT:
// identifica al usuario con el header X-Usuario-Id. Nunca se usa en producción.
export class AutenticadorDesarrollo {
  static HEADER = "x-usuario-id";

  constructor(buscarUsuarioPorId) {
    this.buscarUsuarioPorId = buscarUsuarioPorId;
  }

  async autenticar(req) {
    const id = req.headers[AutenticadorDesarrollo.HEADER];
    if (!id) return null;
    return (await this.buscarUsuarioPorId(id)) ?? null;
  }
}
