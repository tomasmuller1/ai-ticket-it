# Notificaciones y gestión de eventos: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** sumar un centro de notificaciones in-app (campana en el medio de la barra con burbuja de no leídas) y que el organizador pueda posponer o cancelar un evento, con reembolso automático y aviso a cada comprador.

**Arquitectura:** las notificaciones se guardan como una entidad más (`Notificacion`). Las crea `NotificacionesService`, que los services llaman **después de persistir**; un aviso que falla se loguea y no rompe la operación. La app las consulta por polling, como el chat. `Evento` suma un `EstadoEvento`. Cancelarlo cancela y reembolsa cada compra vigente desde `ComprasService`, que tiene el candado por compra. Lo que no se puede resolver en el momento (pasarela caída, pago en vuelo) lo retoma el barrido de 60 s.

**Stack:** Express 5 ESM, Zod 4 y OpenAPI, Jest y Supertest. Expo SDK 58, Expo Router, TanStack Query, RNTL 14, MSW y Cypress. No suma dependencias. PlantUML (`.jar` descargado, fuera del repo) para el diagrama.

**Spec:** `docs/requerimientos.md`, sección 7.

## Restricciones globales

- Ramas apiladas, un PR por tarea, en este orden: `main` → `docs/plan-notificaciones-y-eventos` (T0) → `feat/notificaciones-api` (T1) → `feat/gestion-eventos-api` (T2) → `feat/notificaciones-app` (T3) → `feat/gestion-eventos-app` (T4) → `docs/diagrama-de-clases` (T5). T3 y T5 arrancan antes, en paralelo, y se rebasan sobre la rama anterior antes de abrir su PR. El usuario mergea.
- Commits en español con Conventional Commits, terminados en `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. El PR termina en `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- Primero el test que falla. AAA y nombres en español que describan el comportamiento.
- Backend: `reloj.ahora()`, nunca `new Date()` en reglas. `req.validado` después de `validar`. Errores como subclase de `AppError`. Todo endpoint nuevo va en Swagger y en `test/integracion/docs.test.js`.
- App: en RNTL 14, `render` y `fireEvent` llevan `await`. Sin mockear `api/client`. Sin colores ni tamaños sueltos: tokens de `theme.js`. Textos en rioplatense. Antes de usar una API de Expo o React Native, consultar `https://docs.expo.dev/versions/v58.0.0/`.
- E2E: selectores por lo que ve la persona, sin `cy.wait(ms)`. Levantar con `AUTH_INTENTOS_MAXIMOS=1000 npm run dev`, `npx expo start --web --port <puerto>` y `npm run e2e`.
- Cada agente usa su worktree y sus puertos (`PORT`, `CORS_ORIGINS`, `EXPO_PUBLIC_API_URL`) y **apaga todo lo que levanta** antes de terminar.
- **Cierre de cada tarea:** en `backend/` y en `mobile/`, `npm test`, `npm run lint` y `npm run format:check` en verde.

## Decisiones (aprobadas el 7/11/2026)

1. **Barra:** Explorar · Entradas · **Avisos** (campana) · Eventos · Perfil. Favoritos sale de la barra: se abre desde un corazón en el encabezado de Explorar y desde una fila en Perfil. La píldora dice "Avisos" porque "Notificaciones" no entra en 360 pt; la pantalla se titula "Notificaciones".
2. **Posponer** mantiene las entradas: se avisa a cada compra vigente y quien no pueda ir cancela con reembolso (CU7). **Cancelar** cancela y reembolsa todas las compras vigentes, incluso las UTILIZADAS: el evento no se va a hacer. CU8 sigue igual para la cancelación del comprador.
3. **Al organizador no se le avisa cada compra.** Recibe un aviso cuando se agota un tipo de entrada, o "evento agotado" cuando se agota el último, **una sola vez** por tipo y por evento. "Agotado" es lo mismo que ya muestra la app: sin disponibles, contando las reservas.
4. **Chat:** mientras no se lean, los mensajes de una compra se juntan en **una** notificación por destinatario, que cuenta los mensajes y muestra el último. Abrir el chat marca como leídas las de esa compra.
5. Se notifica también lo que la persona disparó cuando el resultado llega después o mueve dinero: pago aprobado o rechazado, reembolso.
6. El texto de cada notificación lo arma el backend, con la zona horaria `America/Argentina/Buenos_Aires` explícita: el servidor puede correr en UTC.

## Foco de revisión

1. Un pago en vuelo cuando se cancela el evento: la compra termina REEMBOLSADA y el comprador no recibe "Pago aprobado" (T2, test en `eventos-gestion.test.js`).
2. La pasarela caída al cancelar el evento: el evento queda CANCELADO, las compras pagadas quedan CANCELADAS a la espera del reembolso, y el barrido las reembolsa cuando la pasarela vuelve (T2).
3. Varios mensajes seguidos sin leer: una sola notificación con el conteo, que se reabre como nueva si llega otro después de leerla (T1). Abrir el chat la marca leída (T3).
4. El último cupo de un tipo se reserva, vence y se vuelve a reservar: el organizador recibe un solo aviso (T1).
5. Reintentar "Posponer" o "Cancelar evento" con la misma `Idempotency-Key` después de perder la respuesta: misma respuesta, sin avisos duplicados (T2).

---

## Tarea 0: Registrar los requerimientos y el plan

**Archivos:** `docs/requerimientos.md` (fuente **U** y sección 7 nueva), este plan.

- [ ] **Paso 1:** crear `docs/plan-notificaciones-y-eventos` desde `main`, commitear (`docs: registrar los requerimientos de notificaciones y gestión de eventos`) y abrir el PR contra `main`.

---

## Tarea 1: Notificaciones en la API

**Archivos:**

