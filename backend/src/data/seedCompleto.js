import { Evento } from "../domain/Evento.js";
import { EstadoCompra } from "../domain/estados/EstadoCompra.js";
import { Notificacion, TipoNotificacion } from "../domain/Notificacion.js";
import {
  textoCompraDevuelta,
  textoEntradaUtilizada,
  textoEventoAgotado,
  textoEventoCancelado,
  textoEventoPospuesto,
  textoMensajeNuevo,
  textoPagoConfirmado,
  textoReembolso,
} from "../domain/textosNotificacion.js";
import { Tarjeta } from "../domain/Tarjeta.js";
import { Usuario } from "../domain/Usuario.js";
import { RelojFijo } from "../infra/Reloj.js";
import { crearComprador, fechaEn, HASH_DEMO, imagen, tipo, UN_DIA_MS } from "./fabricasDeEjemplo.js";

// Datos de ejemplo completos: se suman a los de base (seed.js) para que, al levantar la API en desarrollo, la
// app se vea como una plataforma en uso: más usuarios, más eventos, cientos de compras, chats y reseñas. No
// cambian nada de lo de base (los tests y los E2E dependen de eso), solo agregan.
//
// Es determinista: el "azar" sale de un generador con semilla fija, así cada arranque carga lo mismo.

// Los avisos con más de estos días ya se leyeron.
const DIAS_HASTA_LEIDA = 3;
const UN_MINUTO_MS = 60 * 1000;

