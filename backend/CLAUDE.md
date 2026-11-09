# Backend: AI Ticket It API

Node + Express 5, JavaScript ESM, persistencia en memoria. Tests con Jest + Supertest.

## Capas (una request recorre este camino)

| Capa         | Carpeta             | Responsabilidad                                                                                                                                                                        | No hace                           |
| ------------ | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Rutas        | `src/routes/`       | Asocia el método y el path con un controller, aplica `validar(schema)` y `requiereAutenticacion`, y **documenta el endpoint en OpenAPI** (`documentarX(registro)` en el mismo archivo) | Lógica                            |
| Controllers  | `src/controllers/`  | Lee `req.validado` y `req.usuario`, llama al service y responde con un DTO y el status correcto                                                                                        | Reglas de negocio, acceso a repos |
| Services     | `src/services/`     | Orquesta el caso de uso: busca en los repos, chequea permisos, delega en el dominio y persiste                                                                                         | HTTP (`req`, `res`)               |
| Dominio      | `src/domain/`       | Entidades ricas con las reglas de negocio (cupo, transiciones de estado, reseñas)                                                                                                      | Saber de Express o de repos       |
| Repositorios | `src/repositories/` | Persistencia en memoria. Misma interfaz que tendría una base real                                                                                                                      | Reglas                            |
| DTOs         | `src/dtos/`         | Arman el JSON de respuesta a partir de las entidades                                                                                                                                   | Lógica                            |
| Schemas      | `src/schemas/`      | Schemas Zod de request y response. Siempre importar `z` desde `src/schemas/zod.js` (tiene `.openapi()`)                                                                                |                                   |
| Infra        | `src/infra/`        | Config, logger, OpenAPI, `Reloj`, autenticador, pasarela de pagos                                                                                                                      |                                   |

Las dependencias se arman a mano en `src/app.js` (`createApp`). Todo lo que un test quiera reemplazar (repos, reloj, autenticador, config) se recibe como parámetro de `createApp`.

Ejemplo completo para copiar al hacer un endpoint nuevo: `routes/eventosRoutes.js` → `controllers/EventosController.js` → `services/EventosService.js` → `repositories/EventosRepository.js`.

## Errores

- Lanzar siempre una subclase de `AppError` (`src/errors/index.js`): `ValidacionError` 400, `NoAutenticadoError` 401, `ProhibidoError` 403, `NoEncontradoError` 404, `ReglaNegocioError` 409. Las reglas de negocio puntuales son subclases de `ReglaNegocioError`, cada una con su propio `codigo` (`SIN_CUPO`, `TRANSICION_INVALIDA`…).
- El `errorHandler` responde `{ error: { codigo, mensaje, detalles? } }`. Cualquier otro error termina en 500 con un mensaje genérico, y se loguea completo con pino.
- Express 5 lleva al `errorHandler` tanto los errores lanzados como las promesas rechazadas de los handlers: no hace falta `try/catch` en los controllers.

## Reglas de negocio (fuente de verdad, cada una con su test)

**Transiciones de Compra** (patrón State: una clase por estado en `src/domain/estados/`):

| Estado actual           | Pagar        | Cancelar                                                 | Cancelar por evento (se cancela el evento) | Posponer el evento            | Validar (usar)                    | Reseñar                                      |
| ----------------------- | ------------ | -------------------------------------------------------- | ------------------------------------------ | ----------------------------- | --------------------------------- | -------------------------------------------- |
| PENDIENTE               | → CONFIRMADA | → CANCELADA (sin reembolso, o sola al vencer la reserva) | → CANCELADA (sin reembolso)                | sigue igual                   | ✗                                 | ✗                                            |
| CONFIRMADA              | ✗            | → CANCELADA → REEMBOLSADA (automático, vía la pasarela)  | → CANCELADA → REEMBOLSADA                  | sigue igual                   | → UTILIZADA (solo el organizador) | ✗                                            |
| UTILIZADA               | ✗            | ✗                                                        | → CANCELADA → REEMBOLSADA                  | → CONFIRMADA (el organizador) | ✗                                 | ✓, una sola vez (no si se canceló el evento) |
| CANCELADA / REEMBOLSADA | ✗            | ✗                                                        | ✗                                          | sigue igual                   | ✗                                 | ✗                                            |