- Crear: `backend/src/domain/Notificacion.js`, `backend/src/services/NotificacionesService.js`, `backend/src/controllers/NotificacionesController.js`, `backend/src/routes/notificacionesRoutes.js`, `backend/src/schemas/notificaciones.js`, `backend/src/dtos/notificacionDTO.js`, `backend/src/utils/formato.js`
- Modificar: `backend/src/repositories/index.js`, `backend/src/services/ComprasService.js`, `backend/src/domain/Evento.js` (`agotado()`), `backend/src/dtos/eventoDTO.js` (usar `evento.agotado()`), `backend/src/schemas/comunes.js` (mover `booleanoQuery` desde `eventos.js`), `backend/src/app.js`, `backend/src/data/seed.js`, `backend/CLAUDE.md` (reglas de notificaciones)
- Tests: `backend/test/unit/domain/Notificacion.test.js`, `backend/test/unit/NotificacionesService.test.js`, `backend/test/unit/formato.test.js`, `backend/test/integracion/notificaciones.test.js`, `backend/test/integracion/docs.test.js`, `backend/test/unit/ComprasService.vencimiento.test.js` (pasarle el service)

**Interfaces:**

- Produce, dominio:
  - `TipoNotificacion` (enum congelado en `Notificacion.js`): `PAGO_CONFIRMADO`, `PAGO_RECHAZADO`, `RESERVA_VENCIDA`, `REEMBOLSO_REALIZADO`, `ENTRADA_UTILIZADA`, `MENSAJE_NUEVO`, `ENTRADAS_AGOTADAS`, `EVENTO_AGOTADO`, `EVENTO_POSPUESTO`, `EVENTO_CANCELADO`.
  - `new Notificacion({ id, destinatario, tipo, titulo, cuerpo, evento, compra = null, tipoEntrada = null, fechaHora, leida = false, cantidad = 1 })`, `esDe(usuario): boolean`, `marcarLeida(): void`, `sumarMensaje({ titulo, cuerpo }, reloj): void` (suma 1 a `cantidad` y actualiza los textos y `fechaHora`).
  - `Evento#agotado(): boolean`.
- Produce, `NotificacionesRepository`: `buscarPorDestinatario(usuarioId)`, `buscarMensajeSinLeer(destinatarioId, compraId)` (devuelve una o `null`), `existeAvisoDeAgotado(eventoId, tipoEntradaId = null)`.
- Produce, `NotificacionesService({ notificaciones }, reloj, logger)`:
  - Consultas: `listar(usuario, { soloNoLeidas, page, pageSize })` → paginado, la más reciente primero; `contarNoLeidas(usuario)` → `number`; `marcarLeida(id, usuario)` → `Notificacion` (404 `"No encontramos esa notificación"` si no existe **o es de otro**); `marcarLeidas(usuario, { compraId } = {})` → cantidad marcada.
  - Avisos, que **nunca lanzan** (try/catch y `logger.error`): `avisarPagoConfirmado(compra)`, `avisarPagoRechazado(compra)`, `avisarReservaVencida(compra)`, `avisarReembolso(compra)`, `avisarEntradaUtilizada(compra)`, `avisarMensajeNuevo(compra, mensaje)`, `avisarAgotado(evento, tipoEntrada)`, `avisarEventoPospuesto(compra, { fechaAnterior, motivo })`, `avisarEventoCancelado(compra, { motivo })`. T2 implementa los dos últimos sobre el mismo patrón.
- Produce, `ComprasService`: 7.º parámetro `notificaciones`.
- Produce, API (contrato que usa T3):
  - `GET /api/notificaciones?soloNoLeidas=true|false&page&pageSize` → `{ data: Notificacion[], page, pageSize, total }`.
  - `GET /api/notificaciones/resumen` → `{ noLeidas: number }`.
  - `POST /api/notificaciones/lectura`, body opcional `{ compraId?: string }` → `{ marcadas: number }`.
  - `POST /api/notificaciones/{id}/lectura` → `Notificacion`. 404 si no existe o es de otro.
  - `Notificacion` = `{ id, tipo, titulo, cuerpo, fechaHora (ISO), leida, evento: { id, nombre }, compraId: string | null }`.
  - Todas exigen sesión (401).
- Produce, `utils/formato.js`: `formatearMonto(valor)` (`"$ 12.000"`, es-AR, ARS, sin decimales) y `formatearFecha(fecha)` (`"Sáb 20 dic, 21:00"`, como `formato.fecha` de la app), las dos con `timeZone: "America/Argentina/Buenos_Aires"`.

**Textos** (`{e}` es el nombre del evento, `{t}` el del tipo de entrada, `{n}` la cantidad, `{nombre}` el nombre de pila de quien escribe):

| Tipo                  | Para          | Título                                                                                                  | Cuerpo                                                                             |
| --------------------- | ------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `PAGO_CONFIRMADO`     | comprador     | `Pago aprobado`                                                                                         | `Ya tenés {n} entrada(s) {t} para {e}.`                                            |
| `PAGO_RECHAZADO`      | comprador     | `No pudimos cobrar tu compra`                                                                           | `Se rechazó el pago de tus entradas para {e}. Podés reintentarlo desde la compra.` |
| `RESERVA_VENCIDA`     | comprador     | `Venció tu reserva`                                                                                     | `Pasó el plazo para pagar tus entradas de {e} y las liberamos.`                    |
| `REEMBOLSO_REALIZADO` | comprador     | `Te devolvimos el dinero`                                                                               | `Reintegramos {monto} de tu compra para {e}.`                                      |
| `ENTRADA_UTILIZADA`   | comprador     | `¡Que lo disfrutes!`                                                                                    | `Validaron tu entrada para {e}. Después contanos qué te pareció.`                  |
| `MENSAJE_NUEVO`       | la otra parte | `{nombre} te escribió por {e}` / con `cantidad` > 1: `{nombre} te escribió {cantidad} mensajes por {e}` | El último mensaje, recortado a 120 caracteres con `…`                              |
| `ENTRADAS_AGOTADAS`   | organizador   | `Se agotaron las entradas {t}`                                                                          | `Ya no quedan entradas {t} para {e}.`                                              |
| `EVENTO_AGOTADO`      | organizador   | `{e} está agotado`                                                                                      | `No quedan entradas de ningún tipo.`                                               |

