# Mobile: AI Ticket It

@AGENTS.md

Expo SDK 58 + Expo Router, JavaScript. Corre en el celular con Expo Go y en el navegador con Expo web (para verificar la UI).

## Estructura de `src/`

- `app/`: rutas de Expo Router. Cada archivo es una pantalla y los `_layout.jsx` definen la navegación. Acá no va lógica reutilizable.
- `components/`: componentes de UI reutilizables.
- `api/client.js`: único punto de acceso al backend (URL base, headers, errores). Las pantallas nunca llaman a `fetch` directamente.
- `api/endpoints.js`: un método por endpoint. `api/almacenamiento.js`: refresh token en SecureStore (localStorage en web).
- `context/SesionContext.jsx`: sesión (`useSesion()`): login, registro, logout y restauración al abrir la app. El access token vive solo en memoria y se renueva solo ante un 401.
- Navegación: `app/_layout.jsx` protege las rutas con `Stack.Protected` (login/registro sin sesión, `(tabs)` con sesión).
- `components/ui/`: componentes base (`Texto`, `Boton`, `Campo`, `Chip`, `BadgeEstado`, `Estrellas`, `Stepper`, `Skeleton`, `EstadoVacio`, `EstadoError`). Usarlos antes de crear algo nuevo.
- Datos: TanStack Query (`useQuery` / `useMutation`) sobre `api`. Toda lectura le pasa el `signal` a `api` (`queryFn: ({ signal }) => api.x({ signal })`), para cancelar lo que ya nadie espera. No se persiste la caché en disco: no suma para el TP y arriesga mostrar datos viejos.
- `theme.js`: tokens de diseño (colores, tipografía, espaciados, radios). **No usar colores ni tamaños sueltos en los estilos.**

## Tests

- `npm test` (`test:unit`, `test:integration`, `coverage`): Jest con `jest-expo`, React Native Testing Library y MSW. Viven en `test/`, porque todo lo que está en `src/app/` es una ruta.
- `test/helpers/servidor.js` es la API simulada (`servidor.use(http.get(...))`). Una request sin handler hace fallar el test. No mockear `api/client`: las pruebas hacen HTTP real contra MSW, así también ejercitan el cliente.
- `test/helpers/render.jsx`: `renderConProveedores(<Pantalla />)` monta el componente con el tema, la caché y los avisos. En RNTL 14 `render` y `fireEvent` son asíncronos: siempre con `await`.
- Buscar por rol y etiqueta (`getByRole("button", { name })`, `getByLabelText`), no por `testID`: de paso, se verifica la accesibilidad.
- Node tiene que correr con `--experimental-vm-modules` (ya está en los scripts): las dependencias de MSW se publican solo como ESM.

## Reglas

