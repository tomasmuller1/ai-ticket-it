import { Categoria } from "../domain/Categoria.js";
import { Compra } from "../domain/Compra.js";
import { Evento } from "../domain/Evento.js";
import { TipoEntrada } from "../domain/TipoEntrada.js";
import { Usuario } from "../domain/Usuario.js";
import { RelojFijo } from "../infra/Reloj.js";

const UN_DIA_MS = 24 * 60 * 60 * 1000;

// Las fechas son relativas a "hoy" para que siempre haya eventos próximos y eventos ya realizados.
function fechaEn(hoy, dias, hora = 21) {
  const fecha = new Date(hoy.getTime() + dias * UN_DIA_MS);
  fecha.setHours(hora, 0, 0, 0);
  return fecha;
}

function imagen(nombre) {
  return `https://picsum.photos/seed/aiticketit-${nombre}/1200/800`;
}

function tipo(id, nombre, precio, cupo, descripcion = "") {
  return new TipoEntrada({ id, nombre, precio, cupo, descripcion });
}

// Arma un escenario completo: usuarios, eventos, compras en todos los estados y reseñas.
export function crearDatosDeEjemplo(reloj) {
  const hoy = reloj.ahora();

  const categorias = [
    new Categoria({ id: "musica", nombre: "Música", descripcion: "Recitales y shows en vivo" }),
    new Categoria({ id: "teatro", nombre: "Teatro", descripcion: "Obras, musicales y danza" }),
    new Categoria({ id: "stand-up", nombre: "Stand Up", descripcion: "Comedia en vivo" }),
    new Categoria({ id: "deportes", nombre: "Deportes", descripcion: "Partidos y competencias" }),
    new Categoria({
      id: "conferencias",
      nombre: "Conferencias",
      descripcion: "Charlas, talleres y congresos",
    }),
    new Categoria({ id: "festivales", nombre: "Festivales", descripcion: "Varios días, varios escenarios" }),
  ];
  const categoria = Object.fromEntries(categorias.map((c) => [c.id, c]));

  const lucia = new Usuario({
    id: "u-lucia",
    nombre: "Lucía",
    apellido: "Fernández",
    email: "lucia@aiticketit.com",
  });
  const martin = new Usuario({
    id: "u-martin",
    nombre: "Martín",
    apellido: "Gómez",
    email: "martin@aiticketit.com",
  });
  const sofia = new Usuario({
    id: "u-sofia",
    nombre: "Sofía",
    apellido: "Ramírez",
    email: "sofia@aiticketit.com",
  });
  const tomas = new Usuario({
    id: "u-tomas",
    nombre: "Tomás",
    apellido: "Herrera",
    email: "tomas@aiticketit.com",
  });
  const valentina = new Usuario({
    id: "u-valentina",
    nombre: "Valentina",
    apellido: "Torres",
    email: "valentina@aiticketit.com",
  });
  const usuarios = [lucia, martin, sofia, tomas, valentina];

  const evento = (datos) => new Evento({ multimedia: [imagen(datos.id)], ...datos });

  const eventos = [
    evento({
      id: "e-rock-nacional",
      nombre: "Noche de Rock Nacional",
      descripcion: "Las bandas que marcaron generaciones, juntas en un mismo escenario por única vez.",
      categoria: categoria.musica,
      fecha: fechaEn(hoy, 12),
      lugar: "Estadio Obras, CABA",
      organizador: lucia,
      tiposEntrada: [
        tipo("e-rock-nacional-campo", "Campo", 35000, 800, "De pie, frente al escenario"),
        tipo("e-rock-nacional-platea", "Platea", 52000, 300, "Asiento numerado"),
        tipo("e-rock-nacional-vip", "VIP", 90000, 4, "Ingreso preferencial y barra exclusiva"),
      ],
    }),
    evento({
      id: "e-jazz-club",
      nombre: "Jazz en el Club",
      descripcion: "Un trío de jazz contemporáneo en formato íntimo, con mesas y servicio de bar.",
      categoria: categoria.musica,
      fecha: fechaEn(hoy, 5, 22),
      lugar: "Thelonious Club, Palermo",
      organizador: martin,
      tiposEntrada: [
        tipo("e-jazz-club-general", "General", 18000, 60),
        tipo("e-jazz-club-mesa", "Mesa preferencial", 26000, 20, "Mesa para dos cerca del escenario"),
      ],
    }),
    evento({
      id: "e-hamlet",
      nombre: "Hamlet",
      descripcion: "Una puesta moderna del clásico de Shakespeare, con elenco joven y música en vivo.",
      categoria: categoria.teatro,
      fecha: fechaEn(hoy, 20, 20),
      lugar: "Teatro San Martín, CABA",
      organizador: martin,
      tiposEntrada: [
        tipo("e-hamlet-platea", "Platea", 28000, 400),
        tipo("e-hamlet-pullman", "Pullman", 21000, 250),
      ],
    }),
    evento({
      id: "e-musical",
      nombre: "Musical de Verano",
      descripcion: "Comedia musical para toda la familia, con coreografías y orquesta en vivo.",
      categoria: categoria.teatro,
      fecha: fechaEn(hoy, 34, 19),
      lugar: "Teatro Gran Rex, CABA",
      organizador: lucia,
      tiposEntrada: [
        tipo("e-musical-platea", "Platea", 32000, 500),
        tipo("e-musical-super-pullman", "Super Pullman", 22000, 300),
      ],
    }),
    evento({
      id: "e-stand-up",
      nombre: "Noche de Stand Up",
      descripcion: "Tres comediantes, una noche, cero filtro. Show para mayores de 18.",
      categoria: categoria["stand-up"],
      fecha: fechaEn(hoy, 3, 23),
      lugar: "Paseo La Plaza, CABA",
      organizador: tomas,
      tiposEntrada: [tipo("e-stand-up-general", "General", 15000, 180)],
    }),
    evento({
      id: "e-superclasico",
      nombre: "Superclásico de Básquet",
      descripcion: "El clásico del básquet argentino. Partido por el campeonato de la Liga Nacional.",
      categoria: categoria.deportes,
      fecha: fechaEn(hoy, 9, 20),
      lugar: "Estadio Obras, CABA",
      organizador: martin,
      tiposEntrada: [
        tipo("e-superclasico-popular", "Popular", 12000, 1500),
        tipo("e-superclasico-platea", "Platea", 24000, 600),
      ],
    }),
    evento({
      id: "e-maraton",
      nombre: "Maratón Nocturna 10K",
      descripcion: "Carrera de 10 km por la Costanera con remera, medalla e hidratación incluidas.",
      categoria: categoria.deportes,
      fecha: fechaEn(hoy, 45, 20),
      lugar: "Costanera Sur, CABA",
      organizador: lucia,
      tiposEntrada: [tipo("e-maraton-inscripcion", "Inscripción", 20000, 2000)],
    }),
    evento({
      id: "e-ia-conf",
      nombre: "Conferencia de IA Aplicada",
      descripcion: "Charlas y talleres sobre desarrollo de software con inteligencia artificial.",
      categoria: categoria.conferencias,
      fecha: fechaEn(hoy, 27, 10),
      lugar: "UTN FRBA, Medrano 951",
      organizador: tomas,
      tiposEntrada: [
        tipo("e-ia-conf-general", "General", 0, 300, "Acceso a todas las charlas"),
        tipo("e-ia-conf-taller", "Charlas + talleres", 15000, 40, "Incluye talleres prácticos"),
      ],
    }),
    evento({
      id: "e-festival",
      nombre: "Festival Primavera Sonora",
      descripcion: "Dos días, tres escenarios y más de veinte artistas de la escena independiente.",
      categoria: categoria.festivales,
      fecha: fechaEn(hoy, 60, 14),
      lugar: "Hipódromo de Palermo",
      organizador: lucia,
      tiposEntrada: [
        tipo("e-festival-dia", "Un día", 45000, 5000),
        tipo("e-festival-abono", "Abono dos días", 80000, 3000),
        tipo("e-festival-vip", "VIP", 150000, 200, "Zona exclusiva con vista al escenario principal"),
      ],
    }),
    // Eventos que ya se realizaron: tienen compras utilizadas y reseñas.
    evento({
      id: "e-tango",
      nombre: "Noche de Tango",
      descripcion: "Orquesta típica y bailarines en una milonga de las de antes.",
      categoria: categoria.musica,
      fecha: fechaEn(hoy, -15),
      lugar: "Café Tortoni, CABA",
      organizador: lucia,
      tiposEntrada: [tipo("e-tango-general", "General", 22000, 120)],
    }),
    evento({
      id: "e-impro",
      nombre: "Impro Show",
      descripcion: "Teatro de improvisación con temas que propone el público.",
      categoria: categoria["stand-up"],
      fecha: fechaEn(hoy, -30, 22),
      lugar: "Teatro Picadero, CABA",
      organizador: martin,
      tiposEntrada: [tipo("e-impro-general", "General", 14000, 150)],
    }),
    evento({
      id: "e-indie",
      nombre: "Ciclo Indie en Vivo",
      descripcion: "Tres bandas emergentes presentan sus discos nuevos.",
      categoria: categoria.musica,
      fecha: fechaEn(hoy, -7, 21),
      lugar: "Niceto Club, Palermo",
      organizador: martin,
      tiposEntrada: [tipo("e-indie-general", "General", 16000, 300)],
    }),
  ];
  const porId = Object.fromEntries(eventos.map((e) => [e.id, e]));

  const compras = [];
  const resenias = [];

  // Crea una compra "en el pasado" y la lleva hasta el estado pedido usando relojes fijos.
  function comprar(
    id,
    comprador,
    eventoId,
    tipoEntradaId,
    cantidad,
    estado,
    { resenia, mensajes = [] } = {},
  ) {
    const ev = porId[eventoId];
    const momentoCompra = new RelojFijo(Math.min(hoy.getTime(), ev.fecha.getTime()) - 20 * UN_DIA_MS);
    const compra = Compra.crear({ id, comprador, evento: ev, tipoEntradaId, cantidad, reloj: momentoCompra });

    for (const [autor, texto] of mensajes) {
      compra.enviarMensaje(texto, autor, momentoCompra);
    }
    if (estado !== "PENDIENTE" && estado !== "CANCELADA_SIN_PAGO") {
      compra.pagar(comprador, momentoCompra);
    }
    if (estado === "CANCELADA_SIN_PAGO") {
      compra.cancelar(comprador, momentoCompra);
    }
    if (estado === "REEMBOLSADA") {
      compra.cancelar(comprador, momentoCompra);
      compra.reembolsar(momentoCompra);
    }
    if (estado === "UTILIZADA") {
      compra.marcarUtilizada(ev.organizador, new RelojFijo(ev.fecha));
      if (resenia) {
        const despues = new RelojFijo(ev.fecha.getTime() + UN_DIA_MS);
        resenias.push(compra.reseniar({ id: `r-${id}`, ...resenia }, comprador, despues));
      }
    }
    compras.push(compra);
    return compra;
  }

  // Próximos eventos.
  comprar("c-01", sofia, "e-rock-nacional", "e-rock-nacional-campo", 2, "CONFIRMADA", {
    mensajes: [
      [sofia, "¡Hola! ¿A qué hora abren las puertas?"],
      [lucia, "Hola Sofía, abrimos a las 19 h. ¡Te esperamos!"],
    ],
  });
  comprar("c-02", tomas, "e-rock-nacional", "e-rock-nacional-vip", 2, "CONFIRMADA");
  comprar("c-03", valentina, "e-rock-nacional", "e-rock-nacional-vip", 1, "PENDIENTE");
  comprar("c-04", sofia, "e-jazz-club", "e-jazz-club-mesa", 2, "PENDIENTE");
  comprar("c-05", valentina, "e-hamlet", "e-hamlet-platea", 3, "CONFIRMADA");
  comprar("c-06", sofia, "e-stand-up", "e-stand-up-general", 2, "REEMBOLSADA", {
    mensajes: [[sofia, "Me surgió un viaje, voy a cancelar. ¡Gracias igual!"]],
  });
  comprar("c-07", valentina, "e-superclasico", "e-superclasico-platea", 4, "CANCELADA_SIN_PAGO");
  comprar("c-08", sofia, "e-ia-conf", "e-ia-conf-taller", 1, "CONFIRMADA");
  comprar("c-09", martin, "e-festival", "e-festival-abono", 2, "CONFIRMADA");

  // Eventos ya realizados.
  comprar("c-10", sofia, "e-tango", "e-tango-general", 2, "UTILIZADA", {
    resenia: { puntuacion: 5, detalle: "Mágico. La orquesta increíble y el lugar, un clásico." },
  });
  comprar("c-11", valentina, "e-tango", "e-tango-general", 1, "UTILIZADA", {
    resenia: { puntuacion: 4, detalle: "Muy lindo, aunque la acústica atrás no era la mejor." },
  });
  comprar("c-12", tomas, "e-tango", "e-tango-general", 2, "UTILIZADA");
  comprar("c-13", sofia, "e-impro", "e-impro-general", 2, "UTILIZADA", {
    resenia: { puntuacion: 3, detalle: "Divertido pero se hizo largo." },
  });
  comprar("c-14", tomas, "e-indie", "e-indie-general", 1, "UTILIZADA", {
    resenia: { puntuacion: 5, detalle: "Descubrí dos bandas nuevas que ya escucho todos los días." },
  });
  comprar("c-15", valentina, "e-indie", "e-indie-general", 2, "UTILIZADA", {
    resenia: { puntuacion: 4, detalle: "Buen sonido y buena organización." },
  });

  sofia.agregarFavorito(porId["e-festival"]);
  sofia.agregarFavorito(porId["e-hamlet"]);
  valentina.agregarFavorito(porId["e-rock-nacional"]);

  return { usuarios, categorias, eventos, compras, resenias };
}

// Carga (o restaura) los datos de ejemplo en los repositorios.
export function sembrar(repositorios, reloj) {
  const datos = crearDatosDeEjemplo(reloj);
  for (const [nombre, items] of Object.entries(datos)) {
    repositorios[nombre].reemplazarTodo(items);
  }
  return datos;
}