"entrada(s)" va en singular o plural según `{n}`.

- [ ] **Paso 1: tests del dominio que fallan.** En `Notificacion.test.js`: `"marcarLeida la deja leída"`, `"sumarMensaje suma uno, reemplaza los textos y actualiza la fecha"` (con `unReloj()` avanzado 1 minuto: `cantidad` 2, `fechaHora` igual al reloj), `"esDe compara por usuario"`. En `Evento.test.js`: `"agotado es verdadero solo si no quedan disponibles de ningún tipo"`.
- [ ] **Paso 2:** `npm run test:unit` → fallan por módulo inexistente o método indefinido.
- [ ] **Paso 3:** implementar `Notificacion`, `TipoNotificacion` y `Evento#agotado()`. El DTO pasa a usar `evento.agotado()`. Correr: pasan.
- [ ] **Paso 4: tests de `formato.js`.** `formatearFecha(new Date("2026-12-20T00:00:00Z"))` → `"Sáb 19 dic, 21:00"`, y `formatearMonto(12000)` → `"$ 12.000"`. Ojo: Intl separa con un espacio duro (` `); normalizar en la comparación o en la función, igual que la app. El test tiene que pasar aunque `TZ` sea UTC: correrlo también con `TZ=UTC npx jest test/unit/formato.test.js`.
- [ ] **Paso 5: tests del service que fallan** (`NotificacionesService.test.js`, repos reales y `unReloj()`, con las fábricas de `test/helpers/fabricas.js`):
  - `"avisarMensajeNuevo le avisa a la otra parte, no a quien escribe"`: escribe el comprador, la recibe el organizador, y al revés.
  - `"los mensajes sin leer de una compra se juntan en una notificación"`: 3 mensajes → 1 notificación, `cantidad` 3, título `"Sofía te escribió 3 mensajes por {e}"`, cuerpo igual al último.
  - `"después de leerla, un mensaje nuevo abre otra notificación"`.
  - `"avisarAgotado avisa una sola vez por tipo de entrada"`: dos llamadas con el mismo tipo → 1.
  - `"si se agota el último tipo, avisa que el evento está agotado y no repite"`: `EVENTO_AGOTADO` en vez de `ENTRADAS_AGOTADAS`.
  - `"un aviso que falla no lanza y se loguea"`: repo con `guardar` que rechaza; `await expect(service.avisarPagoConfirmado(compra)).resolves.toBeUndefined()` y `logger.error` llamado.
  - `"marcarLeida de una notificación ajena responde que no existe"`: `NoEncontradoError`.
  - `"marcarLeidas con compraId solo marca las de esa compra"`.
- [ ] **Paso 6:** implementar el repositorio (sumarlo en `crearRepositorios()` **y** `notificaciones: []` o los del seed en `crearDatosDeEjemplo`) y `NotificacionesService`. Correr: pasan.
- [ ] **Paso 7: tests de integración que fallan** (`notificaciones.test.js`, con `crearAppDePrueba`, `comoUsuario` y `pasarelaEnEspera`/`hastaQue` de `test/helpers/pagos.js`):
  - `"al aprobarse el pago, el comprador recibe 'Pago aprobado'"` y `"si se rechaza, recibe 'No pudimos cobrar tu compra'"`.
  - `"al vencer la reserva, el comprador recibe 'Venció tu reserva'"` (avanzar `reloj.fecha` y `app.locals.vencerReservas()`).
  - `"al cancelar una compra pagada, el comprador recibe el reembolso"`.
  - `"al validar la entrada, el comprador recibe '¡Que lo disfrutes!'"`.
  - `"un mensaje del comprador le llega al organizador y abre el chat de esa compra"`: `compraId` es el de la compra.
  - `"al reservar las últimas entradas VIP, el organizador recibe un aviso"`: VIP de `e-rock-nacional` (cupo 4, 3 vendidas).
  - `"comprar entradas no le avisa al organizador si quedan disponibles"`.
  - `"GET /resumen cuenta las no leídas del usuario"`, `"POST /lectura las marca todas y devuelve cuántas"`, `"POST /lectura con compraId marca solo esa compra"`, `"POST /{id}/lectura de otra persona responde 404"`, `"sin sesión responde 401"`.
  - `"soloNoLeidas=true filtra y la lista viene ordenada de la más reciente a la más vieja"`.
  - En `docs.test.js`: `"documenta las notificaciones"`: existen los 4 paths.
- [ ] **Paso 8:** conectar los avisos en `ComprasService`, siempre después de guardar: `comprar` (si `compra.tipoEntrada.disponibles() === 0`, `avisarAgotado`), `vencerReservas`, `#procesarCobro` (aprobado o rechazado), `cancelar` (después de `reembolsar`), `validarEntrada` y `enviarMensaje`. Rutas con `validar` y su doc OpenAPI, controller, DTO y montaje en `app.js` (`/api/notificaciones`, más `documentarNotificaciones(registro)`). `/resumen` y `/lectura` se declaran antes que `/:id`. Correr: pasan.
- [ ] **Paso 9: seed.** Ids fijos `n-01`…: Sofía con al menos 2 sin leer (un `MENSAJE_NUEVO` de Lucía en una compra suya que tenga chat y un `PAGO_CONFIRMADO`) y 1 leída. Lucía con 1 sin leer (un `MENSAJE_NUEVO` de un comprador). Todo coherente con las compras y los chats del seed. Test: `"el seed trae notificaciones de ejemplo y el reset las restaura"` (`POST /api/dev/reset`).
- [ ] **Paso 10:** reglas en `backend/CLAUDE.md`: quién recibe qué, que un aviso nunca rompe la operación, la agrupación del chat y la regla de agotado. Probar en Swagger: login como Sofía, `GET /api/notificaciones/resumen`, marcar una leída. Cierre: tests, lint y formato.
- [ ] **Paso 11:** commit (`feat(notificaciones): avisos in-app de pagos, reservas, reembolsos, chat y agotados`) y PR contra `docs/plan-notificaciones-y-eventos`.

