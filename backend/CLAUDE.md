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

| Estado actual           | Pagar        | Cancelar                                                 | Validar (usar)                    | Reseñar         |
| ----------------------- | ------------ | -------------------------------------------------------- | --------------------------------- | --------------- |
| PENDIENTE               | → CONFIRMADA | → CANCELADA (sin reembolso, o sola al vencer la reserva) | ✗                                 | ✗               |
| CONFIRMADA              | ✗            | → CANCELADA → REEMBOLSADA (automático, vía la pasarela)  | → UTILIZADA (solo el organizador) | ✗               |
| UTILIZADA               | ✗            | ✗                                                        | ✗                                 | ✓, una sola vez |
| CANCELADA / REEMBOLSADA | ✗            | ✗                                                        | ✗                                 | ✗               |

- Toda transición registra un `CambioEstadoCompra` (estado, quién, fechaHora). Una transición inválida lanza `TransicionInvalidaError` (409).
- **Vencimiento de la reserva**: una compra PENDIENTE sin pagar vence a los `RESERVA_PLAZO_MINUTOS` (15 por defecto). `server.js` barre cada 60 s (`ComprasService#vencerReservas`, también `app.locals.vencerReservas()`): pasa a CANCELADA con `quien` null (el sistema), libera el cupo y la API informa `reservaVencida: true`. Pagar una reserva vencida responde 409 `RESERVA_VENCIDA`. Regla: una reserva no puede darse por vencida si la persona tocó Pagar y todavía no hay respuesta. Por eso, con un pago en proceso no vence, sin importar cuánto tarde la pasarela (si se aprueba queda CONFIRMADA aunque el plazo haya pasado). A partir de `reservaVenceEn` (la hora que muestra la app) `acciones.pagar` es false y `reservaVencida` es true aunque la compra siga PENDIENTE, pero `POST /pago` se sigue aceptando: es el pedido que venía en camino. El sistema recién cancela `Compra.MARGEN_PAGO_EN_CAMINO_MS` (60 s) después de esa hora, más que el timeout de la app. Si la tarjeta se rechaza quedan 5 minutos más para reintentar (`Compra.GRACIA_TRAS_RECHAZO_MS`). `reservaVenceEn` solo se informa si está PENDIENTE. Una compra sin `venceEn` no vence: las PENDIENTES del seed (c-03, c-04) no vencen, para que las demos y los E2E no dependan de la hora. No existe un estado `VENCIDA`: el diagrama de la cátedra no lo tiene.
- **Cancelar**: no se puede si la compra está UTILIZADA ni si el evento ya se realizó (`ahora >= fecha`). Libera el cupo.
- **Comprar**:
  - El evento tiene que ser futuro y el tipo de entrada tiene que ser de ese evento.
  - Cantidad entera entre 1 y 10, que además cumpla `hayCupoPara`.
  - Total = precio × cantidad, con el precio congelado al momento de comprar.
  - El organizador no puede comprar entradas de su propio evento.
  - El cupo se reserva al crear la compra (PENDIENTE).
- **Pagar** es asincrónico: `POST /compras/:id/pago` verifica la transición y la tarjeta (del comprador), registra una `OperacionPago` PENDIENTE y responde **202** con su `operacionId`. La pasarela cobra en segundo plano (`ComprasService#procesarCobro`) y el resultado se consulta en `GET /compras/:id/pago/:operacionId`. El estado "en proceso" vive en la operación: la compra sigue PENDIENTE hasta que se aprueba. Mientras hay una operación pendiente no se puede iniciar otro pago ni cancelar (409 `PAGO_EN_PROCESO`). La operación solo la ve el comprador.
- **Idempotencia**: `POST /compras`, `POST /pago` y `/cancelacion` aceptan el header `Idempotency-Key` (middleware `idempotente`). Con la misma clave, por usuario, se devuelve la respuesta guardada con `Idempotent-Replayed: true`, sin volver a operar. Solo se guardan las respuestas exitosas. Otros datos con la misma clave: 409 `CLAVE_IDEMPOTENCIA_REUTILIZADA`; la primera request todavía en curso: 409 `OPERACION_EN_CURSO`.
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
- **Chat**: solo el comprador y el organizador del evento, con la compra en cualquier estado. Mensajes de 1 a 1000 caracteres. Cualquier otro usuario recibe 403.
- **Reseña**: solo el comprador de una compra UTILIZADA, una por compra. Puntuación entera de 1 a 5 y detalle de hasta 500 caracteres.
- **Puntaje del organizador**: promedio de sus reseñas con 1 decimal, o `null` si no tiene. Al ordenar por puntaje, los `null` van últimos.

## Convenciones de la API

- Prefijo `/api`. Recursos en plural y sin verbos. Las acciones sobre una compra son sub-recursos con sustantivo: `POST /compras/:id/pago`, `/cancelacion`, `/uso`.
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
