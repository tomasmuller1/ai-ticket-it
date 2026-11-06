# Decisiones de UX: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** implementar las 4 decisiones de UX pendientes: reserva sin duplicados, reservas que vencen, un solo "Pagar" y desplazamiento al primer error.

**Arquitectura:** reutiliza el middleware `idempotente`, el patrón State de `Compra` y `useFocoEnError`. El vencimiento es un barrido periódico, porque el cupo se descuenta en el dominio y evaluarlo al consultar obligaría a tocar cada lectura de disponibles.

**Stack:** Express 5 ESM, Zod y OpenAPI, Jest y Supertest. Expo SDK 58, Expo Router, TanStack Query, RNTL, MSW y Cypress. No suma dependencias.

**Spec:** `docs/requerimientos.md`, sección 4.

## Restricciones globales

- Cada tarea es una rama y un PR, apilados en este orden: `docs/ux-y-entregables` → `docs/requerimientos-y-plan` → `fix/reservar-idempotente` → `feat/vencimiento-reservas` → `feat/pagar-al-reservar` → `fix/desplazar-al-primer-error`. No se parte de `main`: `idempotente.js`, `useFocoEnError` y `hooks/pago.js` todavía no están ahí. El usuario mergea.
- Commits en español con Conventional Commits, terminados en `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. El PR termina en `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- Primero el test que falla. AAA y nombres en español que describan el comportamiento.
- Backend: `reloj.ahora()`, nunca `new Date()` en reglas. `req.validado` después de `validar`. Errores como subclase de `AppError`. Todo cambio de API va en Swagger.
- App: en RNTL 14, `render` y `fireEvent` llevan `await`. Sin mockear `api/client`. Sin colores ni tamaños sueltos. Textos en rioplatense. Antes de usar una API de Expo o React Native, consultar `https://docs.expo.dev/versions/v58.0.0/`.
- E2E: selectores por lo que ve la persona, sin `cy.wait(ms)`. Levantar con `AUTH_INTENTOS_MAXIMOS=1000 npm run dev`, `npx expo start --web --port 8081` y `npm run e2e`.
- **Cierre de cada tarea:** en `backend/` y en `mobile/`, `npm test`, `npm run lint` y `npm run format:check` en verde. Punto de partida del 6/11/2026: 255 tests en backend y 140 en la app.

## Foco de revisión

1. Un pago en proceso cuando se cumple el plazo: la reserva no vence (Tarea 2).
2. Una tarjeta rechazada justo al vencer: quedan 5 minutos para reintentar (Tarea 2).
3. La hoja de pago abierta cuando la reserva vence: explica qué pasó, no da un error genérico (Tarea 2).
4. Un reintento de "Reservar" que devuelve una compra ya cancelada: abre la compra, sin la hoja (Tarea 3).
5. Recargar o volver a la compra después de cerrar la hoja: no se abre de nuevo (Tarea 3).

---

## Tarea 0: Registrar los requerimientos y el plan

**Archivos:** `docs/requerimientos.md`, `docs/superpowers/plans/2026-11-06-decisiones-ux.md`

- [ ] **Paso 1:** crear `docs/requerimientos-y-plan` desde `docs/ux-y-entregables`, commitear los dos archivos (`docs: registrar los requerimientos y el plan de las decisiones de UX`) y abrir el PR contra `docs/ux-y-entregables`.

---

## Tarea 1: "Reservar" sin duplicados (decisión 1)

**Archivos:**

- Modificar: `backend/src/routes/comprasRoutes.js:36` y su documentación (`:126`), `mobile/src/api/endpoints.js:39`, `mobile/src/hooks/compras.js:41-44`, `mobile/src/app/evento/[id]/comprar.jsx`
- Tests: `backend/test/integracion/compras.test.js`, `backend/test/integracion/docs.test.js`, nuevo `mobile/test/integracion/reservar.test.jsx`
- Documentación: `backend/CLAUDE.md:48`, `docs/ux.md:75`, `docs/checklist-requerimientos.md:143`

**Interfaces:**

- Produce: `POST /api/compras` acepta `Idempotency-Key`. `api.compras.crear(datos, clave)`.