// mulberry32: generador pseudoaleatorio chico y suficiente para armar datos de ejemplo.
function generador(semilla) {
  let estado = semilla;
  return () => {
    estado = (estado + 0x6d2b79f5) | 0;
    let t = Math.imul(estado ^ (estado >>> 15), 1 | estado);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PREGUNTAS_FRECUENTES = [
  ["¿Hay estacionamiento cerca?", "Sí, hay uno a media cuadra. Te recomendamos llegar temprano."],
  [
    "¿Se puede entrar con comida o bebida?",
    "No se permite ingresar con comida ni bebida, pero adentro hay buffet.",
  ],
  [
    "¿El lugar tiene acceso para silla de ruedas?",
    "Sí, hay rampa y un sector reservado. Avisanos al llegar y te acompañamos.",
  ],
  ["¿A qué hora abren las puertas?", "Una hora antes del inicio. ¡Te esperamos!"],
  ["¿Tengo que imprimir la entrada?", "No hace falta: mostrás el código desde la app y listo."],
  ["¿Me pueden pedir el DNI en la puerta?", "Sí, llevalo por las dudas junto con la entrada."],
  ["¿Hay guardarropa?", "Sí, en el hall de entrada y sin costo."],
  ["¿Se puede sacar fotos?", "Sí, sin flash. Las cámaras profesionales necesitan acreditación."],
];

const PREGUNTAS_SIN_RESPONDER = [
  "¿Hasta qué hora dura más o menos?",
  "¿Puedo transferir la entrada a un amigo?",
  "¿Va a haber merchandising a la venta?",
  "¿Se suspende si llueve?",
];

const RESENIAS = {
  5: [
    "Impecable de principio a fin. Volvería mañana.",
    "Superó todas mis expectativas, la organización fue perfecta.",
    "Una noche inolvidable. El sonido, excelente.",
    "Todo puntual y muy bien organizado. ¡Gracias!",
  ],
  4: [
    "Muy lindo, aunque la fila para entrar fue larga.",
    "Gran experiencia. Le faltó un poco de señalización.",
    "Muy bueno, lo recomiendo. La barra estaba algo cara.",
    "La pasamos muy bien, el lugar es cómodo.",
  ],
  3: [
    "Estuvo bien, pero empezó media hora tarde.",
    "Correcto, sin más. Esperaba un poco más.",
    "Lindo show, pero desde atrás se escuchaba mal.",
  ],
  2: ["Mucha gente para el tamaño del lugar.", "El sonido falló varias veces durante la noche."],
  1: ["Una desorganización total en la entrada."],
};

export function ampliarDatosDeEjemplo(datos, reloj) {
  const hoy = reloj.ahora();
  const azar = generador(20261119);
  const entre = (min, max) => min + Math.floor(azar() * (max - min + 1));
  const elegir = (lista) => lista[Math.floor(azar() * lista.length)];

  const base = (id) => datos.usuarios.find((usuario) => usuario.id === `u-${id}`);
  const categoria = Object.fromEntries(datos.categorias.map((c) => [c.id, c]));

  // --- Usuarios ---------------------------------------------------------------------------------------------

  const persona = (id, nombre, apellido) => {
    const usuario = new Usuario({ id: `u-${id}`, nombre, apellido, email: `${id}@aiticketit.com` });
    usuario.passwordHash = HASH_DEMO;
    return usuario;
  };
  const camila = persona("camila", "Camila", "Rossi");
  const diego = persona("diego", "Diego", "Sánchez");
  const julieta = persona("julieta", "Julieta", "Méndez");
  const agustina = persona("agustina", "Agustina", "López");
  const federico = persona("federico", "Federico", "Díaz");
  const florencia = persona("florencia", "Florencia", "Romero");
  const joaquin = persona("joaquin", "Joaquín", "Acosta");
  const micaela = persona("micaela", "Micaela", "Benítez");
  const nicolas = persona("nicolas", "Nicolás", "Pereyra");
  const paula = persona("paula", "Paula", "Medina");
  const santiago = persona("santiago", "Santiago", "Castro");
  const lautaro = persona("lautaro", "Lautaro", "Suárez");
  const rocio = persona("rocio", "Rocío", "Molina");
  const organizadoresNuevos = [camila, diego, julieta];
  const compradoresNuevos = [
    agustina,
    federico,
    florencia,
    joaquin,
    micaela,
    nicolas,
    paula,
    santiago,
    lautaro,
    rocio,
  ];
  datos.usuarios.push(...organizadoresNuevos, ...compradoresNuevos);

  const [lucia, martin, sofia, tomas, valentina] = ["lucia", "martin", "sofia", "tomas", "valentina"].map(
    base,
  );
  // Los usuarios de base también compran: así, al entrar con ellos, la app también se ve llena.
  const compradores = [...compradoresNuevos, sofia, valentina, tomas, martin, lucia];

  // --- Eventos ----------------------------------------------------------------------------------------------

  const evento = ({ id, dias, hora = 21, tipos, ...resto }) =>
    new Evento({
      id,
      fecha: fechaEn(hoy, dias, hora),
      multimedia: [imagen(id), imagen(`${id}-2`)],
      tiposEntrada: tipos.map(([sufijo, ...datosTipo]) => tipo(`${id}-${sufijo}`, ...datosTipo)),
      ...resto,
    });

  const eventos = [
    evento({
      id: "e-cuarteto",
      nombre: "Cuarteto a Todo Ritmo",
      descripcion:
        "La fiesta del cuarteto cordobés llega a Buenos Aires con banda completa y pista de baile.",
      categoria: categoria.musica,
      dias: 2,
      hora: 23,
      lugar: "Complejo C Art Media, CABA",
      organizador: camila,
      tipos: [
        ["general", "General", 15000, 900, "Pista de baile"],
        ["vip", "VIP", 30000, 100, "Sector elevado con barra"],
      ],
    }),
    evento({
      id: "e-yoga",
      nombre: "Yoga al Amanecer",
      descripcion: "Clase abierta de yoga para todos los niveles, con meditación guiada. Traé tu mat.",
      categoria: categoria.deportes,
      dias: 4,
      hora: 7,
      lugar: "Planetario Galileo Galilei, Palermo",
      organizador: camila,
      tipos: [["inscripcion", "Inscripción", 5000, 80]],
    }),
    evento({
      id: "e-obra-infantil",
      nombre: "Aventuras en el Bosque",
      descripcion: "Obra de títeres y canciones para chicos de 3 a 10 años. Dura 50 minutos.",
      categoria: categoria.teatro,
      dias: 6,
      hora: 16,
      lugar: "Teatro Regio, Chacarita",
      organizador: julieta,
      tipos: [
        ["general", "General", 8000, 350],
        ["familiar", "Familiar (4 personas)", 28000, 60, "Cuatro entradas juntas con descuento"],
      ],
    }),
    evento({
      id: "e-folklore",
      nombre: "Peña Folklórica",
      descripcion: "Chacareras, zambas y empanadas. Una peña para cantar y bailar hasta tarde.",
      categoria: categoria.musica,
      dias: 8,
      lugar: "Centro Cultural Kirchner, CABA",
      organizador: julieta,
      tipos: [["general", "General", 9000, 250]],
    }),
    evento({
      id: "e-bernarda",
      nombre: "La Casa de Bernarda Alba",
      descripcion: "El clásico de García Lorca en una versión íntima, con cinco actrices en escena.",
      categoria: categoria.teatro,
      dias: 10,
      hora: 20,
      lugar: "Timbre 4, Boedo",
      organizador: martin,
      tipos: [["general", "General", 12000, 90]],
    }),
    evento({
      id: "e-futbol",
      nombre: "Final de la Copa Barrial",
      descripcion:
        "Los dos mejores equipos del torneo de barrios se juegan la copa. Hay show en el entretiempo.",
      categoria: categoria.deportes,
      dias: 11,
      hora: 17,
      lugar: "Estadio Ricardo Etcheverri, Caballito",
      organizador: diego,
      tipos: [
        ["popular", "Popular", 6000, 3000],
        ["platea", "Platea", 14000, 800],
      ],
    }),
    evento({
      id: "e-fotografia",
      nombre: "Taller de Fotografía Nocturna",
      descripcion: "Salida práctica para aprender a fotografiar la ciudad de noche. Cupos muy limitados.",
      categoria: categoria.conferencias,
      dias: 13,
      hora: 19,
      lugar: "Usina del Arte, La Boca",
      organizador: camila,
      tipos: [["taller", "Taller", 18000, 12, "Incluye préstamo de trípode"]],
    }),
    evento({
      id: "e-monologos",
      nombre: "Mujeres al Micrófono",
      descripcion: "Cuatro comediantes, cuatro estilos. Una noche de stand up para reírse de todo.",
      categoria: categoria["stand-up"],
      dias: 15,
      hora: 22,
      lugar: "Ciudad Cultural Konex, Abasto",
      organizador: julieta,
      tipos: [["general", "General", 13000, 200]],
    }),
    evento({
      id: "e-tributo-80",
      nombre: "Tributo al Rock de los 80",
      descripcion: "Los himnos del rock en castellano de los ochenta, tocados por una banda de diez músicos.",
      categoria: categoria.musica,
      dias: 16,
      lugar: "Teatro Vorterix, Colegiales",
      organizador: lucia,
      tipos: [
        ["general", "General", 25000, 700],
        ["platea-alta", "Platea alta", 32000, 200],
      ],
    }),
    evento({
      id: "e-sinfonica",
      nombre: "Sinfónica: la Novena de Beethoven",
      descripcion: "Orquesta y coro en vivo interpretan la Novena Sinfonía completa.",
      categoria: categoria.musica,
      dias: 18,
      hora: 20,
      lugar: "Teatro Colón, CABA",
      organizador: julieta,
      tipos: [
        ["platea", "Platea", 60000, 400],
        ["palco", "Palco", 95000, 40, "Palco para cuatro personas"],
        ["galeria", "Galería", 25000, 300],
      ],
    }),
    evento({
      id: "e-devconf",
      nombre: "DevDays Buenos Aires",
      descripcion:
        "Una jornada completa de charlas sobre desarrollo web, mobile y nube, con talleres prácticos.",
      categoria: categoria.conferencias,
      dias: 22,
      hora: 9,
      lugar: "Centro Costa Salguero, CABA",
      organizador: diego,
      tipos: [
        ["general", "General", 25000, 800],
        ["workshop", "Workshop", 45000, 60, "Charlas más un taller práctico"],
      ],
    }),
    evento({
      id: "e-electronica",
      nombre: "Noche Electrónica al Río",
      descripcion: "Seis DJs, un escenario frente al río y luces hasta el amanecer.",
      categoria: categoria.festivales,
      dias: 25,
      hora: 23,
      lugar: "Costanera Norte, CABA",
      organizador: camila,
      tipos: [
        ["general", "General", 40000, 3000],
        ["vip", "VIP", 85000, 250, "Barra y baños exclusivos, con vista elevada"],
      ],
    }),
    evento({
      id: "e-ballet",
      nombre: "El Lago de los Cisnes",
      descripcion: "El ballet de Chaikovski con cuerpo de baile completo y orquesta en vivo.",
      categoria: categoria.teatro,
      dias: 30,
      hora: 20,
      lugar: "Teatro Colón, CABA",
      organizador: julieta,
      tipos: [
        ["platea", "Platea", 70000, 300],
        ["cazuela", "Cazuela", 30000, 150],
      ],
    }),
    evento({
      id: "e-startups",
      nombre: "Encuentro de Startups",
      descripcion: "Emprendedores cuentan cómo arrancaron. Entrada libre con inscripción.",
      categoria: categoria.conferencias,
      dias: 36,
      hora: 18,
      lugar: "Distrito Tecnológico, Parque Patricios",
      organizador: diego,
      tipos: [["general", "General", 0, 500]],
    }),
    evento({
      id: "e-humor",
      nombre: "Humor sin Red",
      descripcion: "El espectáculo de stand up más visto del año, ahora en una sala grande.",
      categoria: categoria["stand-up"],
      dias: 40,
      lugar: "Teatro Ópera, CABA",
      organizador: diego,
      tipos: [
        ["platea", "Platea", 20000, 600],
        ["pullman", "Pullman", 15000, 400],
      ],
    }),
    evento({
      id: "e-tenis",
      nombre: "Exhibición de Tenis",
      descripcion: "Leyendas del tenis argentino juegan una exhibición a beneficio.",
      categoria: categoria.deportes,
      dias: 50,
      hora: 16,
      lugar: "Parque Roca, Villa Soldati",
      organizador: diego,
      tipos: [
        ["general", "General", 30000, 2000],
        ["preferencial", "Preferencial", 55000, 400],
      ],
    }),
    evento({
      id: "e-food-fest",
      nombre: "Buenos Aires Food Fest",
      descripcion: "Más de cuarenta puestos de comida, música en vivo y clases de cocina abiertas.",
      categoria: categoria.festivales,
      dias: 70,
      hora: 12,
      lugar: "Parque Tres de Febrero, Palermo",
      organizador: camila,
      tipos: [
        ["entrada", "Entrada", 12000, 6000],
        ["degustacion", "Degustación", 35000, 500, "Entrada más ocho platos a elección"],
      ],
    }),
    // Se pospone más abajo, después de vender.
    evento({
      id: "e-cumbia",
      nombre: "Fiesta de la Cumbia",
      descripcion: "Las bandas de cumbia más bailadas, en una sola noche.",
      categoria: categoria.musica,
      dias: 5,
      hora: 23,
      lugar: "Microestadio Malvinas Argentinas, CABA",
      organizador: camila,
      tipos: [["general", "General", 12000, 1200]],
    }),
    // Se cancela más abajo, después de vender.
    evento({
      id: "e-trail",
      nombre: "Trail Run en las Sierras",
      descripcion: "Carrera de montaña de 21 km por los cerros de Tandil.",
      categoria: categoria.deportes,
      dias: 26,
      hora: 8,
      lugar: "Cerro El Centinela, Tandil",
      organizador: diego,
      tipos: [["inscripcion", "Inscripción", 28000, 500]],
    }),
    // Ya realizados.
    evento({
      id: "e-meetup-ux",
      nombre: "Meetup de Diseño UX",
      descripcion: "Charlas cortas sobre investigación con usuarios y sistemas de diseño.",
      categoria: categoria.conferencias,
      dias: -5,
      hora: 19,
      lugar: "Área 3, Palermo",
      organizador: diego,
      tipos: [["general", "General", 0, 150]],
    }),
    evento({
      id: "e-cine",
      nombre: "Cine bajo las Estrellas",
      descripcion: "Clásicos del cine nacional en pantalla gigante, al aire libre.",
      categoria: categoria.festivales,
      dias: -10,
      lugar: "Rosedal de Palermo",
      organizador: camila,
      tipos: [["general", "General", 7000, 400]],
    }),
    evento({
      id: "e-carroza",
      nombre: "Esperando la Carroza",
      descripcion: "La comedia de Jacobo Langsner, con un elenco de primeras figuras.",
      categoria: categoria.teatro,
      dias: -12,
      hora: 20,
      lugar: "Teatro Metropolitan, CABA",
      organizador: martin,
      tipos: [["platea", "Platea", 20000, 300]],
    }),
    evento({
      id: "e-big-band",
      nombre: "Big Band en el Konex",
      descripcion: "Diecisiete músicos en escena repasan el swing de las grandes orquestas.",
      categoria: categoria.musica,
      dias: -21,
      lugar: "Ciudad Cultural Konex, Abasto",
      organizador: julieta,
      tipos: [["general", "General", 15000, 500]],
    }),
    evento({
      id: "e-stand-up-verano",
      nombre: "Stand Up de Verano",
      descripcion: "Los mejores números de la temporada de verano, en una sola función.",
      categoria: categoria["stand-up"],
      dias: -40,
      hora: 22,
      lugar: "Paseo La Plaza, CABA",
      organizador: tomas,
      tipos: [["general", "General", 12000, 250]],
    }),
  ];
  datos.eventos.push(...eventos);
  const porId = Object.fromEntries(datos.eventos.map((e) => [e.id, e]));

  // --- Compras con chats escritos a mano ---------------------------------------------------------------------

  const compras = [];
  const comprar = crearComprador({ hoy, compras, resenias: datos.resenias });
  let numeroCompra = 100;
  const siguienteCompra = () => `c-${numeroCompra++}`;
  const compraEn = (comprador, eventoId, sufijoTipo, cantidad, estado, opciones) =>
    comprar(
      siguienteCompra(),
      comprador,
      porId[eventoId],
      `${eventoId}-${sufijoTipo}`,
      cantidad,
      estado,
      opciones,
    );

  compraEn(sofia, "e-sinfonica", "platea", 2, "CONFIRMADA", {
    diasAntes: 6,
    mensajes: [
      [sofia, "Hola Julieta, ¿desde la platea se ve bien todo el escenario?", 0],
      [julieta, "¡Hola Sofía! Sí, se ve todo. Si podés, llegá media hora antes para ubicarte tranquila.", 45],
      [sofia, "Genial. ¿Se puede entrar con una mochila chica o hay guardarropa?", 60],
      [julieta, "Hay guardarropa gratuito en el hall, así que sin problema.", 95],
      [sofia, "¡Mil gracias!", 100],
    ],
  });
  compraEn(tomas, "e-devconf", "workshop", 1, "CONFIRMADA", {
    diasAntes: 2,
    mensajes: [
      [tomas, "Hola Diego, ¿para el workshop hay que llevar notebook?", 0],
      [
        diego,
        "Hola Tomás, sí: traela con Node 22 instalado. Unos días antes te mandamos el repositorio.",
        30,
      ],
      [tomas, "Perfecto. ¿Va a haber enchufes en las mesas?", 40],
      [diego, "Sí, cada mesa tiene zapatillas y hay wifi para todos.", 70],
    ],
  });
  compraEn(agustina, "e-tributo-80", "general", 2, "CONFIRMADA", {
    diasAntes: 1,
    mensajes: [
      [agustina, "Hola, compré dos generales. ¿Puede usar una mi hermana si yo no voy?", 0],
      [lucia, "¡Hola Agustina! Sí, las entradas no son nominativas: alcanza con mostrar el código.", 25],
      [agustina, "Buenísimo. ¿Hay un horario límite para entrar?", 30],
      [lucia, "Las puertas cierran a las 21:30, cuando arranca la banda.", 50],
      [agustina, "Ahí estaremos 🙌", 55],
      [agustina, "Una más: ¿se puede llevar cámara de fotos?", 58],
    ],
  });
  compraEn(federico, "e-futbol", "popular", 4, "PENDIENTE", {
    diasAntes: 1,
    mensajes: [
      [federico, "Hola, me rechazó la tarjeta al pagar. ¿La reserva se mantiene?", 0],
      [diego, "Hola Federico, sí: la reserva sigue en pie. Probá con otra tarjeta desde la compra.", 20],
      [federico, "Dale, lo intento a la noche. ¿Los menores pagan entrada?", 35],
      [diego, "Los menores de 6 años no pagan si van a upa de un adulto.", 60],
      [federico, "¡Gracias!", 62],
    ],
  });
  compraEn(valentina, "e-ballet", "platea", 2, "REEMBOLSADA", {
    diasAntes: 9,
    cancelaEnMinutos: 120,
    mensajes: [
      [valentina, "Hola Julieta, se me complicó la fecha. Si cancelo, ¿me devuelven todo?", 0],
      [
        julieta,
        "Hola Valentina, sí: si cancelás antes de la función te reintegramos el total a la tarjeta.",
        90,
      ],
      [valentina, "Listo, ya la cancelé. ¡Ojalá pueda ir a la próxima temporada!", 130],
      [julieta, "¡Te esperamos! Las fechas nuevas las publicamos acá.", 180],
    ],
  });
  compraEn(lautaro, "e-bernarda", "general", 2, "CONFIRMADA", {
    diasAntes: 4,
    mensajes: [
      [lautaro, "Hola Martín, ¿cuánto dura la función? Venimos con el tiempo justo.", 0],
      [martin, "Hola Lautaro, dura 1 h 40 min sin intervalo.", 40],
      [lautaro, "¿Se puede llegar unos minutos tarde?", 45],
      [martin, "Una vez empezada la función no se permite el ingreso, así que llegá con tiempo 😉", 80],
    ],
  });
  compraEn(martin, "e-electronica", "vip", 2, "CONFIRMADA", {
    diasAntes: 3,
    mensajes: [
      [martin, "Hola Camila, ¿el VIP tiene barra propia?", 0],
      [camila, "¡Hola Martín! Sí: barra y baños exclusivos, y un sector con vista elevada.", 15],
      [martin, "Buenísimo. ¿Se puede salir y volver a entrar?", 20],
      [camila, "Con la pulsera VIP, todas las veces que quieras.", 35],
    ],
  });
  compraEn(paula, "e-obra-infantil", "familiar", 1, "CONFIRMADA", {
    diasAntes: 1,
    mensajes: [[paula, "Hola, ¿la obra es apta para chicos de 3 años?", 10]],
  });
  compraEn(rocio, "e-big-band", "general", 2, "UTILIZADA", {
    diasAntes: 10,
    mensajes: [
      [rocio, "¿Hay mesas o es de pie?", 0],
      [julieta, "Hay mesas por orden de llegada, y algunas butacas al fondo.", 30],
    ],
    resenia: { puntuacion: 5, detalle: "Llegamos temprano, conseguimos mesa y el show fue espectacular." },
  });

  // El taller de fotografía se agota: 12 lugares, 12 vendidos.
  const tallerAgotado = [
    [agustina, 2],
    [santiago, 3],
    [florencia, 2],
    [joaquin, 3],
    [sofia, 2],
  ].map(([comprador, cantidad], i) =>
    compraEn(comprador, "e-fotografia", "taller", cantidad, "CONFIRMADA", { diasAntes: 12 - 2 * i }),
  );

  // --- Compras generadas ------------------------------------------------------------------------------------

  // Una pregunta frecuente con su respuesta o, a veces, una que todavía nadie respondió.
  const chatAlAzar = (comprador, organizador) => {
    const tirada = azar();
    if (tirada < 0.25) {
      const [pregunta, respuesta] = elegir(PREGUNTAS_FRECUENTES);
      const minutos = entre(5, 600);
      return [
        [comprador, pregunta, minutos],
        [organizador, respuesta, minutos + entre(10, 240)],
      ];
    }
    if (tirada < 0.3) return [[comprador, elegir(PREGUNTAS_SIN_RESPONDER), entre(5, 600)]];
    return [];
  };

  const estadoFuturo = () => {
    const tirada = azar();
    if (tirada < 0.7) return "CONFIRMADA";
    if (tirada < 0.8) return "PENDIENTE";
    if (tirada < 0.9) return "REEMBOLSADA";
    return "CANCELADA_SIN_PAGO";
  };

  const puntuacionCerca = (nivel) => Math.min(5, Math.max(1, Math.round(nivel + (azar() - 0.5) * 2)));

  // Vende `cantidadCompras` compras del evento a compradores que todavía no le compraron. En los eventos
  // realizados casi todas quedan UTILIZADAS y muchas con reseña, alrededor de `nivel` estrellas.
  function vender(ev, cantidadCompras, { nivel = 4, diasMinimos = 1, soloVigentes = false } = {}) {
    const realizado = ev.yaSeRealizo(reloj);
    const yaCompraron = new Set(
      datos.compras
        .concat(compras)
        .filter((c) => c.evento === ev)
        .map((c) => c.comprador.id),
    );
    const candidatos = compradores.filter((c) => !ev.esOrganizadoPor(c) && !yaCompraron.has(c.id));
    // Los tipos con poco cupo quedan como están: alguno es el "casi agotado" de base.
    const tipos = ev.tiposEntrada.filter((t) => t.cupo >= 20);
    for (let i = 0; i < cantidadCompras && candidatos.length > 0 && tipos.length > 0; i += 1) {
      const comprador = candidatos.splice(Math.floor(azar() * candidatos.length), 1)[0];
      const tipoEntrada = azar() < 0.6 ? tipos[0] : elegir(tipos);
      const cantidad = elegir([1, 1, 2, 2, 2, 3, 4]);
      if (!tipoEntrada.hayCupoPara(cantidad)) continue;

      let estado = realizado ? (azar() < 0.9 ? "UTILIZADA" : "REEMBOLSADA") : estadoFuturo();
      if (soloVigentes && !["CONFIRMADA", "PENDIENTE"].includes(estado)) estado = "CONFIRMADA";
      // Una entrada gratis nace confirmada: no hay pago pendiente ni reembolso.
      if (tipoEntrada.precio === 0 && estado !== "UTILIZADA") estado = "CONFIRMADA";

      const opciones = {
        diasAntes: entre(diasMinimos, 30),
        cancelaEnMinutos: entre(30, 600),
        mensajes: chatAlAzar(comprador, ev.organizador),
      };
      if (estado === "UTILIZADA" && azar() < 0.75) {
        const puntuacion = puntuacionCerca(nivel);
        opciones.resenia = { puntuacion, detalle: elegir(RESENIAS[puntuacion]) };
      }
      comprar(siguienteCompra(), comprador, ev, tipoEntrada.id, cantidad, estado, opciones);
    }
  }

  const proximos = [
    ["e-cuarteto", 10],
    ["e-yoga", 8],
    ["e-obra-infantil", 9],
    ["e-folklore", 8],
    ["e-bernarda", 7],
    ["e-futbol", 12],
    ["e-monologos", 9],
    ["e-tributo-80", 11],
    ["e-sinfonica", 10],
    ["e-devconf", 12],
    ["e-electronica", 12],
    ["e-ballet", 8],
    ["e-startups", 10],
    ["e-humor", 9],
    ["e-tenis", 8],
    ["e-food-fest", 11],
    // De base: les suma ventas sin tocar las compras que ya tenían.
    ["e-jazz-club", 6],
    ["e-hamlet", 7],
    ["e-musical", 6],
    ["e-stand-up", 6],
    ["e-superclasico", 8],
    ["e-maraton", 9],
    ["e-ia-conf", 8],
    ["e-festival", 10],
  ];
  for (const [id, cantidad] of proximos) vender(porId[id], cantidad);

  const realizados = [
    ["e-meetup-ux", 8, 4.6],
    ["e-cine", 10, 4.2],
    ["e-carroza", 9, 3.6],
    ["e-big-band", 8, 4.7],
    ["e-stand-up-verano", 9, 3.9],
    ["e-tango", 4, 4.5],
    ["e-impro", 5, 3.2],
    ["e-indie", 4, 4.4],
  ];
  for (const [id, cantidad, nivel] of realizados) vender(porId[id], cantidad, { nivel });

  // --- Evento pospuesto y evento cancelado ------------------------------------------------------------------

  const notificaciones = [];
  let numeroNotificacion = 100;
  const avisar = (datosAviso) => {
    const { fechaHora } = datosAviso;
    const leida = hoy.getTime() - fechaHora.getTime() > DIAS_HASTA_LEIDA * UN_DIA_MS;
    notificaciones.push(new Notificacion({ id: `n-${numeroNotificacion++}`, leida, ...datosAviso }));
  };

  // La fiesta de cumbia se pasa dos semanas: las entradas siguen valiendo.
  const cumbia = porId["e-cumbia"];
  compraEn(micaela, "e-cumbia", "general", 3, "CONFIRMADA", {
    diasAntes: 8,
    mensajes: [
      [micaela, "Vi que se pospuso. ¿Mis entradas sirven para la nueva fecha?", 7 * 24 * 60],
      [
        camila,
        "¡Hola Micaela! Sí, valen tal cual. Si no podés ir, cancelás y te devolvemos todo.",
        7 * 24 * 60 + 25,
      ],
      [micaela, "Perfecto, la nueva fecha me queda mejor igual 😄", 7 * 24 * 60 + 40],
      [camila, "¡Qué bueno! Perdón por el cambio.", 7 * 24 * 60 + 55],
    ],
  });
  vender(cumbia, 10, { diasMinimos: 4, soloVigentes: true });
  const alPosponer = new RelojFijo(hoy.getTime() - 2 * UN_DIA_MS);
  const motivoPostergacion = "Una de las bandas principales tuvo un problema de salud.";
  const fechaAnterior = cumbia.posponer(fechaEn(hoy, 19, 23), alPosponer);
  for (const compra of compras.filter((c) => c.evento === cumbia && c.vigente)) {
    avisar({
      destinatario: compra.comprador,
      tipo: TipoNotificacion.EVENTO_POSPUESTO,
      ...textoEventoPospuesto(compra, { fechaAnterior, motivo: motivoPostergacion }),
      evento: cumbia,
      compra,
      fechaHora: alPosponer.ahora(),
    });
  }
  // La carrera de montaña se cancela: las compras pagadas se reembolsan.
  const trail = porId["e-trail"];
  compraEn(nicolas, "e-trail", "inscripcion", 1, "CONFIRMADA", {
    diasAntes: 15,
    mensajes: [
      [nicolas, "Hola, ¿la inscripción incluye el traslado desde Buenos Aires?", 0],
      [diego, "Hola Nicolás, no incluye traslado, pero armamos un grupo para compartir autos.", 90],
      [nicolas, "Qué lástima que se suspendió. ¿Va a haber nueva fecha?", 13 * 24 * 60],
      [
        diego,
        "Estamos gestionando los permisos para el otoño. Apenas tengamos fecha, la publicamos.",
        13 * 24 * 60 + 60,
      ],
    ],
  });
  vender(trail, 9, { diasMinimos: 4, soloVigentes: true });
  const alCancelar = new RelojFijo(hoy.getTime() - 3 * UN_DIA_MS);
  const motivoCancelacion = "No conseguimos los permisos municipales para usar el cerro.";
  trail.cancelar(alCancelar);
  for (const compra of compras.filter((c) => c.evento === trail && c.vigente)) {
    // El texto se arma antes de cancelar la compra, como en el service.
    const texto = textoEventoCancelado(compra, { motivo: motivoCancelacion });
    compra.cancelarPorEvento(diego, alCancelar);
    avisar({
      destinatario: compra.comprador,
      tipo: TipoNotificacion.EVENTO_CANCELADO,
      ...texto,
      evento: trail,
      compra,
      fechaHora: alCancelar.ahora(),
    });
    if (compra.requiereReembolso()) {
      const alReembolsar = new RelojFijo(alCancelar.ahora().getTime() + 10 * UN_MINUTO_MS);
      compra.reembolsar(alReembolsar);
      avisar({
        destinatario: compra.comprador,
        tipo: TipoNotificacion.REEMBOLSO_REALIZADO,
        ...textoReembolso(compra),
        evento: trail,
        compra,
        fechaHora: alReembolsar.ahora(),
      });
    }
  }

  // --- Avisos de lo que pasó en cada compra -----------------------------------------------------------------

  const cuando = (compra, estado) => compra.historial.find((cambio) => cambio.estado === estado)?.fechaHora;
  for (const compra of compras) {
    const { comprador, evento: ev } = compra;
    const deLaCompra = { evento: ev, compra, tipoEntrada: compra.tipoEntrada };
    if (compra.fuePagada) {
      avisar({
        destinatario: comprador,
        tipo: TipoNotificacion.PAGO_CONFIRMADO,
        ...textoPagoConfirmado(compra),
        ...deLaCompra,
        fechaHora: cuando(compra, EstadoCompra.CONFIRMADA),
      });
    }
    // Las devoluciones por el evento cancelado ya se avisaron arriba.
    if (compra.estado === EstadoCompra.REEMBOLSADA && !ev.estaCancelado()) {
      const fechaHora = cuando(compra, EstadoCompra.REEMBOLSADA);
      avisar({
        destinatario: comprador,
        tipo: TipoNotificacion.REEMBOLSO_REALIZADO,
        ...textoReembolso(compra),
        ...deLaCompra,
        fechaHora,
      });
      avisar({
        destinatario: ev.organizador,
        tipo: TipoNotificacion.COMPRA_DEVUELTA,
        ...textoCompraDevuelta(compra),
        ...deLaCompra,
        fechaHora,
      });
    }
    if (compra.estado === EstadoCompra.UTILIZADA) {
      avisar({
        destinatario: comprador,
        tipo: TipoNotificacion.ENTRADA_UTILIZADA,
        ...textoEntradaUtilizada(compra),
        ...deLaCompra,
        fechaHora: cuando(compra, EstadoCompra.UTILIZADA),
      });
    }
    // El chat: un solo aviso a la otra parte, que junta los últimos mensajes seguidos de quien escribió.
    const ultimo = compra.mensajes.at(-1);
    if (ultimo) {
      let seguidos = 0;
      for (
        let i = compra.mensajes.length - 1;
        i >= 0 && compra.mensajes[i].usuario.es(ultimo.usuario);
        i -= 1
      ) {
        seguidos += 1;
      }
      avisar({
        destinatario: ultimo.usuario.es(comprador) ? ev.organizador : comprador,
        tipo: TipoNotificacion.MENSAJE_NUEVO,
        ...textoMensajeNuevo(compra, ultimo, seguidos),
        ...deLaCompra,
        cantidad: seguidos,
        fechaHora: ultimo.enviado,
      });
    }
  }

  const fotografia = porId["e-fotografia"];
  avisar({
    destinatario: camila,
    tipo: TipoNotificacion.EVENTO_AGOTADO,
    ...textoEventoAgotado(fotografia),
    evento: fotografia,
    tipoEntrada: fotografia.tiposEntrada[0],
    fechaHora: tallerAgotado.at(-1).fechaCreacion,
  });

  datos.compras.push(...compras);
  datos.notificaciones.push(...notificaciones);

  // --- Favoritos y tarjetas ---------------------------------------------------------------------------------

  const futuros = datos.eventos.filter((ev) => !ev.yaSeRealizo(reloj) && !ev.estaCancelado());
  for (const usuario of [...compradoresNuevos, tomas, valentina]) {
    for (let i = entre(1, 4); i > 0; i -= 1) {
      usuario.agregarFavorito(elegir(futuros));
    }
  }

  compradoresNuevos.forEach((usuario, i) => {
    const visa = i % 2 === 0;
    datos.tarjetas.push(
      new Tarjeta({
        id: `t-${usuario.id.slice(2)}-${visa ? "visa" : "master"}`,
        usuarioId: usuario.id,
        marca: visa ? "Visa" : "Mastercard",
        ultimos4: String(1000 + ((i * 1373) % 9000)),
        vencimientoMes: 1 + ((i * 5) % 12),
        vencimientoAnio: 2028 + (i % 4),
        titular: usuario.nombreCompleto(),
        token: `tok_demo_${usuario.id}`,
      }),
    );
  });
}