- Toda transición registra un `CambioEstadoCompra` (estado, quién, fechaHora). Una transición inválida lanza `TransicionInvalidaError` (409).
- **Cancelar por evento** (`Compra#cancelarPorEvento`, `Estado#cancelarPorEvento`): por defecto delega en `cancelar`, así PENDIENTE y CONFIRMADA se comportan igual y CANCELADA y REEMBOLSADA la rechazan. `Utilizada` la redefine: el evento no se va a hacer, así que se cancela aunque CU8 no se lo permita al comprador. No mira la fecha. Con un pago en proceso lanza `PAGO_EN_PROCESO`: se espera el resultado del cobro.
- **Reabrir por postergación** (`Compra#reabrirPorPostergacion`, `Estado#reabrirPorPostergacion`): rechaza por defecto; solo `Utilizada` la redefine y pasa a CONFIRMADA, con `quien` = el organizador (cualquier otro usuario, 403). El evento todavía no se hizo, así que la entrada vuelve a valer para la nueva fecha: se puede cancelar con reembolso y validar de nuevo. El cupo sigue tomado.
- **Vencimiento de la reserva**: una compra PENDIENTE sin pagar vence a los `RESERVA_PLAZO_MINUTOS` (15 por defecto). `server.js` barre cada 60 s (`ComprasService#vencerReservas`, también `app.locals.vencerReservas()`): pasa a CANCELADA con `quien` null (el sistema), libera el cupo y la API informa `reservaVencida: true`. Pagar una reserva vencida responde 409 `RESERVA_VENCIDA`. Regla: una reserva no puede darse por vencida si la persona tocó Pagar y todavía no hay respuesta. Por eso, con un pago en proceso no vence, sin importar cuánto tarde la pasarela (si se aprueba queda CONFIRMADA aunque el plazo haya pasado). A partir de `reservaVenceEn` (la hora que muestra la app) `acciones.pagar` es false y la API informa `reservaPlazoCumplido: true` (`Compra#plazoDePagoCumplido`), pero la compra sigue PENDIENTE, el cupo no se liberó y `POST /pago` se sigue aceptando: es el pedido que venía en camino. `reservaVencida` es true solo con la reserva ya cancelada por el sistema (`Compra#canceladaPorVencimiento`): antes no se puede decir que venció. El barrido recién la cancela (`Compra#correspondeVencer`) `Compra.MARGEN_PAGO_EN_CAMINO_MS` (60 s) después de esa hora, más que el timeout de la app: en total, entre 1 y 2 minutos después. Si la tarjeta se rechaza quedan 5 minutos más para reintentar (`Compra.GRACIA_TRAS_RECHAZO_MS`). `reservaVenceEn` solo se informa si está PENDIENTE. Una compra sin `venceEn` no vence: las PENDIENTES del seed (c-03, c-04) no vencen, para que las demos y los E2E no dependan de la hora. Una reserva de un evento cancelado no vence (`correspondeVencer` es false): la cancela el barrido de eventos cancelados, sin avisar `RESERVA_VENCIDA`. No existe un estado `VENCIDA`: el diagrama de la cátedra no lo tiene.
- **Cancelar**: no se puede si la compra está UTILIZADA, si el evento ya se realizó (`ahora >= fecha`) ni si el evento se canceló (409 `EVENTO_CANCELADO`: de esa compra se ocupa el sistema). Libera el cupo. Una compra gratis (total 0) pagada queda CANCELADA: no hay nada que devolver (`Compra#requiereReembolso`), así que no se le pide a la pasarela un reembolso de $ 0 ni se avisa `REEMBOLSO_REALIZADO`. Lo mismo al cancelarse su evento.
- **Comprar**:
  - El evento tiene que ser futuro, no estar cancelado (409 `EVENTO_CANCELADO`) y el tipo de entrada tiene que ser de ese evento.
  - Cantidad entera entre 1 y 10, que además cumpla `hayCupoPara`.
  - Total = precio × cantidad, con el precio congelado al momento de comprar.
  - El organizador no puede comprar entradas de su propio evento.
  - El cupo se reserva al crear la compra (PENDIENTE).