- [ ] **Paso 1: tests del backend que fallan.** En `compras.test.js`, dentro de `POST /api/compras (CU12)`, con `reservar(clave, cantidad = 2)` que manda `Idempotency-Key` para `e-rock-nacional-campo`:

```js
it("con la misma clave no reserva dos veces y devuelve la misma compra", async () => {
  const antes = await disponibles("e-rock-nacional", "Campo");
  const primera = await reservar("k1");
  const segunda = await reservar("k1");
  expect(segunda.status).toBe(201);
  expect(segunda.headers["idempotent-replayed"]).toBe("true");
  expect(segunda.body.id).toBe(primera.body.id);
  expect(await disponibles("e-rock-nacional", "Campo")).toBe(antes - 2);
});

it("la misma clave con otra cantidad responde 409 y no reserva", async () => {
  const antes = await disponibles("e-rock-nacional", "Campo");
  await reservar("k1", 2);
  const res = await reservar("k1", 3);
  expect(res.status).toBe(409);
  expect(res.body.error.codigo).toBe("CLAVE_IDEMPOTENCIA_REUTILIZADA");
  expect(await disponibles("e-rock-nacional", "Campo")).toBe(antes - 2);
});
```

En `docs.test.js`: `expect(clave(res.body.paths["/api/compras"].post)).toMatchObject({ in: "header", required: false });`.

- [ ] **Paso 2:** `npm test -- compras docs` en `backend/`. Esperado: fallan los dos tests nuevos y el de la documentación.
- [ ] **Paso 3: implementar en la ruta.** `router.post("/", validar({ body: CrearCompraBody, headers: IdempotenciaHeaders }), idempotencia, controller.crear)`. En Swagger, `request.headers: IdempotenciaHeadersDoc`, y sumar `OPERACION_EN_CURSO` y `CLAVE_IDEMPOTENCIA_REUTILIZADA` a la descripción del 409.
- [ ] **Paso 4:** el mismo comando. Esperado: pasa todo.
- [ ] **Paso 5: tests de la app que fallan.** En `reservar.test.jsx`, con el patrón de `cancelacion.test.jsx` (`renderHook`, `useComprar`):

```js
it("manda una clave de idempotencia", ...)          // claves[0] coincide con /^[0-9a-f-]{36}$/
it("si se perdió la respuesta, reintentar usa la misma clave", ...)  // claves[1] === claves[0]
it("si cambian el tipo o la cantidad, usa otra clave", ...)          // claves[1] !== claves[0]
it("sin respuesta, avisa que se puede reintentar sin duplicar", ...) // pantalla con POST en HttpResponse.error()
```

El último espera el texto "No pudimos confirmar tu reserva. Tocá Reservar de nuevo: no se va a duplicar.", con `renderPantalla` sobre `evento/[id]/comprar`.

- [ ] **Paso 6:** `npm test -- reservar` en `mobile/`. Esperado: fallan los 4.
- [ ] **Paso 7: implementar en la app.**
  - `api.compras.crear(datos, clave)` manda `claveIdempotencia: clave`.
  - `useComprar` envuelve `mutationFn`: hoy pasa `api.compras.crear` directo y TanStack Query le daría su contexto como segundo argumento. Guarda `{ huella: JSON.stringify(datos), clave }` en un `useRef` y genera otra clave solo si cambia la huella, como `hooks/pago.js:116`.
  - `comprar.jsx`: si `comprar.error?.status === 0`, muestra el texto del paso 5 en `AvisoError`.
- [ ] **Paso 8:** el mismo comando. Esperado: pasa todo.
- [ ] **Paso 9: documentación.** `backend/CLAUDE.md:48` suma `POST /compras`. Marcar el hallazgo como corregido en `docs/ux.md:75` y `docs/checklist-requerimientos.md:143`.
- [ ] **Paso 10: cierre y commit.** Probar en Swagger: dos `POST /api/compras` con la misma clave devuelven la misma compra. `fix(compras): evitar la doble reserva con Idempotency-Key`.

**Límite aceptado:** salir de la pantalla y volver crea otra intención y otra clave, porque el texto de la decisión cubre "se toca de nuevo". Esa reserva se ve en Mis entradas y vence con la Tarea 2.

