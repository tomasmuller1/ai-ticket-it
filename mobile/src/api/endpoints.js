import { pedir } from "./client";

// Un método por endpoint de la API (documentada en http://localhost:3000/api/docs).
export const api = {
  auth: {
    login: (datos) => pedir("/auth/login", { metodo: "POST", body: datos, autenticado: false }),
    registrar: (datos) => pedir("/auth/registro", { metodo: "POST", body: datos, autenticado: false }),
    google: (idToken) => pedir("/auth/google", { metodo: "POST", body: { idToken }, autenticado: false }),
    cambiarContrasenia: (datos) => pedir("/auth/contrasenia", { metodo: "PUT", body: datos }),
    logout: (refreshToken) =>
      pedir("/auth/logout", { metodo: "POST", body: { refreshToken }, autenticado: false }),
  },
  usuarios: {
    yo: () => pedir("/usuarios/me"),
    actualizar: (datos) => pedir("/usuarios/me", { metodo: "PATCH", body: datos }),
    tarjetas: () => pedir("/usuarios/me/tarjetas"),
    agregarTarjeta: (datos) => pedir("/usuarios/me/tarjetas", { metodo: "POST", body: datos }),
    quitarTarjeta: (id) => pedir(`/usuarios/me/tarjetas/${id}`, { metodo: "DELETE" }),
    favoritos: () => pedir("/usuarios/me/favoritos"),
    agregarFavorito: (eventoId) => pedir(`/usuarios/me/favoritos/${eventoId}`, { metodo: "PUT" }),
    quitarFavorito: (eventoId) => pedir(`/usuarios/me/favoritos/${eventoId}`, { metodo: "DELETE" }),
  },
  categorias: {
    listar: () => pedir("/categorias"),
  },
  eventos: {
    buscar: (filtros) => pedir("/eventos", { query: filtros }),
    detalle: (id) => pedir(`/eventos/${id}`),
    crear: (datos) => pedir("/eventos", { metodo: "POST", body: datos }),
    mios: () => pedir("/eventos/mios"),
    compras: (id, estado) => pedir(`/eventos/${id}/compras`, { query: { estado } }),
  },
  organizadores: {
    resenias: (id, pagina) => pedir(`/organizadores/${id}/resenias`, { query: pagina }),
  },
  compras: {
    crear: (datos) => pedir("/compras", { metodo: "POST", body: datos }),
    mias: (estado) => pedir("/compras", { query: { estado } }),
    detalle: (id) => pedir(`/compras/${id}`),
    pagar: ({ id, tarjetaId }) => pedir(`/compras/${id}/pago`, { metodo: "POST", body: { tarjetaId } }),
    cancelar: (id) => pedir(`/compras/${id}/cancelacion`, { metodo: "POST" }),
    validar: (id) => pedir(`/compras/${id}/uso`, { metodo: "POST" }),
    mensajes: (id, desde) => pedir(`/compras/${id}/mensajes`, { query: { desde } }),
    enviarMensaje: (id, mensaje) => pedir(`/compras/${id}/mensajes`, { metodo: "POST", body: { mensaje } }),
    reseniar: (id, datos) => pedir(`/compras/${id}/resenia`, { metodo: "POST", body: datos }),
  },
  // Solo en desarrollo: simular que la pasarela de pagos se cae.
  dev: {
    estadoPasarela: () => pedir("/dev/pasarela", { autenticado: false }),
    cambiarPasarela: (disponible) =>
      pedir("/dev/pasarela", { metodo: "POST", body: { disponible }, autenticado: false }),
  },
};
