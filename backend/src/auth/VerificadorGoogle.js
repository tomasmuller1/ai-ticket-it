import { OAuth2Client } from "google-auth-library";

// Verifica el ID token que Google le da a la app (firma con las claves públicas de Google, emisor,
// vencimiento y que esté emitido para alguno de nuestros clientes OAuth) y devuelve el perfil.
export class VerificadorGoogle {
  constructor(clientIds) {
    this.clientIds = clientIds;
    this.cliente = new OAuth2Client();
  }

  async verificar(idToken) {
    const ticket = await this.cliente.verifyIdToken({ idToken, audience: this.clientIds });
    const datos = ticket.getPayload();
    return {
      sub: datos.sub,
      email: datos.email,
      emailVerificado: datos.email_verified === true,
      nombre: datos.given_name ?? datos.name ?? "",
      apellido: datos.family_name ?? "",
    };
  }
}