---

## Tarea 2: Las reservas vencen (decisión 2)

**Aprobado el 6/11/2026:** 15 minutos de plazo, estado final `CANCELADA` y barrido cada 60 s. El diagrama de la cátedra no tiene un estado `VENCIDA`.

**Archivos:**

- Modificar en `backend/src/`: `domain/Compra.js`, `errors/index.js`, `infra/config.js`, `repositories/index.js`, `services/ComprasService.js`, `app.js:87`, `server.js`, `dtos/compraDTO.js`, `schemas/compras.js:101`, `routes/comprasRoutes.js` (409 del pago)
- Modificar: `backend/.env.example`, `backend/test/helpers/fabricas.js` (`unaCompra` acepta `venceEn`), `mobile/src/app/compra/[id]/index.jsx:155-157`
- Tests: `backend/test/unit/domain/Compra.test.js`, `backend/test/unit/config.test.js`, `backend/test/integracion/compras.test.js`, `mobile/test/integracion/pago.test.jsx`
- Documentación: `CLAUDE.md:56`, `backend/CLAUDE.md:34,40,46`, `docs/ux.md:73`

**Interfaces:**

- Dominio: `Compra.crear({ ..., venceEn = null })`. `compra.venceEn: Date | null`, `compra.vencida: boolean`, `compra.estaVencida(reloj): boolean`, `compra.vencer(reloj): boolean`. `Compra.GRACIA_TRAS_RECHAZO_MS = 5 * 60 * 1000`. `ReservaVencidaError` (409, `RESERVA_VENCIDA`, "Tu reserva venció. Volvé a reservar si todavía querés ir.").
- Sin `venceEn` la compra no vence. Así, las compras `PENDIENTE` del seed, creadas hace 20 días, no se cancelan solas y `pasarela.cy.js` sigue sirviendo.
- Service: `new ComprasService(repositorios, pasarelaPagos, reloj, tarjetasService, logger, plazoReservaMinutos)`. `vencerReservas(): Promise<number>`. `ComprasRepository.buscarVencidas(reloj)`.
- Config: `RESERVA_PLAZO_MINUTOS` (entero, mínimo 1, por defecto 15), expuesto como `config.compras.plazoReservaMinutos`.
- `app.locals.vencerReservas()`: la llaman `server.js` y los tests.
- API: `reservaVenceEn: string | null` (ISO, solo si está PENDIENTE) y `reservaVencida: boolean`.

- [ ] **Paso 1: tests de dominio que fallan.** En `Compra.test.js`, con `venceEn` a las 12:15 y la compra creada a las 12:00 de `HOY`:

```js
it("no vence antes del plazo"); // estaVencida(12:14:59) === false
it("vence al cumplirse el plazo y libera el cupo"); // vencer(12:15) === true, estado CANCELADA, vencida true,
// historial.at(-1).quien === null, cupo restaurado, requiereReembolso() false
it("sin venceEn no vence"); // estaVencida(un año después) === false
it("no vence con un pago en proceso"); // iniciarPago 12:14, estaVencida(12:20) === false
it("una compra confirmada no vence"); // pagar 12:14, vencer(12:20) === false
it("un rechazo da 5 minutos más aunque el plazo haya pasado");
// iniciarPago 12:14, rechazarPago 12:20: estaVencida(12:24:59) === false, estaVencida(12:25) === true
it("pagar una reserva vencida lanza ReservaVencidaError"); // vencer(12:15), luego pagar: codigo RESERVA_VENCIDA
```

- [ ] **Paso 2:** `npm test -- Compra.test` en `backend/`. Esperado: fallan los nuevos.
- [ ] **Paso 3: implementar en el dominio.**
  - `estaVencida`: PENDIENTE, sin pago en proceso, con `venceEn` y `ahora >= venceEn`.
  - `vencer`: si está vencida, `this.#estado.cancelar(this, null, reloj)`, y `vencida = true`.
  - `rechazarPago`: si hay `venceEn`, pasa a ser el máximo entre `venceEn` y `ahora + GRACIA_TRAS_RECHAZO_MS`.
  - `verificarPago`: si el estado no permite pagar y `vencida` es true, lanza `ReservaVencidaError`.