- Instalar paquetes **solo** con `npx expo install <paquete>`, y antes verificar que funcionen en Expo Go (sin código nativo propio).
- El proyecto es JavaScript: de `AGENTS.md` no aplica `npx tsc --noEmit`. Antes de dar algo por terminado: `npm test` y `npm run lint` (ESLint con `eslint-config-expo`).
- Dirección de diseño: tinta sobre papel. La interfaz no lleva color (la acción principal es tinta, `colores.acento`); el color lo ponen las fotos y la entrada impresa. El verde del logo del TP (`colores.marca`) va solo en detalles: el logo (`components/Marca.jsx`), el ícono de la pestaña activa, la marca de entrada válida, el tilde del pago confirmado y los avisos de éxito; nunca como texto sobre fondo claro (no llega al contraste). Una sola familia tipográfica en dos anchos: Sofia Sans para leer y Sofia Sans Extra Condensed (`fuentes.afiche`, variantes `display` y `titulo`) para títulos y nombres de eventos. Sin etiquetas en mayúsculas sobre los títulos (excepciones pedidas por el usuario: la frase del logo, "ENTRADAS A UN CLICK", y la categoría y el mes en las tarjetas de eventos), sin unir datos con " · " (fecha y lugar en líneas distintas), superficies separadas por un escalón de tono (no por bordes ni sombras), radios de 8 o redondos completos (las fotos de eventos van en `radio.foto`, 16).
- Tema: la persona elige Automático, Claro u Oscuro en su perfil (`TemaProvider`, `useTema().elegirTema`); se recuerda entre aperturas. Claro es crema con una gota de beige y oscuro es carbonilla: no usar blanco puro ni negro puro de fondo.
- La barra de pestañas va pegada abajo y es clara (`components/BarraNavegacion.jsx`); ocupa su propio lugar, pero toda lista de una pestaña deja `useEspacioBarra()` de padding abajo.
- Si el backend no responde al abrir la app, la sesión no se da por cerrada: se muestra "No pudimos conectarnos" con Reintentar (`estado === "sinConexion"` en `SesionContext`).
- Avisos: para contar algo que pasó sin interrumpir (un servicio caído, una tarjeta guardada) se usa `useAvisos().avisar({ tipo, titulo, mensaje })` (`components/Avisos.jsx`): sale abajo, con una barrita que muestra cuánto le queda y una cruz para cerrarlo; los de error no se cierran solos. No usar `Alert` para errores. Un `Modal` tapa los avisos: dentro de una hoja, mostrar el error en la hoja o cerrarla antes de avisar.
- Errores: `api/reintentos.js` decide qué se reintenta solo (sin conexión, timeout, 5xx y 429, con backoff y `Retry-After`) y `utils/errores.js`, qué ve la persona. `EstadoError` solo muestra Reintentar si repetir puede cambiar el resultado, aunque la pantalla le pase `onReintentar`; `recurso` ajusta el texto de 403 y 404, y `onVolver` da una salida en pantallas a las que se llega con un enlace. Para una carga fallida usar `isLoadingError`, no `isError`: si falla un refresco, los datos que ya estaban en pantalla se quedan.
- Accesibilidad de formularios: los campos requeridos llevan `obligatorio` (se ven con `*`, con `LeyendaObligatorios` arriba, y el lector oye "obligatorio"). `useFocoEnError` lleva el foco del lector al primer error al enviar: `ref={refDe("campo")}` en cada `Campo` y `enfocarErrores(errores)` al fallar. `Campo` ya asocia el error y la ayuda al input. Un skeleton va dentro de `BloqueCargando` con una `etiqueta`. Para anuncios: `anunciarEnIOS` (en Android alcanza con `accessibilityLiveRegion`).
- Si falla un servicio del que depende una acción (por ejemplo, la pasarela de pagos), se avisa y el resto de la app sigue funcionando. El pago es `components/HojaPago.jsx`: hoja cautiva que sube desde abajo, con la tarjeta elegida, un anillo mientras cobra y un tilde verde al confirmar.
- Pago: `hooks/pago.js`. `useProcesoDePago` manda una `Idempotency-Key` por intención de pago (la misma en cada reintento), hace polling de la operación con `refetchInterval` (`siguienteConsultaPago`, con máximo de intentos) y, si se pierde la respuesta, consulta la compra antes de decir nada: nunca informar que un pago falló sin saberlo. El pago en curso se guarda en `almacenamiento`; `components/RetomarPago.jsx` lo retoma al abrir la app.
- La lógica de negocio vive en el backend. La app muestra lo que devuelve la API (por ejemplo, las acciones permitidas de una compra) y no recalcula reglas.
- Textos en español rioplatense, claros y cortos.

## Checklist de cada pantalla

- [ ] Estados de carga (skeleton o spinner), vacío y error (con opción de reintentar).
- [ ] Funciona si el backend está caído o lento.
- [ ] Accesibilidad: `accessibilityLabel` en elementos táctiles sin texto, área táctil ≥ 44 pt, contraste suficiente.
- [ ] Verificada en Expo web (ancho de celular) y confirmada en Expo Go.
