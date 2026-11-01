import { randomUUID } from "node:crypto";

import { Tarjeta } from "../domain/Tarjeta.js";
import { NoEncontradoError, ValidacionError } from "../errors/index.js";

// Medios de pago de cada usuario. La pasarela tokeniza la tarjeta; acá se guarda solo lo que se muestra.
export class TarjetasService {
  constructor({ tarjetas }, pasarelaPagos, reloj) {
    this.tarjetas = tarjetas;
    this.pasarelaPagos = pasarelaPagos;
    this.reloj = reloj;
  }

  listar(usuario) {
    return this.tarjetas.buscarPorUsuario(usuario.id);
  }

  async agregar(usuario, { numero, vencimientoMes, vencimientoAnio, titular }) {
    const borrador = new Tarjeta({ vencimientoMes, vencimientoAnio });
    if (borrador.estaVencida(this.reloj)) {
      const mensaje = "La tarjeta está vencida";
      throw new ValidacionError(mensaje, [{ campo: "vencimiento", mensaje }]);
    }
    const { token, marca, ultimos4 } = await this.pasarelaPagos.tokenizar({ numero });
    const tarjeta = new Tarjeta({
      id: randomUUID(),
      usuarioId: usuario.id,
      marca,
      ultimos4,
      vencimientoMes,
      vencimientoAnio,
      titular,
      token,
    });
    return this.tarjetas.guardar(tarjeta);
  }

  // Una tarjeta de otra persona responde igual que una que no existe: no revela que está registrada.
  async obtener(usuario, id) {
    const tarjeta = await this.tarjetas.buscarPorId(id);
    if (!tarjeta || !tarjeta.esDe(usuario)) {
      throw new NoEncontradoError("No encontramos esa tarjeta entre tus medios de pago");
    }
    return tarjeta;
  }

  async quitar(usuario, id) {
    await this.obtener(usuario, id);
    await this.tarjetas.eliminar(id);
  }
}