- **Pagar** es asincrónico: `POST /compras/:id/pago` verifica la transición y la tarjeta (del comprador), registra una `OperacionPago` PENDIENTE y responde **202** con su `operacionId`. La pasarela cobra en segundo plano (`ComprasService#procesarCobro`) y el resultado se consulta en `GET /compras/:id/pago/:operacionId`. El estado "en proceso" vive en la operación: la compra sigue PENDIENTE hasta que se aprueba. Mientras hay una operación pendiente no se puede iniciar otro pago ni cancelar (409 `PAGO_EN_PROCESO`). La operación solo la ve el comprador.
- **Idempotencia**: `POST /compras`, `POST /pago`, `/cancelacion` de una compra y `POST /eventos/:id/postergacion` y `/cancelacion` aceptan el header `Idempotency-Key` (middleware `idempotente`, que necesita `validar({ headers: IdempotenciaHeaders })` antes; los schemas están en `schemas/comunes.js`). Con la misma clave, por usuario, se devuelve la respuesta guardada con `Idempotent-Replayed: true`, sin volver a operar. Solo se guardan las respuestas exitosas. Otros datos con la misma clave: 409 `CLAVE_IDEMPOTENCIA_REUTILIZADA`; la primera request todavía en curso: 409 `OPERACION_EN_CURSO`. Ojo: un reintento de `POST /compras` devuelve la foto original, aunque la compra haya cambiado después (por ejemplo, si venció): el estado actual lo da `GET /compras/:id`.
- **Pasarela simulada**: `PASARELA_DEMORA_MS` define cuánto tarda en cobrar (0 si no se define; 2500 en desarrollo). La tarjeta `4000 0000 0000 0002` siempre se rechaza (`PAGO_RECHAZADO`). En tests, `pasarelaEnEspera()` (`test/helpers/pagos.js`) deja el cobro pendiente hasta que el test lo libera.
- **Tarjetas**: la pasarela las tokeniza; se guardan la marca, los últimos 4, el vencimiento y el token, nunca el número completo ni el código. Una tarjeta vencida no se acepta.
- **Pasarela caída**: cualquier falla inesperada suya se informa como `PASARELA_NO_DISPONIBLE` (`ComprasService#conPasarela`). Si falla el cobro, la operación queda RECHAZADA con ese motivo y la compra sigue PENDIENTE. Si falla el reembolso, responde 503, queda CANCELADA con `acciones.reintentarReembolso` y volver a cancelarla reintenta solo el reembolso (aunque el evento ya haya pasado). En desarrollo, `POST /api/dev/pasarela { disponible }` la apaga.
- **Disponibles por tipo**: `cupo − vendidas`. Cuentan como vendidas las compras PENDIENTE, CONFIRMADA y UTILIZADA.
- **Días restantes**: solo para compras CONFIRMADAS, `ceil((fecha − ahora) / 1 día)`.
- **Crear evento**:
  - Fecha futura y al menos 1 tipo de entrada, sin nombres repetidos.
  - Precio ≥ 0 y cupo ≥ 1.
  - La categoría tiene que existir.
  - El organizador es el usuario autenticado.
- **Estado del evento** (`EstadoEvento` en `Evento.js`): PROGRAMADO, POSPUESTO o CANCELADO. Va en todos los DTOs de evento (y en el `evento` de una compra) junto con `finalizado`, que sigue diciendo si ya pasó la fecha.
- **Posponer** (`POST /eventos/:id/postergacion`, `Evento#posponer`): solo el organizador (403 "Solo el organizador puede gestionar este evento"). Un evento cancelado responde 409 `EVENTO_CANCELADO` y uno que ya se realizó, 409 `EVENTO_FINALIZADO`, en ese orden. La nueva fecha tiene que ser posterior a la actual (400). Queda POSPUESTO y las entradas siguen valiendo. Primero las UTILIZADAS vuelven a CONFIRMADA (`ComprasService#reabrirEntradasPorPostergacion`, por compra y con el candado): el evento no se hizo, y así el organizador las puede validar de nuevo y el comprador cancelarlas. Después cada compra **vigente** recibe `EVENTO_POSPUESTO` y quien no pueda ir cancela con reembolso (CU7). Las CANCELADAS no reciben aviso.
- **Cancelar un evento** (`POST /eventos/:id/cancelacion`, `Evento#cancelar`): mismos permisos y errores. Se toman las compras vigentes, el evento queda CANCELADO, cada una recibe `EVENTO_CANCELADO` y después `ComprasService#resolverCancelacionDeEvento` las cancela por evento (incluso las UTILIZADAS) y reembolsa las pagadas, con `REEMBOLSO_REALIZADO` cuando vuelve el dinero. El evento queda cancelado aunque la pasarela no responda: esas compras quedan CANCELADAS a la espera del reembolso. Un cancelado sale de la búsqueda siempre; el detalle, los favoritos y "Mis eventos" lo siguen mostrando. No se puede comprar, pagar, validar ni reseñar una compra de un evento cancelado; en `acciones` solo queda `chatear` (y `reintentarReembolso` si falta el reembolso).
- **Barrido de eventos cancelados** (`ComprasService#resolverEventosCancelados`, también `app.locals.resolverEventosCancelados()`): `server.js` lo corre en el mismo intervalo que `vencerReservas`. Busca las compras de eventos cancelados que siguen vigentes o sin el reembolso hecho (`Compra#pendienteDeCancelacionPorEvento`, `ComprasRepository#buscarPendientesPorEventoCancelado`) y las resuelve con `quien` null. Cada compra va por separado y con `#sinOperacionesSimultaneas`: una con `OPERACION_EN_CURSO` o `PAGO_EN_PROCESO` se saltea sin loguear y queda para el próximo barrido; cualquier otro error (la pasarela caída) se loguea. Devuelve `{ resueltas, pendientes }`.
- **Un pago en vuelo cuando se cancela el evento**: la cancelación lo saltea (`PAGO_EN_PROCESO`). Cuando el cobro termina, `#procesarCobro` ve el evento cancelado, no avisa el resultado del pago (ya llegó "Se canceló") y resuelve esa compra: si se cobró, queda REEMBOLSADA; si no, CANCELADA. Por separado: solo lo que responde la pasarela rechaza un pago. Si después de un cobro exitoso falla el dominio, no se informa un rechazo: se loguea con la transacción para conciliarla.
- **Chat**: solo el comprador y el organizador del evento, con la compra en cualquier estado. Mensajes de 1 a 1000 caracteres. Cualquier otro usuario recibe 403.
- **Reseña**: solo el comprador de una compra UTILIZADA, una por compra. Puntuación entera de 1 a 5 y detalle de hasta 500 caracteres.
- **Puntaje del organizador**: promedio de sus reseñas con 1 decimal, o `null` si no tiene. Al ordenar por puntaje, los `null` van últimos.

