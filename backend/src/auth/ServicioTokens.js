import { createHash, randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";

const EMISOR = "ai-ticket-it";
const UN_DIA_MS = 24 * 60 * 60 * 1000;

// Access token: JWT corto (minutos) que viaja en cada request.
// Refresh token: valor opaco y largo (días) que solo sirve para pedir un access token nuevo.
// Del refresh token se guarda solo el hash: si se filtrara la base, no se podría usar.
export class ServicioTokens {
  constructor({ secreto, accessTokenMinutos, refreshTokenDias }, reloj) {
    this.secreto = secreto;
    this.accessTokenMinutos = accessTokenMinutos;
    this.refreshTokenDias = refreshTokenDias;
    this.reloj = reloj;
  }

  emitirAccessToken(usuario) {
    const iat = Math.floor(this.reloj.ahora().getTime() / 1000);
    const token = jwt.sign({ sub: usuario.id, iat }, this.secreto, {
      algorithm: "HS256",
      expiresIn: this.accessTokenMinutos * 60,
      issuer: EMISOR,
    });
    return { token, expiraEn: new Date((iat + this.accessTokenMinutos * 60) * 1000) };
  }

  // Devuelve el id del usuario, o null si el token es inválido o está vencido.
  verificarAccessToken(token) {
    try {
      const payload = jwt.verify(token, this.secreto, {
        algorithms: ["HS256"],
        issuer: EMISOR,
        clockTimestamp: Math.floor(this.reloj.ahora().getTime() / 1000),
      });
      return payload.sub;
    } catch {
      return null;
    }
  }

  generarRefreshToken() {
    const token = randomBytes(32).toString("base64url");
    const expiraEn = new Date(this.reloj.ahora().getTime() + this.refreshTokenDias * UN_DIA_MS);
    return { token, hash: ServicioTokens.hashear(token), expiraEn };
  }

  static hashear(token) {
    return createHash("sha256").update(token).digest("hex");
  }
}
