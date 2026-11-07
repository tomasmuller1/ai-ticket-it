# Checklist de requerimientos: TP Individual AI Ticket It

Revisado contra el código de `main` (commit `cc12cd8`) el 6/11/2026. Para el estado usé tres fuentes: lectura del código, la app corriendo en Expo web y `npm test` del backend.

**Alcance:** la app es mobile (React Native con Expo Go). Lo que solo existe en web quedó descartado y está listado al final. La excepción son los E2E con Cypress sobre Expo web (punto 9).

- `[x]` ya está hecho y lo verifiqué. `[ ]` falta.

**Actualización del 6/11/2026.** Implementé todo lo que se puede resolver desde el código, en ramas apiladas, una por tema. Lo que sigue sin tildar **requiere un celular o una persona**: Claude no puede hacerlo. Quedó anotado al lado de cada punto.

| Falta | Quién | Dónde está lo necesario |
|---|---|---|
| Recorrer con VoiceOver y TalkBack, Accessibility Inspector y Scanner, letra al máximo | Vos, con un celular | Punto 8 |
| Prueba manual en Expo Go, iOS y Android, y red lenta | Vos, con un celular | Punto 9 y `README.md` |
| Prueba de usabilidad con una persona externa | Vos y esa persona | Guion y tabla en `docs/ux.md` |
| Hacer el ejercicio UX Detective | Vos | Comparación hecha en `docs/ux.md` |
| Confirmar con la cátedra si los E2E son requisito | Vos | Punto 9 |
- **Material**: los nombres son los de las fuentes del notebook "DSI | DdS". Los repos del notebook guardan solo la página de GitHub, así que para el código hay que ir a la rama que se indica.

## Resumen

| # | Requerimiento | Estado | Qué falta, en una línea |
|---|---|---|---|
| 1 | Reintentos y pantallas de error | Hecho | Nada |
| 2 | Spinners y skeletons | Hecho en código | Probar con red lenta en el celular |
| 3 | Pago cautivo sin doble cobro | Hecho | Nada |
| 4 | Polling en el pago | Hecho | Nada |
| 5 | Caché entre pantallas | Hecho | Nada |
| 6 | `useQuery` | Hecho | Nada |
| 7 | Usuarios con JWT | Hecho | Nada |
| 8 | Accesibilidad | Hecho en código | Probar con VoiceOver, TalkBack, las herramientas de cada sistema y letra al máximo |
| 9 | Tests con Jest y E2E | Hecho en código | Prueba manual en Expo Go |
| 10 | Guía práctica UX | Parcial | Prueba con una persona externa, recorrido con lector y UX Detective |

**Orden sugerido:** 1 → 8 → 3 y 4 juntos → 5 y 6 → 9, aunque cada rama trae sus tests. La Guía UX dice que, si hay poco tiempo, se prioricen los mensajes de error claros, el feedback ante cada acción y el contraste.

---

## 1. Reintentos automáticos y pantallas de error

**Estado actual:** `mobile/src/app/_layout.jsx:39` reintenta las queries 2 veces, salvo los 4xx, con el backoff exponencial que trae React Query. Las mutaciones no se reintentan.

**Regla para toda la app.** Solo se ofrece reintentar cuando reintentar puede cambiar el resultado. Un 4xx no se arregla repitiendo la misma request, así que no lleva botón.

| Respuesta | Reintento automático | Botón Reintentar | Qué ve la persona |
|---|---|---|---|
| Sin conexión o timeout | Sí, en GET | Sí | "No pudimos conectarnos" |
| 5xx | Sí, en GET | Sí | "Tuvimos un problema interno" |
| 429 | Sí, en GET, respetando `Retry-After` | No | "Probá de nuevo en unos minutos" |
| 400 y 422 | No | No | El error junto a cada campo |
| 401 | No (renueva el token) | No | Vuelve al login si no se pudo renovar |
| 403 | No | No | "No tenés acceso a esta compra" |
| 404 | No | No | "Este evento ya no existe" |

El 429 es la única excepción dentro de los 4xx: lo pediste en los reintentos automáticos y la tabla "Status HTTP" de la PPT dice "Espera (Retry-After) y reintenta".

**¿Se puede llegar a un 404?** Es raro, pero sí. La navegación de la app usa ids que vienen de la API y el backend no tiene forma de borrar eventos ni compras. Quedan estos casos:
- **Backend reiniciado:** la persistencia es en memoria. Los eventos del seed conservan su id, pero las compras y los eventos creados en la app desaparecen, y una lista que ya estaba en pantalla puede apuntar a ellos.
- **Deep link:** el `scheme` `aiticketit` de `app.json` permite abrir `aiticketit://evento/<id>` con un id o una ruta que no existen.
- **Datos de prueba:** `POST /api/dev/reset` provoca lo mismo que un reinicio.

**Lo que se ve hoy** (probado en Expo web):
- Con el backend apagado aparece "No pudimos conectarnos con AI Ticket It…" con Reintentar. Eso está bien.
- Un evento inexistente muestra "No pudimos cargar esto / No existe el evento 00000000-0000-…" con **un Reintentar que nunca va a funcionar**, y le muestra el UUID a la persona.
- Una ruta inexistente muestra la pantalla por defecto de Expo, en inglés.

**Reintentos**
- [x] No reintentar 400, 401, 403 ni 404.
- [x] Backoff exponencial en las queries (el default de React Query).
- [x] No reintentar automáticamente los POST.
- [x] Reintentar también **429**: hoy la regla de `_layout.jsx:39` lo excluye por ser 4xx.
- [x] Respetar `Retry-After`: `ApiError` (`mobile/src/api/client.js:22`) guarda el status pero no los headers. Si la espera es larga, no esperar y mostrar el mensaje.
- [x] Sumar **jitter** con `retryDelay`: `base * 2 ** (intento - 1) + Math.random() * 300` (slide "Backoff").
- [x] Agregar **timeout** a `enviar()` (`client.js:62`): sin él, un backend colgado deja el skeleton para siempre. El timeout debe contar como reintentable.