**Notificaciones** (in-app, `NotificacionesService`; la app las lee en `/api/notificaciones`):

- **Al comprador**: `PAGO_CONFIRMADO` o `PAGO_RECHAZADO` cuando se resuelve el cobro (con la pasarela caída también llega `PAGO_RECHAZADO`, pero el cuerpo dice que no pudimos comunicarnos con el medio de pago, no que se rechazó), `RESERVA_VENCIDA` cuando el barrido la cancela, `REEMBOLSO_REALIZADO` cuando la pasarela devuelve el dinero (si falla, recién cuando el reintento sale bien) y `ENTRADA_UTILIZADA` cuando el organizador la valida. Cancelar una compra sin pagar no avisa: no se movió dinero. Si el organizador gestiona el evento: `EVENTO_POSPUESTO` (fecha nueva y anterior; si está PENDIENTE, que complete el pago antes de que venza la reserva o, con el pago en proceso, que si se acredita la entrada vale para la nueva fecha; si no, que la entrada sigue valiendo y puede cancelarla con reembolso, o solo cancelarla si era gratis) y `EVENTO_CANCELADO` (si pagó, cuánto le devolvemos; con el pago en proceso, que se lo devolvemos si se llega a acreditar; si no, o si la entrada era gratis, que no se le cobró nada), los dos con el motivo al final si lo hay.
- **Al organizador** no se le avisa cada compra. `ENTRADAS_AGOTADAS` cuando un tipo de entrada se queda sin disponibles (las mismas que muestra la app, contando las reservas) y `EVENTO_AGOTADO` en lugar de ese si era el último. Una sola vez por tipo y por evento, aunque se libere y se vuelva a agotar (`NotificacionesRepository#existeAvisoDeAgotado`; el `EVENTO_AGOTADO` cuenta como el aviso del tipo que lo agotó). Llevan `compraId` null: la app abre el evento.
- **Chat**: `MENSAJE_NUEVO` a la otra parte, nunca a quien escribe. Mientras no se lee, los mensajes de una compra se juntan en **una** notificación por destinatario: `cantidad` los cuenta, el título pasa a "Sofía te escribió 3 mensajes por …" y el cuerpo es el último mensaje en una sola línea, recortado a 120 grafemas contando el "…" (`Intl.Segmenter`: no parte banderas, emojis con tono de piel ni tildes combinadas). Leída, el próximo mensaje abre otra. `POST /notificaciones/lectura { compraId }` marca solo los `MENSAJE_NUEVO` de esa compra (la app lo llama al abrir el chat): el resto de sus avisos no se ve en el chat y sigue sin leer.
- **Un aviso nunca rompe la operación**: los `avisar*` se llaman después de guardar y nunca lanzan (atrapan el error y lo loguean). Importa sobre todo en `#procesarCobro`, que corre en segundo plano. Los que leen y después escriben la misma notificación (el chat de una compra, los agotados de un evento) van de a uno por clave, para no duplicarse si llegan juntos.
- **Los textos los arma el backend** al avisar y se guardan hechos, con `utils/formato.js` (`formatearMonto`, `formatearFecha`) y la zona horaria `America/Argentina/Buenos_Aires` explícita: el servidor puede correr en UTC.
- Cada uno ve solo las suyas: marcar una ajena responde 404 igual que una que no existe.
- **Título y cuerpo salen siempre de las funciones puras de `src/domain/textosNotificacion.js`** (`textoPagoConfirmado`, `textoMensajeNuevo`…), que usan `NotificacionesService` y el seed. Nunca escribir un texto de notificación a mano en otro lado: un aviso nuevo suma su función ahí y su test en `test/unit/domain/textosNotificacion.test.js`.

