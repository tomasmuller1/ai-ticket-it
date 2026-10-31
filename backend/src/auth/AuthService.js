import { randomUUID } from "node:crypto";

import { Usuario } from "../domain/Usuario.js";
import { NoAutenticadoError, ReglaNegocioError } from "../errors/index.js";
import { RefreshToken } from "./RefreshToken.js";
import { ServicioTokens } from "./ServicioTokens.js";

const SESION_INVALIDA = "La sesión no es válida. Volvé a iniciar sesión.";

export class AuthService {
  constructor({ usuarios, refreshTokens }, { servicioTokens, contrasenias, reloj }) {
    this.usuarios = usuarios;
    this.refreshTokens = refreshTokens;
    this.servicioTokens = servicioTokens;
    this.contrasenias = contrasenias;
    this.reloj = reloj;
  }

  async registrar({ nombre, apellido, email, password }) {
    if (await this.usuarios.buscarPorEmail(email)) {
      throw new ReglaNegocioError("Ya existe una cuenta con ese email", "EMAIL_EN_USO");
    }
    const usuario = new Usuario({ id: randomUUID(), nombre, apellido, email: email.toLowerCase() });
    usuario.passwordHash = await this.contrasenias.hashear(password);
    await this.usuarios.guardar(usuario);
    return this.#abrirSesion(usuario, randomUUID());
  }

  // El mismo mensaje si el email no existe o la contraseña está mal: no revela qué emails están registrados.
  async login({ email, password }) {
    const usuario = await this.usuarios.buscarPorEmail(email);
    const valida = await this.contrasenias.verificar(password, usuario?.passwordHash);
    if (!usuario || !valida) {
      throw new NoAutenticadoError("Email o contraseña incorrectos");
    }
    return this.#abrirSesion(usuario, randomUUID());
  }

  async refrescar(token) {
    const actual = await this.refreshTokens.buscarPorHash(ServicioTokens.hashear(token));
    if (!actual) {
      throw new NoAutenticadoError(SESION_INVALIDA);
    }
    if (actual.usado || actual.revocado) {
      await this.#revocarFamilia(actual.familia);
      throw new NoAutenticadoError(SESION_INVALIDA);
    }
    if (!actual.estaVigente(this.reloj)) {
      throw new NoAutenticadoError(SESION_INVALIDA);
    }
    const usuario = await this.usuarios.buscarPorId(actual.usuarioId);
    if (!usuario) {
      throw new NoAutenticadoError(SESION_INVALIDA);
    }
    actual.usado = true;
    await this.refreshTokens.guardar(actual);
    return this.#abrirSesion(usuario, actual.familia);
  }

  async cerrarSesion(token) {
    const actual = await this.refreshTokens.buscarPorHash(ServicioTokens.hashear(token));
    if (actual) {
      await this.#revocarFamilia(actual.familia);
    }
  }

  async #abrirSesion(usuario, familia) {
    const access = this.servicioTokens.emitirAccessToken(usuario);
    const refresh = this.servicioTokens.generarRefreshToken();
    await this.refreshTokens.guardar(
      new RefreshToken({
        id: randomUUID(),
        usuarioId: usuario.id,
        familia,
        hash: refresh.hash,
        expiraEn: refresh.expiraEn,
      }),
    );
    return {
      accessToken: access.token,
      accessTokenExpiraEn: access.expiraEn,
      refreshToken: refresh.token,
      refreshTokenExpiraEn: refresh.expiraEn,
      usuario,
    };
  }

  async #revocarFamilia(familia) {
    for (const token of await this.refreshTokens.buscarPorFamilia(familia)) {
      token.revocado = true;
      await this.refreshTokens.guardar(token);
    }
  }
}
