# Backend: AI Ticket It API

Node + Express 5, JavaScript ESM, persistencia en memoria. Tests con Vitest + Supertest.

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

| Estado actual           | Pagar        | Cancelar                                                | Validar (usar)                    | Reseñar         |
| ----------------------- | ------------ | ------------------------------------------------------- | --------------------------------- | --------------- |
| PENDIENTE               | → CONFIRMADA | → CANCELADA (sin reembolso)                             | ✗                                 | ✗               |
| CONFIRMADA              | ✗            | → CANCELADA → REEMBOLSADA (automático, vía la pasarela) | → UTILIZADA (solo el organizador) | ✗               |
| UTILIZADA               | ✗            | ✗                                                       | ✗                                 | ✓, una sola vez |
| CANCELADA / REEMBOLSADA | ✗            | ✗                                                       | ✗                                 | ✗               |

- Toda transición registra un `CambioEstadoCompra` (estado, quién, fechaHora). Una transición inválida lanza `TransicionInvalidaError` (409).
- **Cancelar**: no se puede si la compra está UTILIZADA ni si el evento ya se realizó (`ahora >= fecha`). Libera el cupo.
- **Comprar**:
  - El evento tiene que ser futuro y el tipo de entrada tiene que ser de ese evento.
  - Cantidad entera entre 1 y 10, que además cumpla `hayCupoPara`.
  - Total = precio × cantidad, con el precio congelado al momento de comprar.
  - El organizador no puede comprar entradas de su propio evento.
  - El cupo se reserva al crear la compra (PENDIENTE).
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
- Todo endpoint nuevo se documenta en OpenAPI (request, respuestas y errores posibles) y aparece en `/api/docs`. `test/api/docs.test.js` valida el documento.

## Tiempo

Nunca usar `new Date()` en reglas de negocio: recibir un `reloj` (`src/infra/Reloj.js`) y llamar a `reloj.ahora()`. En los tests, usar `RelojFijo`.

## Tests

- `test/unit/`: dominio y services, sin HTTP. Los services se prueban con repos en memoria y `RelojFijo`.
- `test/api/`: endpoints con Supertest sobre `crearAppDePrueba()` (`test/helpers/app.js`). Cubrir el camino feliz **y cada error** (400, 401, 403, 404, 409).
- Estructura AAA (Arrange, Act, Assert), nombres en español que describan el comportamiento: `it("no permite cancelar una compra utilizada")`.
- Los tests no pueden depender de la hora real ni del orden en que se corren.