---

## Tarea 2: Posponer y cancelar un evento en la API

**Archivos:**

- Modificar: `backend/src/domain/Evento.js`, `backend/src/domain/Compra.js`, `backend/src/domain/estados/EstadoCompra.js`, `backend/src/domain/estados/Utilizada.js`, `backend/src/errors/index.js`, `backend/src/services/EventosService.js`, `backend/src/services/ComprasService.js`, `backend/src/services/NotificacionesService.js`, `backend/src/repositories/index.js`, `backend/src/controllers/EventosController.js`, `backend/src/routes/eventosRoutes.js`, `backend/src/schemas/eventos.js`, `backend/src/schemas/compras.js`, `backend/src/dtos/eventoDTO.js`, `backend/src/dtos/compraDTO.js`, `backend/src/app.js`, `backend/src/server.js`, `backend/CLAUDE.md` (tabla de transiciones y reglas del evento)
- Tests: `backend/test/unit/domain/Evento.test.js`, `backend/test/unit/domain/Compra.test.js`, `backend/test/unit/NotificacionesService.test.js`, nuevo `backend/test/integracion/eventos-gestion.test.js`, `backend/test/integracion/docs.test.js`

**Interfaces:**

- Consume (T1): `NotificacionesService` y su patrón de avisos.
- Produce, dominio:
  - `EstadoEvento` (enum congelado, en `Evento.js`): `PROGRAMADO`, `POSPUESTO`, `CANCELADO`. `Evento` recibe `estado = EstadoEvento.PROGRAMADO`.
  - `Evento#estaCancelado(): boolean`.
  - `Evento#posponer(nuevaFecha: Date, reloj): Date` (devuelve la fecha anterior). En este orden: cancelado → `EventoCanceladoError`; ya realizado → `EventoFinalizadoError`; `nuevaFecha <= fecha` → `ValidacionError("La nueva fecha tiene que ser posterior a la actual")`. Queda `POSPUESTO`.
  - `Evento#cancelar(reloj): void`. Cancelado → `EventoCanceladoError`; realizado → `EventoFinalizadoError`. Queda `CANCELADO`.
  - `EventoCanceladoError extends ReglaNegocioError`, código `EVENTO_CANCELADO`, mensaje por defecto `"El evento fue cancelado"`.
  - `Compra#vigente` (getter): PENDIENTE, CONFIRMADA o UTILIZADA.
  - `Compra#cancelarPorEvento(quien, reloj)`: con pago en proceso → `PagoEnProcesoError`; si no, `this.#estado.cancelarPorEvento(...)`.
  - `Compra#pendienteDeCancelacionPorEvento(): boolean` = evento cancelado y (`vigente` o `requiereReembolso()`).
  - State: `Estado#cancelarPorEvento(compra, quien, reloj)` delega en `this.cancelar(...)`, así PENDIENTE y CONFIRMADA se comportan igual y CANCELADA y REEMBOLSADA rechazan. `Utilizada` lo redefine: libera el cupo y pasa a `Cancelada`.
  - `Compra.crear`, `#exigirEventoPendiente` y `marcarUtilizada` rechazan con `EventoCanceladoError` si el evento está cancelado. En `accionesPermitidas`, el evento cancelado apaga `pagar`, `cancelar` y `validar`; `chatear` sigue.
- Produce, `ComprasService`:
  - `resolverCancelacionDeEvento(eventoId, quien)` → `{ resueltas, pendientes }`.
  - `resolverEventosCancelados()` → mismo resultado. Es el barrido; usa `ComprasRepository#buscarPendientesPorEventoCancelado()`.
  - Las dos comparten un `#resolverPorCancelacion(compras, quien)` privado. Por compra, con `#sinOperacionesSimultaneas`: si está vigente, `cancelarPorEvento` y guardar; si `requiereReembolso()`, `pasarela.reembolsar`, `compra.reembolsar`, guardar y `avisarReembolso`. Cada compra va en su try/catch, como `vencerReservas`. `OPERACION_EN_CURSO` y `PAGO_EN_PROCESO` se saltean sin loguear y cuentan como pendientes.
  - `#procesarCobro`: si al terminar el cobro (aprobado o rechazado) el evento ya está cancelado, no avisa el resultado del pago y llama a `#resolverPorCancelacion([compra], null)`.
- Produce, `EventosService({ eventos, categorias, compras }, reseniasService, reloj, comprasService, notificaciones)`:
  - `posponer(id, usuario, { fecha, motivo })` → `Evento`. Solo el organizador (`ProhibidoError("Solo el organizador puede gestionar este evento")`). Avisa `avisarEventoPospuesto` a cada compra **vigente**.
  - `cancelar(id, usuario, { motivo })` → `Evento`. Toma las vigentes **antes** de cancelar, cancela y guarda el evento, avisa `avisarEventoCancelado` a cada una y después llama a `comprasService.resolverCancelacionDeEvento(id, usuario)`.
  - `buscar` excluye siempre los cancelados. Favoritos, "Mis eventos" y el detalle los siguen mostrando.
- Produce, `app.locals.resolverEventosCancelados`; `server.js` lo corre en el mismo intervalo que `vencerReservas`.
- Produce, API (contrato que usa T4):
  - `POST /api/eventos/{id}/postergacion`, body `{ fecha: ISO con offset, motivo?: string (trim, máx. 300) }`, header opcional `Idempotency-Key` → 200 `EventoDeOrganizador`.
  - `POST /api/eventos/{id}/cancelacion`, body opcional `{ motivo?: string }`, header opcional `Idempotency-Key` → 200 `EventoDeOrganizador`.
  - Errores de los dos: 400, 401, 403, 404 y 409 (`EVENTO_CANCELADO`, `EVENTO_FINALIZADO`, `CLAVE_IDEMPOTENCIA_REUTILIZADA`).
  - `eventosRoutes(controller, autenticado, idempotencia)`: `app.js` le pasa `idempotente(repositorios.clavesIdempotencia)`.
  - `estado: "PROGRAMADO" | "POSPUESTO" | "CANCELADO"` se suma a `eventoResumenDTO` (y por lo tanto al detalle), a `eventoDeOrganizadorDTO`, al `evento` de `compraDTO` y al `evento` de `comprasDeEventoDTO`, que además suma `finalizado`. Los schemas Zod se actualizan igual.