## Convenciones de la API

- Prefijo `/api`. Recursos en plural y sin verbos. Las acciones sobre una compra o un evento son sub-recursos con sustantivo: `POST /compras/:id/pago`, `/cancelacion`, `/uso`; `POST /eventos/:id/postergacion`, `/cancelacion`.
- Los listados paginados reciben `?page=&pageSize=` y responden `{ data, page, pageSize, total }`.
- Fechas en ISO 8601 con zona horaria. Montos en pesos, como número.
- Todo endpoint nuevo se documenta en OpenAPI (request, respuestas y errores posibles) y aparece en `/api/docs`. `test/integracion/docs.test.js` valida el documento.

## Autenticación

- `src/auth/`: `AuthService` (registro, login, refresh con rotación y detección de reutilización, logout), `ServicioTokens` (JWT HS256 + refresh opaco del que se guarda solo el hash SHA-256), `Contrasenias` (bcrypt) y `AutenticadorJwt`.
- Las rutas protegidas usan `requiereAutenticacion(autenticador)` y leen `req.usuario`. En OpenAPI llevan `security: SEGURIDAD`.
- Nunca devolver `passwordHash`: los DTOs eligen campo por campo.
- **Google** (`POST /auth/google`): el `verificadorGoogle` se inyecta en `createApp` (en tests, uno falso). Entra a la cuenta vinculada, vincula una existente con el mismo email verificado o crea una sin contraseña (`tieneContrasenia: false`). Sin `GOOGLE_CLIENT_IDS` responde 503 `SSO_NO_CONFIGURADO`.
- **Cambiar la contraseña** (`PUT /auth/contrasenia`): si la actual no coincide responde **400** con el campo, nunca 401 (el cliente tomaría el 401 como sesión vencida y la cerraría). Revoca todas las sesiones y devuelve una nueva.
- En tests: `comoUsuario(id)` (`test/helpers/app.js`) arma el header `Authorization` con un token válido.

## Entornos

- `NODE_ENV` sin definir se trata como **producción** (falla cerrado). `npm run dev` carga `.env.example` (que define `development`) y después `.env`, si existe.
- En producción: `JWT_SECRET` y `CORS_ORIGINS` son obligatorios, no se montan Swagger ni `/api/dev`, y `createApp` carga solo las categorías (`crearCategorias()`), nunca los datos de ejemplo con contraseña pública.

## Tiempo

Nunca usar `new Date()` en reglas de negocio: recibir un `reloj` (`src/infra/Reloj.js`) y llamar a `reloj.ahora()`. En los tests, usar `RelojFijo`.

## Tests

- `npm test` corre todo; `npm run test:unit` y `npm run test:integration`, cada parte. Jest corre sobre ESM nativo (`--experimental-vm-modules`, sin Babel): `describe`, `it` y `expect` son globales, pero `jest` se importa de `@jest/globals`.
- `test/unit/`: dominio y services, sin HTTP. Los services se prueban con repos en memoria y `RelojFijo`.
- `test/integracion/`: endpoints con Supertest sobre `crearAppDePrueba()` (`test/helpers/app.js`). Cubrir el camino feliz **y cada error** (400, 401, 403, 404, 409).
- Estructura AAA (Arrange, Act, Assert), nombres en español que describan el comportamiento: `it("no permite cancelar una compra utilizada")`.
- Los tests no pueden depender de la hora real ni del orden en que se corren.
