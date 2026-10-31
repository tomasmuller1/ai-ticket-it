// Lee el header "Authorization: Bearer <access token>" y devuelve el usuario, o null si no es válido.
export class AutenticadorJwt {
  constructor(servicioTokens, buscarUsuarioPorId) {
    this.servicioTokens = servicioTokens;
    this.buscarUsuarioPorId = buscarUsuarioPorId;
  }

  async autenticar(req) {
    const [esquema, token] = req.headers.authorization?.split(" ") ?? [];
    if (esquema !== "Bearer" || !token) return null;
    const usuarioId = this.servicioTokens.verificarAccessToken(token);
    if (!usuarioId) return null;
    return (await this.buscarUsuarioPorId(usuarioId)) ?? null;
  }
}