Hoy el backend solo limita login, registro, Google y cambio de contraseña, con ventana de 15 minutos (`backend/src/routes/authRoutes.js:20`). Esos son POST y no se reintentan solos, así que ahí el 429 termina en un mensaje.

**Pantallas**
- [x] Backend caído al abrir la app, con Reintentar (`estado === "sinConexion"`).
- [x] **`EstadoError` decide según el status:** muestra Reintentar solo con sin conexión, timeout o 5xx. Hoy lo muestra siempre que la pantalla le pase `onReintentar`, sin mirar el status.
- [x] Distinguir **error interno (5xx)** de **sin conexión**: hoy título e ícono son iguales, y el 500 muestra el texto crudo del backend, "Error interno del servidor".
- [x] **404 de recurso** (evento o compra): solo el mensaje, sin Reintentar y sin UUID. El texto debe salir del front según `status`, no de `error.message`.
- [x] **Que nadie quede atrapado en ese mensaje:** `evento/[id]/index` no tiene header y su botón Volver solo aparece con el evento cargado (`index.jsx:121`). Hay que mostrar ese mismo Volver también en el error. Es navegación, no un reintento.
- [x] **`mobile/src/app/+not-found.jsx`** en español para deep links a rutas que no existen.
- [x] Mensaje de **403**, sin reintentar.

**Material**
- Notebook:
  - `[DDS UTN] Clase Semana - 10 (1).pdf`: slides "Status HTTP", "Estados", "Backoff" y "Para pensar" (pregunta 4).
  - `Resumen Clase Semana 10 (video + PPT) - Front-Back, Sincronismo y Usuarios`, y el video `Clase Semana 10 - Video grabación (transcripción)`.
  - `[DDS UTN] Clase Práctica - 11 - Integracion Front y Backend.pptx` y `Resumen Clase Práctica 11 (video + PPT) - Integración Front-Back con Axios`.
  - `[DDS UTN] Clase Práctica - 05- Manejo de errores (1).pdf`.
  - `Guia práctica UX.pdf`: heurística 9 y pregunta guía 4 ("¿Qué pasa cuando algo sale mal?").