**Textos** (los avisos de T1 más estos dos):

| Tipo               | Título           | Cuerpo                                                                                                                                                                                                                                               |
| ------------------ | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EVENTO_POSPUESTO` | `{e} se pospuso` | `La nueva fecha es {fechaNueva} (era {fechaAnterior}).` + compra PENDIENTE: ` Todavía podés pagar tu reserva.` / si no: ` Tu entrada sigue valiendo; si no podés ir, cancelá la compra y te devolvemos el dinero.` + con motivo: ` Motivo: {motivo}` |
| `EVENTO_CANCELADO` | `Se canceló {e}` | Pagada o con pago en proceso: `Te devolvemos {monto} a tu tarjeta.` / si no: `Tu reserva quedó sin efecto y no se te cobró nada.` + con motivo: ` Motivo: {motivo}`                                                                                  |

- [ ] **Paso 1: tests del dominio que fallan.**
  - `Evento.test.js`: `"posponer cambia la fecha, queda POSPUESTO y devuelve la anterior"`, `"no se puede posponer a una fecha anterior o igual"`, `"no se puede posponer ni cancelar un evento que ya se realizó"` (`EVENTO_FINALIZADO`), `"no se puede posponer ni cancelar un evento cancelado"` (`EVENTO_CANCELADO`).
  - `Compra.test.js`: `"cancelarPorEvento cancela una CONFIRMADA, libera el cupo y requiere reembolso"`, `"cancelarPorEvento cancela una UTILIZADA aunque CU8 no lo permita al comprador"`, `"cancelarPorEvento rechaza una compra ya CANCELADA"`, `"con un pago en proceso, cancelarPorEvento lanza PAGO_EN_PROCESO"`, `"no se puede crear, pagar ni validar una compra de un evento cancelado"`, `"en un evento cancelado las acciones solo dejan chatear"`.
- [ ] **Paso 2:** correr → fallan. **Paso 3:** implementar el dominio y el error. Correr → pasan. Correr todo `npm run test:unit`: las transiciones de CU7 y CU8 no cambian.
- [ ] **Paso 4: tests de integración que fallan** (`eventos-gestion.test.js`):
  - `"el organizador pospone: cambia la fecha, avisa a cada compra vigente y las entradas siguen CONFIRMADAS"`. Las CANCELADAS no reciben aviso.
  - `"posponer a una fecha anterior responde 400"`, `"otro usuario no puede posponer ni cancelar: 403"`, `"sin sesión: 401"`, `"evento inexistente: 404"`.
  - `"el organizador cancela: las pagadas quedan REEMBOLSADAS, las PENDIENTES CANCELADAS y se libera el cupo"`. Además `pasarelaPagos.operaciones` registra un reembolso por compra pagada.
  - `"cancelar avisa 'Se canceló' a cada comprador, con el monto si pagó"` y `"y les manda 'Te devolvimos el dinero' a quienes pagaron"`.
  - `"un evento cancelado no aparece en la búsqueda pero sí en su detalle, con estado CANCELADO"`.
  - `"no se puede comprar un evento cancelado: 409 EVENTO_CANCELADO"`.
  - `"con la pasarela caída el evento queda cancelado y el barrido reembolsa cuando vuelve"`: pasarela literal que falla y después responde; `app.locals.resolverEventosCancelados()`.
  - `"un pago en vuelo al cancelar termina REEMBOLSADO y sin aviso de pago aprobado"`: con `pasarelaEnEspera()`, cancelar el evento y liberar el cobro; `hastaQue` la compra esté REEMBOLSADA.
  - `"repetir con la misma Idempotency-Key devuelve lo mismo y no duplica avisos"`, para las dos acciones.
  - En `docs.test.js`: `"documenta posponer y cancelar un evento con clave de idempotencia"`.
- [ ] **Paso 5:** implementar `ComprasService`, `EventosService` (reordenar la composición en `app.js`: notificaciones, compras y después eventos), los avisos de `NotificacionesService`, el repositorio, rutas, schemas, DTOs, controller y `server.js`. Correr → pasan. Correr la suite completa.
- [ ] **Paso 6:** actualizar `backend/CLAUDE.md`: tabla de transiciones con "cancelar por evento", reglas de posponer y cancelar y el barrido. Probar en Swagger: como Lucía, cancelar `e-rock-nacional` y ver las compras con `GET /api/eventos/e-rock-nacional/compras`. Cierre: tests, lint y formato.
- [ ] **Paso 7:** commit (`feat(eventos): posponer y cancelar un evento con reembolso y aviso a los compradores`) y PR contra `feat/notificaciones-api`.

---

## Tarea 3: Notificaciones en la app

**Archivos:**

- Crear: `mobile/src/app/(tabs)/notificaciones.jsx`, `mobile/src/hooks/notificaciones.js`, `mobile/src/utils/notificaciones.js`, `mobile/src/components/NotificacionItem.jsx`, `mobile/test/integracion/notificaciones.test.jsx`, `mobile/test/unit/notificaciones.test.js`, `mobile/test/unit/barraNavegacion.test.jsx`, `mobile/cypress/e2e/notificaciones.cy.js`
- Mover: `mobile/src/app/(tabs)/favoritos.jsx` → `mobile/src/app/favoritos.jsx` (con `git mv`)
- Modificar: `mobile/src/app/(tabs)/_layout.jsx`, `mobile/src/components/BarraNavegacion.jsx`, `mobile/src/app/_layout.jsx` (`Stack.Screen` de `favoritos`), `mobile/src/app/(tabs)/index.jsx` (corazón en el encabezado), `mobile/src/app/(tabs)/perfil.jsx` (fila "Favoritos"), `mobile/src/app/compra/[id]/chat.jsx`, `mobile/src/api/endpoints.js`, `mobile/src/hooks/compras.js` y `mobile/src/hooks/pago.js` (invalidar `["notificaciones"]`), `mobile/src/utils/formato.js` (`haceCuanto`), `mobile/test/helpers/servidor.js` (handler por defecto de `/notificaciones/resumen`), `README.md` (fila "Notificaciones in-app" en el checklist)

**Interfaces:**

- Consume: el contrato de la API de T1. Se desarrolla contra MSW; el E2E corre sobre el backend de T1.
- Produce:
  - `api.notificaciones`:
    - `listar(filtros, opciones)` → `GET /notificaciones`.
    - `resumen(opciones)` → `GET /notificaciones/resumen`.
    - `marcarLeida(id)` → `POST /notificaciones/:id/lectura`.
    - `marcarLeidas(filtro = {})` → `POST /notificaciones/lectura`.
  - Hooks:
    - `useResumenNotificaciones()`: key `["notificaciones","resumen"]`, `refetchInterval: INTERVALO_RESUMEN_MS` (15 000), devuelve la query con `data.noLeidas`.
    - `useNotificaciones()`: `useInfiniteQuery`, key `["notificaciones","lista"]`, `pageSize` 20.
    - `useMarcarLeida()` y `useMarcarTodasLeidas()`: optimistas sobre la lista y el resumen, con rollback si fallan e invalidación de `["notificaciones"]` al terminar.
    - `useMarcarLeidasDeCompra(compraId)`.
  - `rutaDeNotificacion(n)`:
    - `MENSAJE_NUEVO` → `/compra/{compraId}/chat`;
    - `ENTRADAS_AGOTADAS` y `EVENTO_AGOTADO` → `/organizador/evento/{evento.id}`;
    - el resto, con `compraId` → `/compra/{compraId}`;
    - sin `compraId` → `/evento/{evento.id}`.
  - `iconoDeNotificacion(tipo)` (Ionicons):
    - `PAGO_CONFIRMADO` `checkmark-circle`, `PAGO_RECHAZADO` `close-circle`, `RESERVA_VENCIDA` `time`, `REEMBOLSO_REALIZADO` `cash`;
    - `ENTRADA_UTILIZADA` `ticket`, `MENSAJE_NUEVO` `chatbubble`, `ENTRADAS_AGOTADAS` y `EVENTO_AGOTADO` `flame`;
    - `EVENTO_POSPUESTO` `calendar`, `EVENTO_CANCELADO` `ban`, y cualquier otro `notifications`.
  - `textoBurbuja(n)`: `"9+"` si es mayor que 9.
  - `formato.haceCuanto(iso, ahora = new Date())`: `"Recién"` (menos de 1 min), `"Hace 5 min"`, `"Hace 3 h"`, `"Ayer"` y, desde ahí, `formato.fechaCorta`.
  - `BarraNavegacion` dibuja `options.tabBarBadge` sobre el ícono (activo o no) y usa `options.tabBarAccessibilityLabel ?? options.title`.

- [ ] **Paso 1: tests unitarios que fallan** (`test/unit/notificaciones.test.js`): `rutaDeNotificacion` para cada caso de arriba, `textoBurbuja(3)` → `"3"` y `textoBurbuja(12)` → `"9+"`, y `formato.haceCuanto` en sus cinco rangos.
- [ ] **Paso 2: test de la barra que falla** (`barraNavegacion.test.jsx`): con `state`, `descriptors`, `emitter` y `navigateToTab` falsos, `"muestra la burbuja con el texto de tabBarBadge"` y `"la pestaña anuncia la etiqueta accesible con las no leídas"` (`getByRole("tab", { name: "Notificaciones, 3 sin leer" })`). Sin burbuja si `tabBarBadge` es `undefined`.
- [ ] **Paso 3:** implementar los utils, `haceCuanto` y la burbuja. Fondo `colores.marca`, texto `colores.sobreMarca` y un borde de `colores.barra` para separarla del ícono. Usar tokens; si hace falta uno nuevo, se suma a `theme.js`. Correr → pasan.
- [ ] **Paso 4: tests de integración que fallan** (`notificaciones.test.jsx`, `renderPantalla` y MSW):
  - `"lista las notificaciones con las no leídas destacadas"` (anunciadas como "Sin leer").
  - `"tocar una notificación de mensaje la marca leída y abre el chat de esa compra"`: el handler recibe `POST /notificaciones/n-1/lectura` y la pantalla del chat queda visible.
  - `"'Marcar todas como leídas' las marca y el botón desaparece"`.
  - `"sin notificaciones muestra el estado vacío"`: "No tenés notificaciones".
  - `"si falla la carga, muestra el error y permite reintentar"`.
  - `"abrir el chat marca leídas las notificaciones de esa compra"`: el handler recibe `{ compraId }`.
- [ ] **Paso 5:** implementar la pantalla y los hooks.
  - Pantalla: `Pantalla` con título "Notificaciones" y subtítulo `"Tenés {n} sin leer"` o `"Estás al día"`.
  - Acción "Marcar todas como leídas" (`Boton` fantasma), solo si hay alguna sin leer.
  - `FlatList` de `NotificacionItem`: ícono, título en `cuerpoFuerte` si no está leída, cuerpo en 2 líneas, `haceCuanto` y un punto `marca` con `accessibilityLabel` "Sin leer".
  - Estados: `Skeleton` mientras carga y `EstadoVacio` con el texto "Te avisamos acá cuando se confirme un pago, te escriban o cambie un evento.". Además, `EstadoError` con reintento, pull-to-refresh y página siguiente al llegar al final.
  - El chat llama a `useMarcarLeidasDeCompra(id)` al montar y cada vez que llega un mensaje de la otra persona.
  - Invalidar `["notificaciones"]` en `useInvalidarCompras` y cuando el pago se resuelve.
  - Correr → pasan.
- [ ] **Paso 6: barra y Favoritos.**
  - `PESTANIAS` queda: `index` "Explorar" `compass`, `compras` "Entradas" `ticket`, `notificaciones` "Avisos" `notifications`, `organizador` "Eventos" `calendar` y `perfil` "Perfil" `person`.
  - El layout lee `useResumenNotificaciones()` y le pasa a `notificaciones` `tabBarBadge` (`textoBurbuja` o `undefined`) y `tabBarAccessibilityLabel` (`"Notificaciones"` o `"Notificaciones, {n} sin leer"`).
  - `favoritos.jsx` pasa al Stack con título "Favoritos", armado como `perfil/tarjetas/index`. Se llega desde un corazón en el encabezado de Explorar (`accessibilityLabel` "Tus favoritos", con la prop `accion` de `EncabezadoPantalla`) y desde una `FilaPanel` "Favoritos" en Perfil.
  - Ajustar los tests y los E2E que entraban por la pestaña de Favoritos.
  - Handler por defecto `{ noLeidas: 0 }` en `servidor.js`.
- [ ] **Paso 7: E2E** (`notificaciones.cy.js`, con el backend de T1):
  - Con `cy.pedirComo`, Sofía escribe en el chat de una compra suya de un evento de Lucía.
  - Lucía inicia sesión y la burbuja muestra las no leídas que da `GET /notificaciones/resumen` (consultado antes con `cy.pedirComo`).
  - Toca la notificación y el chat muestra el mensaje.
  - Vuelve, toca "Marcar todas como leídas" y la burbuja desaparece.
  - Correr la suite E2E completa.
- [ ] **Paso 8:** verificar en Expo web a 360 px de ancho, en tema claro y oscuro: la píldora "Avisos" no se corta, la burbuja se lee y Favoritos se abre desde los dos lugares. Sacar una captura. Fila en el checklist del README. Cierre: tests, lint y formato.
- [ ] **Paso 9:** rebasar sobre `feat/gestion-eventos-api` cuando T2 esté aprobada (son archivos distintos), commit (`feat(app): centro de notificaciones con burbuja de no leídas en la barra`) y PR contra `feat/gestion-eventos-api`.

---

## Tarea 4: Posponer y cancelar un evento en la app

**Archivos:**

- Mover: `mobile/src/app/organizador/evento/[id].jsx` → `mobile/src/app/organizador/evento/[id]/index.jsx` (`git mv` y corregir los imports relativos)
- Crear: `mobile/src/app/organizador/evento/[id]/posponer.jsx`, `mobile/src/app/organizador/evento/[id]/cancelar.jsx`, `mobile/test/integracion/gestionEvento.test.jsx`, `mobile/cypress/e2e/gestion-evento.cy.js`
- Modificar: `mobile/src/app/_layout.jsx`, `mobile/src/api/endpoints.js`, `mobile/src/hooks/organizador.js`, `mobile/src/components/EventoCard.jsx`, `mobile/src/components/CompraCard.jsx`, `mobile/src/app/evento/[id]/index.jsx`, `mobile/src/app/compra/[id]/index.jsx`, `mobile/src/app/(tabs)/organizador.jsx`, `mobile/src/utils/estados.js` o `theme.js` (etiqueta y color de cada `EstadoEvento`), `README.md` (fila del checklist y "Pendiente")

**Interfaces:**

- Consume: el contrato de la API de T2 (`estado` en los DTOs de evento y `finalizado` en `comprasDeEventoDTO.evento`).
- Produce:
  - `api.eventos.posponer(id, { fecha, motivo }, clave)` y `api.eventos.cancelar(id, { motivo }, clave)`, con `claveIdempotencia`.
  - `usePosponerEvento(id)` y `useCancelarEvento(id)`. La clave sale de `useRef` + `Crypto.randomUUID()` una vez por pantalla, como `useCancelarCompra`. Al terminar bien invalidan `["eventos"]`, `["compras"]` y `["notificaciones"]`.
  - `etiquetaEstadoEvento(estado)`: `POSPUESTO` → "Nueva fecha" (color `aviso`), `CANCELADO` → "Cancelado" (color `peligro`), `PROGRAMADO` → `null`.

- [ ] **Paso 1: tests de integración que fallan** (`gestionEvento.test.jsx`):
  - `"la gestión del evento ofrece posponer y cancelar mientras está programado"`.
  - `"no ofrece gestionar un evento cancelado o finalizado y explica por qué"`.
  - `"posponer exige una fecha posterior a la actual"`: el error se ve y se enfoca.
  - `"posponer envía la fecha y el motivo con clave de idempotencia y vuelve con un aviso"`: el handler recibe el body y el header `Idempotency-Key`.
  - `"cancelar pide confirmación y envía el motivo"`.
  - `"si la API responde 409, muestra el mensaje"`.
  - `"el detalle de un evento cancelado no ofrece comprar y dice 'Este evento se canceló'"`.
  - `"la tarjeta de un evento pospuesto muestra 'Nueva fecha'"`.
- [ ] **Paso 2:** `npm run test:integration` → fallan.
- [ ] **Paso 3: implementar.**
  - En la gestión del evento, un `Panel` "Gestión del evento", oculto si el evento está finalizado o cancelado. Tiene una `FilaPanel` "Posponer" (`calendar`, detalle "Elegí una nueva fecha y les avisamos a los compradores") y otra "Cancelar evento" (color `peligro`, detalle "Les devolvemos el dinero a todos los compradores").
  - Si el evento está cancelado, un aviso: "Cancelaste este evento. Devolvimos el dinero de las compras pagadas."
  - Pantalla `posponer`:
    - Muestra la fecha actual y un `SelectorFechaHora` que arranca una semana después.
    - Tiene un `Campo` "Motivo (opcional)" de hasta 300 caracteres y un `Boton` "Posponer evento".
    - Usa `useFocoEnError` y `AvisoError`.
    - Al terminar bien, avisa "Pospusimos el evento y les avisamos a los compradores" y vuelve.
  - Pantalla `cancelar`:
    - Texto: "Vamos a cancelar todas las compras y devolverles el dinero a quienes pagaron. Les avisamos a todos. No se puede deshacer."
    - Tiene el `Campo` motivo y un `Boton` `peligro` "Cancelar evento", que pasa por `utils/confirmar` ("¿Cancelar {evento}?").
    - Al terminar bien, avisa "Cancelaste el evento. Estamos devolviendo el dinero." y vuelve.
  - Las `Stack.Screen` son `organizador/evento/[id]/index` ("Tu evento"), `.../posponer` ("Posponer evento") y `.../cancelar` ("Cancelar evento").
  - Insignias de estado:
    - `EventoCard` y la lista "Mis eventos" muestran la insignia.
    - El detalle del evento cancelado muestra "Este evento se canceló" en lugar de "Comprar entradas". El pospuesto muestra "Se pospuso" junto a la fecha.
    - `CompraCard` y la compra muestran "El organizador canceló el evento." o "El evento se pospuso.".
  - Correr → pasan.
- [ ] **Paso 4: E2E** (`gestion-evento.cy.js`):
  - Lucía cancela `e-rock-nacional` desde "Tu evento" con un motivo y ve las compras pagadas REEMBOLSADAS.
  - Sofía inicia sesión, abre la notificación "Se canceló Rock Nacional" y llega a su compra REEMBOLSADA.
  - Un segundo test pospone otro evento y verifica "Nueva fecha" en Explorar.
  - Correr la suite E2E completa.
- [ ] **Paso 5:** verificar en Expo web (360 px, claro y oscuro) los dos flujos. Sacar capturas. En el README, sumar la fila "Posponer o cancelar un evento" al checklist y dejar en "Pendiente" solo las notificaciones **push**. Cierre: tests, lint y formato.
- [ ] **Paso 6:** commit (`feat(app): posponer y cancelar un evento desde la gestión del organizador`) y PR contra `feat/notificaciones-app`.

---

## Tarea 5: Diagrama de clases y documentación

**Archivos:**

- Crear: `docs/diagramas/clases.puml`, `docs/diagramas/clases.svg`
- Modificar: `docs/diagramas/arquitectura.puml` y `arquitectura.svg`, `README.md` (sección del diagrama y tabla de sincronismo), `CLAUDE.md` (glosario y decisiones), `docs/requerimientos.md` ("Diagrama tentativo"), `docs/checklist-requerimientos.md:468`
- Se conserva `docs/diagramas/clases-consigna.png`: es el original de la cátedra y el README lo enlaza.

**Interfaces:**

- Consume: los nombres de T1 y T2 (`Notificacion`, `TipoNotificacion`, `EstadoEvento`, `posponer`, `cancelar`, `marcarLeida`).

- [ ] **Paso 1:** descargar el `.jar` de la última versión estable de PlantUML desde sus releases de GitHub a `.superpowers/sdd/2026-11-07-notificaciones-y-eventos/plantuml.jar`, que está ignorado. Hay Java y Graphviz instalados.
- [ ] **Paso 2:** escribir `clases.puml` con el diagrama de la consigna **tal cual**: mismas clases, atributos, tipos, métodos, flechas, multiplicidades y etiquetas. Renderizarlo y compararlo con el PNG hasta que coincida. Encabezado como el de `arquitectura.puml` (cómo regenerarlo).
- [ ] **Paso 3:** sumar lo nuevo con el mismo estilo:
  - `Evento`: `- estado: EstadoEvento`, `+ posponer(DateTime): void` y `+ cancelar(): void`.
  - `enum EstadoEvento { PROGRAMADO POSPUESTO CANCELADO }`, con `Evento --> EstadoEvento`.
  - `class Notificacion { - destinatario: Usuario - tipo: TipoNotificacion - titulo: String - cuerpo: String - evento: Evento - compra: Compra - tipoEntrada: TipoEntrada - fechaHora: DateTime - leida: Boolean - cantidad: Int + marcarLeida(): void }`.
  - `enum TipoNotificacion` con los 10 valores.
  - Flechas: `Notificacion --> Usuario : destinatario`, `Notificacion --> Evento`, `Notificacion --> "0..1" Compra`, `Notificacion --> "0..1" TipoEntrada` y `Notificacion --> TipoNotificacion`.
  - Lo agregado va con un fondo suave y una `legend` que lo explica ("En verde, lo que se sumó al diagrama de la consigna").
  - Revisar que el layout quede prolijo, sin flechas cruzadas de más (`together`, `-[hidden]-` u orden de declaración). Renderizar `clases.svg`.
- [ ] **Paso 4:** en `arquitectura.puml`:
  - El barrido pasa a decir "Barrido (cada 60 s): reservas vencidas y eventos cancelados".
  - La nota de polling suma "notificaciones cada 15 s".
  - Hay un componente "Notificaciones" entre los services.
  - Re-renderizar `arquitectura.svg`.
- [ ] **Paso 5:** documentación.
  - README: mostrar `clases.svg`, enlazar el PNG original y actualizar "lo que agrega la implementación" y la tabla de sincronismo (notificaciones por polling; la cancelación del evento se completa en segundo plano).
  - `CLAUDE.md`:
    - En el glosario, **Notificacion** y **EstadoEvento**.
    - Decisión 9: notificaciones in-app por polling, creadas por los services después de persistir, con chats agrupados y al organizador solo los agotados.
    - Decisión 10: cancelar un evento reembolsa todas las compras vigentes, lo pendiente lo retoma el barrido y posponer mantiene las entradas.
  - `docs/requerimientos.md`: sumar a "Diagrama tentativo" qué se agregó.
  - `docs/checklist-requerimientos.md:468`: notificaciones in-app hechas y la sección de la Guía UX aplicada.
- [ ] **Paso 6:** `npx prettier --check` en los `.md` tocados. Rebasar sobre `feat/gestion-eventos-app`, commit (`docs: diagrama de clases en PlantUML con notificaciones y estados del evento`) y PR contra `feat/gestion-eventos-app`.