- [ ] **Paso 4:** el mismo comando. Esperado: pasa todo.
- [ ] **Paso 5: tests de integración que fallan.** En `compras.test.js`, con `reloj = unReloj()`, `crearAppDePrueba({ reloj })` y `avanzar(ms)` que reasigna `reloj.fecha`:

```js
it("informa hasta cuándo vale la reserva"); // reservaVenceEn === "2026-11-01T15:15:00.000Z"
it("libera el cupo de una reserva sin pagar al cumplirse el plazo");
// avanzar 15 min, await app.locals.vencerReservas(): estado CANCELADA, reservaVencida true,
// acciones.pagar false, historial.at(-1).quien null, disponibles como antes de reservar
it("no toca las reservas que siguen en plazo"); // avanzar 14 min: sigue PENDIENTE
it("pagar después de vencer responde 409 RESERVA_VENCIDA");
it("las compras pendientes de ejemplo no vencen"); // c-04 sigue PENDIENTE después del barrido
```

En `config.test.js`: el valor por defecto es 15, y `RESERVA_PLAZO_MINUTOS=0` falla.

- [ ] **Paso 6:** `npm test -- compras config` en `backend/`. Esperado: fallan los nuevos.
- [ ] **Paso 7: implementar.**
  - `comprar` calcula `venceEn` con `reloj.ahora()` y el plazo.
  - `vencerReservas` recorre `buscarVencidas`, cada una dentro de `#sinOperacionesSimultaneas`. Si responde `OPERACION_EN_CURSO`, la saltea hasta el próximo barrido. Guarda y devuelve cuántas venció.
  - `createApp` guarda el service en una constante y define `app.locals.vencerReservas`.
  - `server.js`: `setInterval` de 60 s con `.unref()`, loguea los errores y hace `clearInterval` en `apagar`.
  - DTO, schema y Swagger, más un comentario en `seed.js` que explique por qué sus compras no vencen.
- [ ] **Paso 8:** el mismo comando. Esperado: pasa todo.
- [ ] **Paso 9: tests de la app que fallan.** En `pago.test.jsx`:

```js
it("muestra hasta qué hora vale la reserva"); // texto con `hasta las ${formato.hora(iso)}`
it("sin plazo, muestra el texto de siempre"); // reservaVenceEn null: "Tus entradas están reservadas. Pagalas para confirmar la compra."
it("explica que la reserva venció"); // reservaVencida true: "Tu reserva venció porque no se pagó a tiempo. Las entradas se liberaron."
it("si la reserva vence mientras paga, lo explica en la hoja"); // POST 409 RESERVA_VENCIDA: se ve su mensaje
```

- [ ] **Paso 10:** `npm test -- pago` en `mobile/`. Esperado: fallan los 3 primeros. El cuarto debería pasar, porque la hoja muestra el mensaje de la API; queda como regresión.
- [ ] **Paso 11: implementar en `compra/[id]/index.jsx`.** Con plazo: "Tus entradas están reservadas hasta las {hora}. Pagalas antes de esa hora o se liberan." Con `reservaVencida`, un bloque con el texto del paso 9 y el ícono `time-outline`.
- [ ] **Paso 12:** el mismo comando. Esperado: pasa todo.
- [ ] **Paso 13: documentación.**
  - `CLAUDE.md:56`: "El cupo se reserva al crear la compra y se libera al cancelar o al vencer la reserva."
  - `backend/CLAUDE.md`: fila PENDIENTE y regla de vencimiento, con plazo, barrido, gracia y excepción del seed.
  - `docs/ux.md:73`: hallazgo corregido.
- [ ] **Paso 14: cierre y commit.** Probar con `RESERVA_PLAZO_MINUTOS=1 npm run dev`: reservar en Swagger y, pasados 2 minutos, la compra está `CANCELADA` y volvió el cupo. `feat(compras): vencer las reservas sin pagar y liberar el cupo`.

---

## Tarea 3: Un solo "Pagar" después de reservar (decisión 3)

**Archivos:**

