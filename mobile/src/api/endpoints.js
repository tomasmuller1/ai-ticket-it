import { pedir } from "./client";

// Un método por endpoint de la API (documentada en http://localhost:3000/api/docs). Las lecturas reciben
// `opciones` para pasarles el `signal` de React Query: así se cancelan si ya nadie espera la respuesta.
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
    yo: (opciones) => pedir("/usuarios/me", opciones),
    actualizar: (datos) => pedir("/usuarios/me", { metodo: "PATCH", body: datos }),
    tarjetas: (opciones) => pedir("/usuarios/me/tarjetas", opciones),
    agregarTarjeta: (datos) => pedir("/usuarios/me/tarjetas", { metodo: "POST", body: datos }),
    quitarTarjeta: (id) => pedir(`/usuarios/me/tarjetas/${id}`, { metodo: "DELETE" }),
    favoritos: (opciones) => pedir("/usuarios/me/favoritos", opciones),
    agregarFavorito: (eventoId) => pedir(`/usuarios/me/favoritos/${eventoId}`, { metodo: "PUT" }),
    quitarFavorito: (eventoId) => pedir(`/usuarios/me/favoritos/${eventoId}`, { metodo: "DELETE" }),
  },
  categorias: {
    listar: (opciones) => pedir("/categorias", opciones),
  },
  eventos: {
    buscar: (filtros, opciones) => pedir("/eventos", { query: filtros, ...opciones }),
    detalle: (id, opciones) => pedir(`/eventos/${id}`, opciones),
    crear: (datos) => pedir("/eventos", { metodo: "POST", body: datos }),
    mios: (opciones) => pedir("/eventos/mios", opciones),
    compras: (id, estado, opciones) => pedir(`/eventos/${id}/compras`, { query: { estado }, ...opciones }),
    posponer: (id, datos, clave) =>
      pedir(`/eventos/${id}/postergacion`, { metodo: "POST", body: datos, claveIdempotencia: clave }),
    cancelar: (id, datos, clave) =>
      pedir(`/eventos/${id}/cancelacion`, { metodo: "POST", body: datos, claveIdempotencia: clave }),
  },
  organizadores: {
    resenias: (id, pagina, opciones) =>
      pedir(`/organizadores/${id}/resenias`, { query: pagina, ...opciones }),
  },
  compras: {
    crear: (datos, clave) => pedir("/compras", { metodo: "POST", body: datos, claveIdempotencia: clave }),
    mias: (estado, opciones) => pedir("/compras", { query: { estado }, ...opciones }),
    detalle: (id, opciones) => pedir(`/compras/${id}`, opciones),
    pagar: ({ id, tarjetaId, clave }) =>
      pedir(`/compras/${id}/pago`, { metodo: "POST", body: { tarjetaId }, claveIdempotencia: clave }),
    operacionPago: (id, operacionId, opciones) => pedir(`/compras/${id}/pago/${operacionId}`, opciones),
    cancelar: (id, clave) =>
      pedir(`/compras/${id}/cancelacion`, { metodo: "POST", claveIdempotencia: clave }),
    validar: (id) => pedir(`/compras/${id}/uso`, { metodo: "POST" }),
    mensajes: (id, opciones) => pedir(`/compras/${id}/mensajes`, opciones),
    enviarMensaje: (id, mensaje) => pedir(`/compras/${id}/mensajes`, { metodo: "POST", body: { mensaje } }),
    reseniar: (id, datos) => pedir(`/compras/${id}/resenia`, { metodo: "POST", body: datos }),
  },
  notificaciones: {
    listar: (filtros, opciones) => pedir("/notificaciones", { query: filtros, ...opciones }),
    resumen: (opciones) => pedir("/notificaciones/resumen", opciones),
    marcarLeida: (id) => pedir(`/notificaciones/${id}/lectura`, { metodo: "POST" }),
    // Sin filtro marca todas; con { compraId }, solo las de esa compra.
    marcarLeidas: (filtro = {}) => pedir("/notificaciones/lectura", { metodo: "POST", body: filtro }),
  },
  // Solo en desarrollo: simular que la pasarela de pagos se cae.
  dev: {
    estadoPasarela: (opciones) => pedir("/dev/pasarela", { autenticado: false, ...opciones }),
    cambiarPasarela: (disponible) =>
      pedir("/dev/pasarela", { metodo: "POST", body: { disponible }, autenticado: false }),
  },
};