- Repo de la cátedra, rama `clase11-integracion-front-back` de `ddso-utn/ejercicio-megasuper-2026` (solo por la lógica):
  - [`client/src/service/api.js`](https://github.com/ddso-utn/ejercicio-megasuper-2026/blob/clase11-integracion-front-back/client/src/service/api.js): mensaje de error centralizado.
  - [`client/src/features/products/ProductDetailPage.jsx`](https://github.com/ddso-utn/ejercicio-megasuper-2026/blob/clase11-integracion-front-back/client/src/features/products/ProductDetailPage.jsx): 404 contra error genérico.
- Web: [TanStack Query, reintentos](https://tanstack.com/query/latest/docs/framework/react/guides/query-retries) · [Expo Router, manejo de errores y rutas sin coincidencia](https://docs.expo.dev/router/error-handling/)

---

## 2. Spinners y skeletons

**Estado actual:** las 11 pantallas que cargan datos usan `Skeleton` o `Cargando`. Los botones tienen estado `cargando`. El scroll infinito usa `ActivityIndicator`.

**Las bibliotecas que nombraste, para React Native:**

| Biblioteca | ¿Sirve en React Native? | Detalle |
|---|---|---|
| Ant Design | **Sí, con su versión propia** | `@ant-design/react-native` es del mismo equipo y trae `skeleton` y `activity-indicator`. `antd` y `antd-mobile` no sirven (dependen de `react-dom`). |
| Material UI | No | `@mui/material` depende de `react-dom` y no tiene versión para React Native. React Native Paper implementa Material Design, pero es otro proyecto. |
| React Bootstrap | No | Depende de `react-dom`. Lo que hay para React Native son paquetes chicos y abandonados (`react-native-bootstrap`, última versión de 2022). |

**Decisión (6/11/2026): no se suma ninguna biblioteca; se sigue con `components/ui/`.** `@ant-design/react-native` existe, pero se prueba con React Native 0.81 y `gesture-handler` 2.28, y la app está en 0.88 y 3.3. En la Semana 10 el docente aceptó spinners nativos o propios para mobile.

- [x] Skeleton o spinner en toda carga de datos.
- [x] Botones deshabilitados y con spinner mientras envían.
- [x] El skeleton respeta "Reducir movimiento".
- [x] Anunciar la carga: `Skeleton` no tiene etiqueta, así que el lector de pantalla no dice nada mientras carga.
- [ ] Probar con red lenta en el celular (Network Link Conditioner en iOS, o demorando el backend) que no haya saltos ni pantallas en blanco. **Requiere un celular.**

**Material**
- Notebook:
  - `[DDS UTN] Clase Semana - 10 (1).pdf`: slides "Cuestiones de UX", "Renderizado" y "Estados".
  - `Resumen Clase Semana 10 (video + PPT)…`: sección 1.5, donde figura que en mobile se pueden usar los spinners nativos del sistema o propios, y el mapa de slides ("se evaluará en el TP").
  - `Guia práctica UX.pdf`: heurística 1 y error "Botón sin feedback al hacer clic".
- Web: [ActivityIndicator](https://reactnative.dev/docs/activityindicator)

---

## 3. Pago cautivo y sin doble cobro

**Estado actual:** la hoja de pago ya es cautiva. En `mobile/src/components/HojaPago.jsx`, mientras cobra no se puede cerrar con la cruz, tocando afuera ni con el botón "atrás" de Android.

El doble cobro está cubierto solo en parte. `ComprasService.#enCurso` frena dos requests simultáneas, y la compra `CONFIRMADA` rechaza un segundo pago. **El hueco está cuando se pierde la respuesta:** si el cobro salió pero la respuesta no llegó, la app dice "No hay conexión. Tu reserva sigue en pie: probá de nuevo", y al reintentar el backend devuelve un error en vez del resultado.

- [x] Pantalla cautiva mientras se procesa.
- [x] Botón de pago sin doble toque (el resumen se reemplaza por el anillo).
- [x] Sin reintento automático del POST de pago.
- [x] Dos requests simultáneas no cobran dos veces.
- [x] El front genera una clave por **intención de pago** y la reusa en cada intento: header `Idempotency-Key`. `expo-crypto` ya está instalado.
- [x] El backend guarda clave y respuesta por usuario y, si la clave se repite, **devuelve la respuesta guardada sin cobrar**.
- [x] Resultado incierto (timeout o sin conexión): no decir que falló. Consultar el estado de la compra y mostrar lo que corresponda.
- [x] Revisar lo mismo en cancelación y reembolso, que también usan la pasarela. `POST /cancelacion` acepta la clave y la app la repite en cada reintento. El reembolso sigue siendo sincrónico. "Reservar" (`POST /compras`) también acepta la clave y la app la repite al tocarlo de nuevo (corregido; era un hallazgo de `docs/ux.md`).
- [x] Test: misma clave dos veces produce una sola operación en `pasarelaPagos.operaciones` y la misma respuesta.
- [x] Documentar el header en Swagger.

**Material**
- Notebook:
  - `[DDS UTN] Clase Semana - 10 (1).pdf`: pregunta 5 de "Cuestiones de Sincronismo" (pantalla cautiva) y slide "Reintentos seguros", con el código de `Idempotency-Key`.
  - `Clase Semana 10 - Video grabación (transcripción)` y su resumen.
  - `Guia práctica UX.pdf`: heurística 5 y "Botón sin feedback".
- Repos: en los repos de la cátedra que revisé no encontré ejemplo de esto; la referencia es la slide.
- Web: [Idempotencia en la API de Stripe](https://docs.stripe.com/api/idempotent_requests)

---

## 4. Polling en el pago y otras técnicas de sincronismo

**Estado actual:** `POST /api/compras/:id/pago` cobra y responde en el momento. La pasarela fake aprueba al instante y el anillo tiene una duración mínima falsa de 1,1 s. **Hoy no hay polling en el pago.**

**Backend**
- [x] `POST …/pago` responde **202** con un `operacionId`.
- [x] `PasarelaPagosFake` resuelve con una demora configurable (0 en los tests) y puede aprobar o rechazar.
- [x] Endpoint de consulta de la operación: pendiente, aprobada o rechazada.
- [x] Mantener el `EstadoCompra` del diagrama de la cátedra: la compra sigue `PENDIENTE` hasta que se apruebe, y el estado "en proceso" vive en la operación.
- [x] Combinar con la `Idempotency-Key` del punto 3.
- [x] Swagger y tests del flujo completo.

**Front**
- [x] `useQuery` con `refetchInterval` como función: frena al llegar a aprobada o rechazada.
- [x] **Máximo de intentos** (la slide lo pide). Al llegar, salir de la hoja con un mensaje honesto: "Tu pago sigue en proceso, lo vas a ver en Mis entradas".
- [x] Guardar el `operacionId` para retomar si la app se cierra durante el pago.
- [x] Sacar la duración mínima falsa si la demora ya es real.

**Otras partes de la app.** Regla de la cátedra: "Empezá por polling y subí de nivel solo cuando la latencia o la carga lo justifiquen".

| Parte | Hoy | Recomendación (mía) |
|---|---|---|
| Chat (CU5 y CU6) | Polling cada 3 s, se pausa en segundo plano | **Dejarlo** y justificarlo. La PPT sugiere WebSockets para chat, pero no hay carga que lo justifique. Queda como mejora opcional. |
| Compras del organizador (CU2) y Mis entradas (CU1) | Refresco al volver a la pantalla | Alcanza. Opcional: `refetchInterval` solo si hay compras pendientes. |
| Entradas disponibles al comprar | Se refresca ante `SIN_CUPO` | Alcanza. Opcional: `staleTime` más corto en esa pantalla. |
| SSE | No se usa | **No usar**: la PPT aclara que `EventSource` no permite headers propios y la app usa bearer token. Además, React Native no trae `EventSource` incorporado. |

- [x] Dejar la justificación de cada técnica en el README, porque el enunciado valora "la justificación de decisiones".

**Material**
- Notebook:
  - `[DDS UTN] Clase Semana - 10 (1).pdf`: slides "Flujo de polling", "Alternativas", "Polling a fondo", "¿Cuál elegir?" y "React Query" (ejemplo de `refetchInterval`).
  - `Simulador Polling vs SSE vs WebSockets (HTML interactivo - Semana 10)`.
  - `Resumen Clase Semana 10 (video + PPT)…`.
  - `DDS UTN Trabajo Práctico Individual de Desarrollo con IA - 2C 2026 - Público.pdf`: qué se valora.
- Repos: no encontré polling en los repos de la cátedra que revisé.
- Web: [`useQuery` y `refetchInterval`](https://tanstack.com/query/latest/docs/framework/react/reference/useQuery)

---

## 5. Caché de datos entre pantallas

**Estado actual:** ya funciona con TanStack Query. `staleTime` global de 30 s, categorías con `Infinity`, invalidación tras cada acción, favoritos optimistas y `queryClient.clear()` al cerrar sesión, para que no queden datos de otra persona.

- [x] Caché compartida por `queryKey`.
- [x] Invalidación tras comprar, pagar, cancelar y reseñar.
- [x] Limpieza al cerrar sesión.
- [x] Detalle de evento: usar los datos de la lista como `placeholderData`, para no mostrar skeleton si la tarjeta ya los tenía.
- [x] Búsqueda: `keepPreviousData` al cambiar filtros, para que no parpadee la lista (`isPending` hoy vuelve al skeleton).
- [x] Pantalla de comprar: `staleTime: 0` en los disponibles, porque 30 s de atraso importan cuando quedan pocas entradas.
- [x] No hace falta persistir la caché en disco: no suma para el TP y agrega riesgo de datos viejos.

**Material**
- Notebook: `[DDS UTN] Clase Semana - 10 (1).pdf`, slide "React Query" ("Caché de datos entre pantallas"); `Resumen Clase Práctica 10 (video + PPT) - React Hooks` (la pregunta sobre caché).
- Repos: los de la cátedra no usan React Query; la referencia es la slide y la documentación.
- Web: [Datos de placeholder](https://tanstack.com/query/latest/docs/framework/react/guides/placeholder-query-data)

---

## 6. `useQuery` donde sea necesario

**Estado actual:** todas las lecturas pasan por hooks de `mobile/src/hooks/` con `useQuery` o `useInfiniteQuery`. Ninguna pantalla hace fetch con `useEffect`. `useDebounce` ya existe para la búsqueda.

- [x] Lecturas con `useQuery` o `useInfiniteQuery`.
- [x] Polling del chat con `refetchInterval`.
- [x] Debounce en la búsqueda.
- [x] `mobile/src/app/perfil/editar.jsx:67` llama a `api.usuarios.actualizar` directo: pasarlo a `useMutation`, como el resto.
- [x] Pasar el `signal` de React Query a `fetch`, para cancelar requests viejas. Hoy `enviar()` no lo recibe.
- [x] Polling de la operación de pago con `useQuery` (punto 4).

**Material**
- Notebook: `[DDS UTN] Clase Semana - 10 (1).pdf`: slides "React Query", "Race conditions" y "Debounce".
- Web: [Cancelación de queries](https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation)

---

## 7. Manejo de usuarios con bearer token JWT

**Estado actual: ya está hecho así.** Sigue lo que pide la Semana 10:
- **Login:** `bcrypt` y mismo error para email o contraseña incorrectos, con rate limit.
- **Access token JWT** de 15 min, enviado como `Authorization: Bearer`. En la app vive solo en memoria.
- **Refresh token** opaco de 30 días, rotativo; reutilizarlo revoca la sesión. Se guarda en SecureStore, el equivalente mobile de lo que la slide "¿Dónde guardar?" compara para web.
- **Renovación sola ante un 401** en `pedir()` (`client.js:121`). Cumple el rol de los interceptores de la PPT; si llegan varias requests juntas, comparten el mismo refresh.
- **Rutas protegidas** con `Stack.Protected`, y **autorización real en el backend** (403 con `ProhibidoError`).
- El token inválido responde **401**. La PPT tiene una inconsistencia: el código del middleware devuelve 403, pero el concepto y la demo usan 401. El repo sigue el concepto.

- [x] JWT, refresh rotativo, cierre de sesión y almacenamiento seguro.
- [x] 401 y 403 bien diferenciados en el backend.
- [x] 403 en el front (ver punto 1).
- [x] **Avisar que la sesión venció**: hoy `alCerrarse` lleva al login sin explicar nada (la Guía UX lo pregunta en la pregunta guía 4).
- [x] Poder responder las preguntas de "Para pensar", por ejemplo qué pasa con el JWT al cerrar sesión: sigue siendo válido hasta 15 min, y lo que se revoca es el refresh. Están respondidas en `docs/preguntas-clase-10.md`.

**Material**
- Notebook:
  - `[DDS UTN] Clase Semana - 10 (1).pdf`: slides "Login con JWT", "Anatomía del JWT", "Buenas prácticas", "¿Dónde guardar?", "Access + Refresh token", "Interceptores", "Roles (backend)" y "Roles (front)".
  - `Laboratorio de autenticación en APIs (HTML interactivo - Semana 10)`.
  - `Resumen Clase Semana 10 (video + PPT)…`.
  - También mencionan JWT, aunque no los revisé en detalle: `clase23.m4a`, `clase_sesiones_mixtas.m4a` y `Clase  - Seguridad de la Información 2026.pptx (1).pdf`.
- Repo de la cátedra, **no está en el notebook**: [`ddso-utn/auth-example`](https://github.com/ddso-utn/auth-example) (Express, jsonwebtoken y bcryptjs).

---

## 8. Accesibilidad

**Dónde está en el notebook** (busqué en las 138 fuentes). Las dos centrales son:
- **`DDS UTN Clase 09.pdf`**: 9 pautas WCAG, con versión mal y bien, "en web y mobile".
- **`Guia práctica UX.pdf`**: secciones "Accesibilidad", "Errores Frecuentes" y "Aplicación al Trabajo Práctico".

Complementan: `UX Detective - Clicka (HTML interactivo…)`, `Cualidades de Diseño` (4.5 Usabilidad - Accesibilidad - Inclusión), `[DDS UTN] Clase Semana - 06.pdf` y `clase14.m4a`. En otras fuentes "accesible" significa disponibilidad o simplemente aparece suelta (por ejemplo `clase03.m4a`), así que no aplican.

**Traducción a mobile:** `label` → etiqueta visible más `accessibilityLabel`; `aria-*` → `accessibilityRole`, `accessibilityState`, `accessibilityHint`; `role="alert"` → `AccessibilityInfo.announceForAccessibility`; foco de teclado → foco del lector de pantalla.

**Límite de esta revisión:** salvo lo que dice "en el código", lo probé en Expo web. **Nada está confirmado todavía con VoiceOver o TalkBack en un celular.**

### Las 9 pautas de la Clase 09 contra la app

| # | Pauta | Estado | Evidencia y qué falta |
|---|---|---|---|
| 1 | Etiquetas asociadas | Parcial | `Campo` tiene etiqueta visible y `accessibilityLabel`. **Falta marcar los obligatorios** (no hay ninguno marcado). |
| 2 | Contraste | Cumple | Calculé 24 combinaciones de `theme.js` y los badges, en claro y oscuro. Texto ≥ 4,5:1 y bordes de campo ≥ 3:1. La excepción es el verde `marca` sobre fondo claro (1,6:1), usado en el logo, que WCAG exime. |
| 3 | Errores claros y asociados | Parcial | Borde, ícono y texto junto al campo. **El error no está asociado al campo:** `Campo` no lo suma a su etiqueta ni a un `accessibilityHint` (en el código). **El foco no va al primer error.** |
| 4 | Foco visible | Otra forma | El contorno de teclado es de web. En mobile importa el **orden de lectura y dónde queda el foco del lector** tras cada acción. Sin probar. |
| 5 | Semántica | Cumple | Botones, enlaces y títulos declaran su rol (`accessibilityRole`). |
| 6 | Tamaño táctil | Casi cumple | `AREA_TACTIL` 44 y botones de 52. Los chips miden 36 con `hitSlop` hasta 44 (en el código). **El campo de búsqueda mide 20 de alto:** confirmar que tocar todo el recuadro lo active. |
| 7 | Tipo de input y autocomplete | Cumple | Email, contraseña y tarjeta usan `keyboardType` y `autoComplete` (en el código). |
| 8 | Botones de solo ícono | Cumple | En la pantalla de inicio, 0 botones sin nombre. En el resto, revisado solo en el código. |
| 9 | Mensajes dinámicos | Parcial | Pago y avisos se anuncian bien. **`accessibilityLiveRegion` es solo de Android**, así que en iOS los errores de `Campo` y `AvisoError` no se anuncian. |

### Otros criterios de la Guía UX y la Clase 09

| Criterio | Estado | Evidencia y qué falta |
|---|---|---|
| No depender solo del color | Cumple | `BadgeEstado` usa color, ícono y texto; los errores llevan ícono y texto. |
| Imágenes con texto alternativo | Parcial | Las tarjetas tienen la etiqueta en el contenedor, así que la foto queda decorativa. **La foto del detalle de evento no tiene descripción** (`app/evento/[id]/index.jsx:105`). |
| Animaciones con control | Cumple | `useMovimientoReducido` y skeleton quieto. |
| Tiempos límite | Revisar | Los avisos se cierran a los 5 s (tienen cruz). Evaluar que los de error no se cierren solos. |
| Validar al salir del campo | Parcial | Hoy se valida al enviar. La Guía pide validar al salir del campo o al enviar, así que cumple lo mínimo. |
| Requisitos de contraseña a la vista | Parcial | Se muestran antes, pero no se tildan a medida que se cumplen, y la ayuda desaparece cuando hay error. |
| Acciones destructivas | Cumple | `confirmar()` pide confirmación. |
| Texto más grande | Sin probar | El equivalente mobile del zoom al 200 %: subir el tamaño de letra del sistema y ver que nada se corte. |

### Tareas
- [x] Marcar los campos obligatorios y explicar cómo se marcan.
- [x] Asociar el error al campo: sumarlo a la etiqueta o a `accessibilityHint`.
- [x] Llevar el foco del lector al primer campo con error. Se usa `AccessibilityInfo.sendAccessibilityEvent(nodo, "focus")`: en React Native 0.88, `setAccessibilityFocus` está deprecado.
- [x] Anunciar errores en iOS con `announceForAccessibility`.
- [x] Descripción de la foto del detalle de evento.
- [ ] Recorrer los flujos principales con **VoiceOver y TalkBack**: orden de lectura, nombres y anuncios. **Requiere un celular.** Lo implementado está probado con tests, pero nada de esto se escuchó en un lector real.
- [ ] Revisar con **Accessibility Inspector** (Xcode) y **Accessibility Scanner** (Android). **Requiere un celular o un simulador.**
- [ ] Probar con el tamaño de letra del sistema al máximo. **Requiere un celular.**
- [x] Sumar `eslint-plugin-react-native-a11y`, si no choca con la configuración actual (hay que justificar la dependencia). **Evaluado: choca, así que no se suma.** Su última versión pide `eslint` hasta 8 y el proyecto usa 9.

**Material**
- Notebook: los de arriba. La Clase 09 cita `Formularios-accesibles.html`, con ejemplos "en web y mobile", que **no está en el notebook**: conviene pedirlo o buscarlo en el Campus.
- Web: [Accesibilidad en React Native](https://reactnative.dev/docs/accessibility) · [Accessibility Scanner](https://support.google.com/accessibility/android/answer/6376570) · [Accessibility Inspector](https://developer.apple.com/documentation/accessibility/accessibility-inspector) · [WCAG 2.2, referencia rápida](https://www.w3.org/WAI/WCAG22/quickref/) · [Verificador de contraste](https://webaim.org/resources/contrastchecker/) · [`eslint-plugin-react-native-a11y`](https://www.npmjs.com/package/eslint-plugin-react-native-a11y)

---

## 9. Refactor de tests: Jest, integración y E2E

**Estado actual:**
- **Backend:** 202 tests en verde con **Vitest** y Supertest, en `test/unit` y `test/api` (corrí la suite el 6/11).
- **App:** **sin ningún test** y sin script `test`.
- **E2E:** no hay.

La cátedra usa **Jest con Supertest** en todo su material. Migrar el backend es casi mecánico: 20 archivos importan de `vitest` y solo hay un `vi.fn`.

**Decisión sobre E2E (6/11/2026): Cypress sobre Expo web.**
- **Por qué:** es lo que enseñó la cátedra (Clase 09 y mini clase), permite simular errores del servidor y la app ya corre en Expo web.
- **Límite:** prueba la versión web. Cubre lógica, API y flujos, pero no lo nativo, que se prueba a mano en Expo Go (lista más abajo) y se aclara en el README.
- **Alternativa:** Maestro probaría la app real, pero la cátedra no lo enseñó y falta confirmar que ande con Expo Go. Queda como mejora opcional.
- **A confirmar con la cátedra:** el video presenta los E2E como requisito "del TP" y el enunciado del TP individual no los menciona.

**Unitarios con Jest (backend)**
- [x] Cambiar Vitest por Jest con ESM. Los scripts usan `node --experimental-vm-modules node_modules/jest/bin/jest.js`, que también anda en Windows.
- [x] Reemplazar `vi.fn` por `jest.fn` con `import { jest } from "@jest/globals"`.
- [x] Actualizar cobertura, CI, `README.md` (dice 170 tests, son 202) y los `CLAUDE.md`.
- [x] Scripts `test:unit` y `test:integration`, como en CirBnb.

**Integración**
- [x] Renombrar `test/api` a `test/integracion` y mantener Supertest con el armado de la app inyectado.
- [x] Agregar los casos nuevos: idempotencia, 202 y polling del pago.

**App (hoy sin tests)**
- [x] `jest-expo` y React Native Testing Library, buscando por rol y etiqueta: de paso, verifican la accesibilidad.
- [x] Unitarios: reglas de reintento, `ApiError`, `utils/`, hooks.
- [x] Integración de pantallas con la API simulada (MSW en Jest, con `msw/node`): carga, éxito, vacío, error y 404 sin botón Reintentar.

**E2E con Cypress: preparación**
- [x] Trabajar en la rama `test/e2e-cypress` (ya creada, sin commits).
- [x] Instalar en `mobile/` con `npx expo install cypress -- --save-dev` y justificar la dependencia en el PR. Descarga un binario al instalarse.
- [x] `mobile/cypress.config.js`: `baseUrl` en `http://localhost:8081`, viewport de 375×812 y la URL de la API en `expose`, porque Cypress 16 eliminó `Cypress.env()`.
- [x] Tests en `mobile/cypress/e2e/*.cy.js` y comandos propios en `mobile/cypress/support/`.
- [x] Scripts `e2e` (`cypress run`) y `e2e:open` (`cypress open`).
- [x] Ignorar `cypress/videos` y `cypress/screenshots` en git.
- [x] Sumar `cypress/` a lint y formato: hoy solo cubren `src/`.

**E2E con Cypress: cómo se levanta y con qué datos**
- [x] Backend con `npm run dev`, que monta las rutas `/api/dev`, y Expo web en el puerto 8081.
- [x] **Subir el límite de intentos:** el backend permite 10 logins cada 15 minutos por IP, así que los E2E terminarían en 429. Correrlo con `AUTH_INTENTOS_MAXIMOS=1000`.
- [x] Antes de cada test: `POST /api/dev/reset` y `POST /api/dev/pasarela` con `disponible: true`.
- [x] Comando `cy.iniciarSesion(email)`: pide la sesión a la API y deja el refresh token en `localStorage` (`aiticketit.refreshToken`). Solo el test de login pasa por el formulario.
- [x] Usar usuarios y eventos del seed, cuidando que quien compra no sea quien organiza (si no, la pantalla muestra "Gestionar evento"). Revisar qué tarjetas trae cada usuario.

**E2E con Cypress: flujos**

| Archivo | Flujo | Qué verifica |
|---|---|---|
| `auth.cy.js` | Login correcto | Llega al inicio y saluda por el nombre |
| `auth.cy.js` | Contraseña incorrecta | Se ve el error y sigue en `/login` |
| `auth.cy.js` | Registro con datos inválidos | Mensaje junto a cada campo |
| `compra.cy.js` | Buscar → detalle → reservar → pagar (CU3 y CU12) | "Pago confirmado" y compra `Confirmada` |
| `cancelacion.cy.js` | Cancelar una compra pagada (CU7) | Acepta la confirmación, queda `Reembolsada` y vuelve el cupo |
| `organizador.cy.js` | Crear evento y ver sus compras (CU4 y CU2) | El evento aparece y muestra las compras |
| `chat.cy.js` | Mensaje de ida y vuelta (CU5 y CU6) | Una respuesta enviada por API aparece sola, por el polling |
| `pasarela.cy.js` | Pasarela apagada | Aviso "No pudimos cobrar", compra `Pendiente`; al volver la pasarela, el pago sale |
| `errores.cy.js` | 500 simulado con `cy.intercept` | Mensaje de error; Reintentar carga los datos al quitar el error |
| `errores.cy.js` | Sin red (`forceNetworkError`) | Mensaje de sin conexión con Reintentar |
| `errores.cy.js` | Evento inexistente | Mensaje, **sin Reintentar y sin UUID**, y se puede volver |
| `errores.cy.js` | Ruta inexistente | Pantalla en español de `+not-found` |

- [x] Implementar `auth.cy.js`.
- [x] Implementar `compra.cy.js`.
- [x] Implementar `cancelacion.cy.js`.
- [x] Implementar `organizador.cy.js`.
- [x] Implementar `chat.cy.js`.
- [x] Implementar `pasarela.cy.js`.
- [x] Implementar `errores.cy.js`. **Los dos últimos casos hoy fallarían:** dependen del punto 1, así que conviene arreglar eso antes o dejarlos con `it.skip` hasta entonces.
- [x] Cuando esté el punto 4, adaptar `compra.cy.js` al polling, esperando el resultado por condición.

**E2E con Cypress: reglas**
- [x] Selectores por lo que ve la persona: `cy.contains`, `[aria-label="…"]` e `input[aria-label="Email"]`. `testID` (genera `data-testid`) solo si eso no alcanza. Nada de `nth-child` ni clases.
- [x] Sin `cy.wait(ms)`: aserciones que reintentan, con un `timeout` mayor donde hace falta. Por ejemplo, un error tarda en verse porque React Query reintenta antes.
- [x] Un solo motivo para fallar por test, con camino feliz y casos borde separados.
- [x] Comprobar el texto de `window.confirm` con `cy.on`. Cypress lo acepta solo, pero ese camino es exclusivo de web.

**E2E con Cypress: cierre**
- [x] Sumar un job `e2e` a `.github/workflows/ci.yml`: exportar la web con `npx expo export --platform web`, servir `dist`, levantar el backend, esperar a `/api/health`, correr `cypress run` y guardar las capturas si falla. Corre en GitHub Actions. Las primeras corridas fallaron de a ratos en `compra.cy.js`: Cypress desplaza el elemento antes de hacer clic y, en `react-native-web`, cualquier scroll de una lista con `keyboardDismissMode="on-drag"` le saca el foco al input. Cypress lo informa, de forma engañosa, como "disabled element". Se corrigió con `scrollBehavior: false` al escribir en el buscador.
- [x] Documentar en `README.md` y `CLAUDE.md` cómo se corren y qué no cubren.
- [x] Correr la suite 3 veces seguidas sin fallas aleatorias. Tres corridas seguidas sobre el `dist`: 19 de 19 en cada una.
- [x] Romper algo a propósito y ver que falle el test correcto ("un test es efectivo cuando falla", dice el video). Con Reintentar siempre visible en `EstadoError` fallan justo los 2 tests que corresponden: el 404 y el 403.

**Lo que había que confirmar al implementar:**
- Cypress se instala bien y sus clics activan los `Pressable` de React Native Web: **sí**.
- `AUTH_INTENTOS_MAXIMOS` definido al lanzar el backend le gana a `.env.example`: **sí**. La suite hace más de 10 logins y no termina en 429.
- `/evento/<id>` y las demás rutas abren directo sobre el `dist` exportado: **con `expo serve`, no** (responde 404). Por eso está `npm run e2e:servir`, un servidor sin dependencias que cae en `index.html`.

**Lo que Cypress no cubre: prueba manual en Expo Go**
- [ ] Token en SecureStore: cerrar y reabrir la app sin perder la sesión.
- [ ] Diálogo nativo de confirmación (`Alert`).
- [ ] Hoja de pago con el teclado abierto y botón "atrás" de Android durante el cobro.
- [ ] Selector de fecha nativo al crear un evento.
- [ ] Vibración al confirmar el pago.
- [ ] Pasarlo en un celular o simulador iOS y en Android.

**Qué tomar de cada material de la cátedra.** Los ejemplos son de web, pero los criterios de la Clase 09 se trasladan. La mini clase es más básica y en esto conviene no seguirla:

| Tema | Mini clase de Cypress | Clase 09 (recomendado) |
|---|---|---|
| Selectores | CSS y `nth-child` | Por lo que ve la persona, y un id de prueba como contrato (`data-cy` en sus ejemplos; acá, `testID`). |
| Esperas | `cy.wait` de 30 s | Sin esperas fijas: son el origen de los tests flaky. |

**Material**
- Notebook:
  - `DDS UTN Clase 09.pdf`: anatomía del test, ejemplo con Cypress, camino triste, servidor caído, flaky, selectores y buenas prácticas.
  - `Mini Clase - Introducción a E2E con Cypress - Video (transcripción)` y su resumen: instalación, interfaz, modo headless, pirámide del testing y por qué los datos de prueba vuelven frágiles a los E2E.
  - `[DDS UTN] Clase Práctica - 5 - testing y documentacion.pptx`: Jest, mocking y Supertest.
  - `[DDS UTN] Clase Semana - 04 - Parte II.pdf`: Jest, Triple A y mutation testing.
  - `[DDS UTN] Clase Semana - 10 (1).pdf`: slide "MSW" (los handlers sirven; `setupWorker` es de navegador).
  - `[DDS UTN] Clase Semana - IA en desarrollo.pdf`: tests como criterio de aceptación.
- Repos de la cátedra:
  - [`ejercicio-megasuper-2026`, rama `clase6-testing`, carpeta `tests/`](https://github.com/ddso-utn/ejercicio-megasuper-2026/tree/clase6-testing/tests): `unitarios/`, `integracion/productos.test.js` y `integracion/utils/buildApp.js`.
  - [`clase-cirbnb`, rama `testing-documentacion`, carpeta `packages/backend/test`](https://github.com/ddso-utn/clase-cirbnb/tree/testing-documentacion/packages/backend/test): `unit/` e `int/`, con scripts separados en su `package.json`.
  - **Ninguna rama de esos dos repos tiene Cypress** (revisé todas): la referencia es la Clase 09 y el video.
- Web: [Jest y ESM](https://jestjs.io/docs/ecmascript-modules) · [Tests con Jest en Expo](https://docs.expo.dev/develop/unit-testing/) · [Tests con Expo Router](https://docs.expo.dev/router/reference/testing/) · [React Native Testing Library](https://callstack.github.io/react-native-testing-library/) · [Buenas prácticas de Cypress](https://docs.cypress.io/app/core-concepts/best-practices) · [`cy.intercept`](https://docs.cypress.io/api/commands/intercept) · [`cy.viewport`](https://docs.cypress.io/api/commands/viewport) · Opcional: [Maestro con React Native](https://docs.maestro.dev/get-started/supported-platform/react-native)

---

## 10. Guía práctica UX: lista de control para todo el front

Fuente: `Guia práctica UX.pdf`, sección "Aplicación al Trabajo Práctico". La Guía aclara que no hace falta resolver todo, pero que cada decisión debe poder justificarse pensando en la persona usuaria.

**Checklist de revisión de la Guía**
- [x] Contraste mínimo de 4,5:1 en textos y botones.
- [x] Cada campo con etiqueta visible **y obligatorios indicados** (falta lo segundo).
- [x] Errores junto al campo, con qué pasó y cómo resolverlo. Falta aplicarlo a los errores de API del punto 1 (UUID en el 404).
- [x] Feedback en cada acción importante (cargando, éxito, error).
- [ ] Recorrer la app con VoiceOver y TalkBack (reemplaza a "navegar con teclado", que es de web). **Requiere un celular.**
- [x] Imágenes informativas con texto alternativo (falta el detalle de evento).
- [x] Componentes similares iguales en toda la app (`components/ui/`).
- [x] Acciones destructivas con confirmación.
- [ ] **Probar el flujo con al menos una persona externa** al proyecto. Guion en `docs/ux.md`.

**Preguntas guía y entregables de UX**
- [x] Escribir la **User Persona** del comprador y, si suma, del organizador. En `docs/ux.md`, como hipótesis sin entrevistas.
- [x] Escribir el **POV**: "[Persona] necesita [necesidad] porque [insight]". En `docs/ux.md`.
- [x] Revisar el camino más corto para comprar: ¿qué pasos se pueden eliminar? En `docs/ux.md`: se puede eliminar un toque de "Pagar". Queda como propuesta.
- [ ] Prueba de usabilidad rápida: una tarea concreta, pensar en voz alta y observar sin ayudar. Registrar hallazgos por severidad (crítica, alta, media, baja). **Requiere una persona externa.** El guion y la tabla están en `docs/ux.md`.
- [x] Recorrer las pantallas con las **10 heurísticas**, de a una por vez. En `docs/ux.md`, sobre el código y capturas en Expo web.
- [ ] Hacer el ejercicio `UX Detective` y anotar qué errores aparecían en este proyecto. La comparación está en `docs/ux.md`, con la lista del notebook; **falta hacer el ejercicio interactivo**.

**Flujos de la Guía aplicados a la app**
- [x] Registro: pide lo necesario, teclado correcto, permite ver la contraseña.
- [x] Registro: tildar los requisitos de la contraseña a medida que se cumplen.
- [x] Perfil: confirma "Guardamos tus datos." y las tarjetas muestran solo los últimos 4 dígitos.
- [ ] Búsqueda y filtros: verificar roles y orden de lectura con el lector de pantalla. **Requiere un celular.**
- [ ] Notificaciones: la app no las tiene (backlog). Si se suman, aplicar esa sección de la Guía. **No aplica por ahora.**

**Material**
- Notebook: `Guia práctica UX.pdf`, `UX Detective - Clicka (HTML interactivo…)`, `[DDS UTN] Clase Semana - 06.pdf`.
- Web: [10 heurísticas de Nielsen](https://www.nngroup.com/articles/ten-usability-heuristics/) · [Verificador de contraste](https://webaim.org/resources/contrastchecker/)

---

## Descartado por ser solo de web

La app es mobile, así que esto queda afuera aunque aparezca en el material de la cátedra:

- **Herramientas de test:** `cypress-axe`, Playwright, `@axe-core/playwright`, `jest-axe`.
- **Auditoría:** Lighthouse, axe DevTools, WAVE, `eslint-plugin-jsx-a11y`.
- **Componentes:** `antd`, `antd-mobile`, Material UI, React Bootstrap, Radix UI, React Aria, Headless UI.
- **Pautas de HTML:** navegación con Tab y `:focus-visible`, `<html lang>`, `<main>`, `<label htmlFor>`, `aria-invalid`, `aria-describedby`, `role="alert"`.
- **Red y sesión:** CORS y preflight (no aplican a una app nativa), `localStorage` y cookies para el token (la app usa SecureStore).
- **Mocks:** `setupWorker` de MSW.

Expo web sigue siendo un atajo para mirar la interfaz mientras se desarrolla (`CLAUDE.md`, decisión 7) y es donde corren los E2E con Cypress. No sirve como prueba de accesibilidad ni de lo nativo.

---

## Repos del notebook que no aplican

Los repos de React de la cátedra son de web: de ellos sirve la lógica, no los componentes ni el HTML.

- `dds-utn/gestion-alumnos-*` y `dds-utn/smartlife`: son de DSI y están en Java.
- `ddso-utn/megasuper-2c-2026`: solo tiene las clases 3 y 4, de backend.
- `ddso-utn/ejercicio-megasuper-2026`, ramas `clase9`, `clase10` y `clase11-react-context-carrito`: sirven de base de React, Hooks y Context, pero no cubren ninguno de estos puntos en particular.