- Modificar: `mobile/src/app/evento/[id]/comprar.jsx:129`, `mobile/src/app/compra/[id]/index.jsx:83-88`
- Tests: `mobile/test/integracion/pago.test.jsx`, `mobile/cypress/e2e/compra.cy.js`
- Documentación: `docs/ux.md:55-63,77,110`, `docs/checklist-requerimientos.md:453`

**Interfaces:**

- Consume: `acciones.pagar` de la API. `HojaPago` no cambia.
- Produce: la ruta `/compra/:id?pagar=1` abre la hoja una sola vez.

`pasarela.cy.js` no se toca: entra directo a la compra, así que sigue cubriendo "pagar más tarde" con sus dos toques.

- [ ] **Paso 1: tests que fallan.** Con `renderPantalla({ "compra/[id]/index": DetalleCompra }, { initialUrl })`:

```js
it("con ?pagar=1 abre la hoja de pago"); // findByText("Confirmá el pago")
it("sin el parámetro no la abre"); // queryByText("Confirmá el pago") === null
it("no la abre si la compra ya no se puede pagar"); // ?pagar=1 con acciones.pagar false
it("al cerrarla, la reserva sigue en pie y no se vuelve a abrir");
// press "Cerrar el pago": se ve el botón "Pagar $ …", la hoja no está y la URL ya no tiene `pagar`
```

- [ ] **Paso 2:** `npm test -- pago` en `mobile/`. Esperado: fallan el primero y el cuarto; los otros dos pasan y quedan como regresión.
- [ ] **Paso 3: implementar.** Confirmar `router.setParams` en la documentación de la v58.
  - `comprar.jsx`: `router.replace(`/compra/${compra.id}?pagar=1`)`.
  - `DetalleCompra`, antes de los `return` tempranos: un efecto que, con `pagar === "1"` y `compra.data` cargada, hace `setPagando(true)` si `acciones.pagar` lo permite y limpia el parámetro con `router.setParams({ pagar: undefined })`. Se limpia al abrir: la hoja queda abierta mientras muestra el resultado, aunque `acciones.pagar` ya sea false, y una recarga no la reabre.
- [ ] **Paso 4:** el mismo comando. Esperado: pasa todo.
- [ ] **Paso 5: E2E.** En `compra.cy.js`:
  - `reservarEntradaDeJazz` termina esperando `cy.contains("Confirmá el pago")`.
  - Quitar `cy.botonQueEmpieza("Pagar").click()` de las líneas 23 y 35.
  - Sumar `it("si cierra la hoja, la reserva sigue pendiente y puede pagar después")`: `Cerrar el pago`, `estadoDeLaCompra("Pendiente")`, `botonQueEmpieza("Pagar").click()` y `Confirmá el pago`.
- [ ] **Paso 6:** `npm run e2e` en `mobile/`, con el backend y la app levantados. Esperado: todos en verde, 20 de 20.
- [ ] **Paso 7: documentación.** En `docs/ux.md`, el camino más corto pasa a 4 toques, el hallazgo 7 queda corregido y `:110` pasa a "¿Entiende que, si cierra la hoja, la reserva sigue en pie?". Actualizar `docs/checklist-requerimientos.md:453`.
- [ ] **Paso 8: cierre y commit.** Probar en Expo web a ancho de celular y anotar para la prueba en Expo Go. `feat(mobile): abrir la hoja de pago al reservar`.

---

## Tarea 4: Desplazarse hasta el primer error (decisión 4)

**Alcance:** Nuevo evento, la pantalla que nombra la decisión. El cambio queda en el hook: en `registro.jsx`, `perfil/editar.jsx` y `FormularioTarjeta.jsx` sumarlo es una línea, si después hace falta.

**Archivos:**

- Modificar: `mobile/src/hooks/useFocoEnError.js`, `mobile/src/app/organizador/evento/nuevo.jsx`, `mobile/src/components/SelectorFechaHora.jsx`, `mobile/src/components/SelectorFechaHora.web.jsx`
- Tests: nuevo `mobile/test/unit/useFocoEnError.test.jsx`, `mobile/cypress/e2e/organizador.cy.js`
- Documentación: `mobile/CLAUDE.md` (accesibilidad de formularios), `docs/ux.md:79`

**Interfaces:**

- Produce: `useFocoEnError()` devuelve `{ refDe, enfocarErrores, refScroll }`. Quien no conecta `refScroll` sigue igual que hoy.
- Comprobado en `node_modules`: `getInnerViewRef`, `scrollTo` y `measureLayout` existen en React Native 0.88.1 y en react-native-web 0.21.4.

- [ ] **Paso 1: tests que fallan.** Con `renderHook`. `scroll = { getInnerViewRef: () => "contenido", scrollTo: jest.fn() }` y `campo(y) = { measureLayout: jest.fn((_relativo, ok) => ok(0, y)) }`:

```js
it("desplaza hasta el primer campo con error, en el orden de la pantalla");
// nombre en 400 y lugar en 900, los dos con error: scrollTo({ y: 304, animated: true })
it("deja un margen y nunca pide una posición negativa"); // campo en 20: y === 0
it("sin refScroll no desplaza ni rompe");
it("no desplaza si ningún error tiene un campo"); // { general: "x" }: no llama a scrollTo
it("con 'Reducir movimiento' no anima"); // isReduceMotionEnabled en true: animated false
```

- [ ] **Paso 2:** `npm test -- useFocoEnError` en `mobile/`. Esperado: fallan.
- [ ] **Paso 3: implementar en el hook.** En el efecto, después de `enfocarLector`: `nodo.measureLayout(scroll.getInnerViewRef(), (_x, y) => scroll.scrollTo({ y: Math.max(0, y - MARGEN), animated: !reducido }), () => {})`, con `MARGEN = espacio.xxxl * 2` (96) para que se vea la etiqueta, y `reducido` de `useMovimientoReducido()`.
- [ ] **Paso 4:** el mismo comando. Esperado: pasa todo.
- [ ] **Paso 5: conectar `nuevo.jsx`.** Sin esto, algunos errores se quedarían sin destino:
  - `<ScrollView ref={refScroll}>`.
  - `SelectorFechaHora ref={refDe("fecha")}`. En las dos variantes, `ref` va al `Texto` del error, igual que `categoriaId`: así también le sirve al lector.
  - `Campo ref={refDe(`tiposEntrada.${indice}.descripcion`)}`.
  - En `onError`, renombrar `multimedia.0` a `imagen`, y dejar `error={errores.imagen}`.
- [ ] **Paso 6: E2E.** En `organizador.cy.js`, con `enPantalla($el)`, que verifica con `getBoundingClientRect` que el elemento está dentro de `Cypress.config("viewportHeight")`:

```js
it("al fallar, lleva la pantalla hasta el primer error", () => {
  cy.visit("/organizador/evento/nuevo");
  cy.boton("Publicar evento").click();
  cy.campo("Nombre, obligatorio").first().should(enPantalla);
});

it("también llega al error de la fecha", () => {
  // completa todo lo demás bien y escribe una fecha pasada en el input "Fecha y hora"
  cy.boton("Publicar evento").click();
  cy.contains("La fecha tiene que ser futura.").should(enPantalla);
});
```

- [ ] **Paso 7:** `npm run e2e` en `mobile/`. Esperado: todos en verde, 22 de 22. Comprobar que los dos nuevos fallan si se quita `ref={refScroll}`.
- [ ] **Paso 8: documentación.** Sumar `refScroll` en `mobile/CLAUDE.md`. Marcar el hallazgo 9 como corregido en `docs/ux.md:79`.
- [ ] **Paso 9: cierre y commit.** Probar en Expo web y anotar para la prueba en Expo Go. `fix(mobile): desplazar Nuevo evento hasta el primer error`.

---

## Fuera de este plan

Lo tiene que hacer una persona. Está en `docs/requerimientos.md`, sección 5.

- **El video de 5 a 10 minutos con la conclusión final** es la entrega del enunciado.
- Prueba en un celular con Expo Go, que además debe confirmar lo nativo de las Tareas 3 y 4.
- Prueba de usabilidad, recorrido con lector, ejercicio UX Detective y mergear los PR.

Opcional y sin decidir: los dos hallazgos de severidad baja de `docs/ux.md`, y actualizar el texto viejo del checklist y las capturas anteriores al rediseño que usa el `README.md`.
