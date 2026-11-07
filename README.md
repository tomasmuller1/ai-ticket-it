# AI Ticket It

Plataforma para publicar eventos y vender entradas: los organizadores crean eventos con distintos tipos de entrada y siguen sus ventas; los compradores buscan, compran, chatean con el organizador y reseñan lo que vieron.

Trabajo Práctico Individual de Desarrollo con IA — Diseño de Sistemas de Información, UTN FRBA, 2C 2026.

<p>
  <img src="docs/capturas/02-explorar.jpg" width="160" alt="Explorar eventos" />
  <img src="docs/capturas/03-evento.jpg" width="160" alt="Detalle de evento" />
  <img src="docs/capturas/04-comprar.jpg" width="160" alt="Comprar entradas" />
  <img src="docs/capturas/06-entrada.jpg" width="160" alt="Entrada confirmada" />
  <img src="docs/capturas/07-chat.jpg" width="160" alt="Chat con el organizador" />
</p>

## Empezar en 5 minutos

Requisitos: Node 22.9 o superior y la app **Expo Go** en el celular, conectado al mismo Wi-Fi que la computadora.

```bash
cd backend && npm install && npm run dev
```

```bash
cd mobile && npm install && npx expo start
```

Escaneá el QR con la cámara (iOS) o con Expo Go (Android) e iniciá sesión con un usuario de prueba. La app encuentra sola la IP de la computadora; para usar otra URL, copiá `mobile/.env.example` a `mobile/.env.local`.

| Usuario                                            | Para probar                                          |
| -------------------------------------------------- | ---------------------------------------------------- |
| `sofia@aiticketit.com`, `valentina@aiticketit.com` | Comprar, chatear, cancelar, reseñar                  |
| `lucia@aiticketit.com`, `martin@aiticketit.com`    | Gestionar eventos, validar entradas, responder chats |
| `tomas@aiticketit.com`                             | Las dos cosas                                        |

Contraseña de todos: `aiticketit123`.

La API está documentada con **Swagger** en http://localhost:3000/api/docs: hacé `POST /api/auth/login`, copiá el `accessToken` y pegalo en **Authorize**. `POST /api/dev/reset` restaura los datos de ejemplo.

> La persistencia es **en memoria** (lo pide el enunciado): todos los dispositivos comparten los datos a través del backend, pero al reiniciarlo se vuelven a cargar los datos de ejemplo y se cierran las sesiones.

> En producción (`NODE_ENV=production`, o sin `NODE_ENV`) la API exige `JWT_SECRET` y `CORS_ORIGINS`, no expone Swagger ni `/api/dev` y arranca solo con las categorías: los usuarios de ejemplo no existen. Ver `backend/.env.example`.

### Inicio de sesión con Google (opcional)

1. En [Google Cloud Console](https://console.cloud.google.com/apis/credentials) creá un ID de cliente OAuth de tipo **Aplicación web** con origen y URI de redirección `http://localhost:8081`.
2. Poné ese ID en `backend/.env` como `GOOGLE_CLIENT_IDS` y en `mobile/.env.local` como `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, y reiniciá los dos.
3. El botón "Continuar con Google" aparece en el login web. En el celular necesita una development build con un ID de cliente de iOS (`EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`): Expo Go no puede volver del login de Google.

## Casos de uso

| CU   | Descripción                                                              | API | App |
| ---- | ------------------------------------------------------------------------ | :-: | :-: |
| CU1  | Ver mis compras con su estado y los días que faltan (si está confirmada) | ✅  | ✅  |
| CU2  | Organizador: compras de un evento y entradas disponibles por tipo        | ✅  | ✅  |
| CU3  | Buscar eventos por texto o explorarlos por categoría                     | ✅  | ✅  |
| CU4  | Crear un evento con distintos tipos de entrada (precio y cupo)           | ✅  | ✅  |
| CU5  | Comprador: chat dentro de la compra                                      | ✅  | ✅  |
| CU6  | Organizador: responder el chat de la compra                              | ✅  | ✅  |
| CU7  | Cancelar una compra y obtener el reembolso                               | ✅  | ✅  |
| CU8  | Solo se cancela si no está _utilizada_ y el evento no se realizó         | ✅  | ✅  |
| CU9  | Con la entrada utilizada, puntuar el evento y comentar                   | ✅  | ✅  |
| CU10 | Ver las reseñas de eventos anteriores de cada organizador                | ✅  | ✅  |
| CU11 | Ordenar por precio, fecha y puntaje del organizador                      | ✅  | ✅  |
| CU12 | Comprar eligiendo tipo de entrada y cantidad, sin superar el cupo        | ✅  | ✅  |
| —    | Favoritos                                                                | ✅  | ✅  |
| —    | Registro e inicio de sesión (JWT)                                        | ✅  | ✅  |
| —    | Inicio de sesión con Google y edición del perfil                         | ✅  | ✅  |
| —    | Tarjetas guardadas y pago con la pasarela simulada                       | ✅  | ✅  |

## Arquitectura

```mermaid
flowchart LR
  App["App móvil<br/>Expo + Expo Router<br/>TanStack Query"] -- "HTTP + JWT" --> Rutas
  subgraph Backend["Backend (Node + Express 5)"]
    Rutas["Rutas<br/>validación Zod + Swagger"] --> Controllers --> Services
    Services --> Dominio["Dominio<br/>(reglas de negocio)"]
    Services --> Repos["Repositorios<br/>en memoria"]
    Services --> Pasarela["PasarelaPagos<br/>(Adapter, fake)"]
  end
```

- **Capas**: rutas → controllers → services → dominio → repositorios. Los controllers no tienen reglas; el dominio no sabe de HTTP. Las dependencias se arman a mano en `backend/src/app.js`, y los tests las reemplazan (reloj fijo, repositorios vacíos, pasarela que falla).
- **Patrones**:
  - **State**: cada estado de la compra (`domain/estados/`) define qué transiciones permite.
  - **Strategy**: el orden de la búsqueda por fecha, precio o puntaje (`domain/OrdenEventos.js`).
  - **Adapter**: la pasarela de pagos (`infra/PasarelaPagosFake.js`), reemplazable por un proveedor real. Si no responde, la app lo avisa sin bloquear el resto; en desarrollo se apaga desde el perfil para probarlo.
- **Pagos**: el cobro es asincrónico, como con una pasarela real. `POST /compras/:id/pago` responde 202 con un `operacionId` y la app consulta el resultado con polling. El header `Idempotency-Key` evita el doble cobro cuando se pierde una respuesta: repetir la clave devuelve lo mismo sin volver a cobrar. Si no se sabe qué pasó, la app consulta la compra antes de decir nada, y si se cierra durante el cobro lo retoma al volver a abrirse. Para probar un rechazo se usa la tarjeta `4000 0000 0000 0002`.
- **Reservas**: el cupo se toma al reservar y la reserva dura 15 minutos (`RESERVA_PLAZO_MINUTOS`). A esa hora la app deja de ofrecer Pagar, sin decir todavía que venció, porque un pago que ya venía en camino se sigue aceptando. Entre 1 y 2 minutos después el sistema cancela la reserva y libera las entradas. Con un pago en proceso no vence, y un rechazo da 5 minutos más para reintentar.
- **Autenticación**: contraseñas con bcrypt, access token JWT de 15 minutos y refresh token opaco de 30 días que rota en cada uso (si se reutiliza, se revoca la sesión). Rate limit en login y registro.
- **Calidad**: tests unitarios y de integración con Jest (Supertest en el backend; React Native Testing Library y MSW en la app), E2E con Cypress, ESLint, Prettier y CI de GitHub Actions para el backend y la app.

### Tests de punta a punta

Los E2E usan **Cypress sobre Expo web**, como enseña la cátedra: permite simular errores del servidor y la app ya corre en web. Cubren la lógica, la API y los flujos, pero prueban la versión web. Para correrlos:

```bash
cd backend && AUTH_INTENTOS_MAXIMOS=1000 npm run dev   # en una terminal
cd mobile && npx expo start --web --port 8081          # en otra
cd mobile && npm run e2e                               # en una tercera
```

**Lo que Cypress no cubre** se prueba a mano en Expo Go, en iOS y en Android:

- Token en SecureStore: cerrar y reabrir la app sin perder la sesión.
- Diálogo nativo de confirmación (`Alert`).
- Hoja de pago con el teclado abierto y botón "atrás" de Android durante el cobro.
- Cerrar la app durante un pago y ver que, al abrirla, avisa el resultado.
- Selector de fecha nativo al crear un evento.
- Vibración al confirmar el pago.
- VoiceOver y TalkBack: orden de lectura, nombres, anuncios y foco en el primer error.
- Letra del sistema al máximo: que nada se corte.
- Al reservar, la hoja de pago sube sola. Probar varias reservas seguidas en iOS y en Android: que se vea siempre, que el botón Pagar de la compra la vuelva a abrir, y adónde va el foco del lector.
- En Nuevo evento, al fallar, la pantalla se desplaza hasta el primer error. Probar en iOS y Android, con el teclado abierto, con VoiceOver y TalkBack y con la letra al máximo.

### Técnicas de sincronismo

La regla de la cátedra es empezar por polling y subir de nivel solo si la latencia o la carga lo justifican.

| Parte de la app                        | Técnica                                                               | Por qué                                                                                                                                                                               |
| -------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Resultado de un pago                   | Polling cada 2 s, con máximo de intentos                              | Es una espera corta y con final. Frena al resolverse, y si se agotan los intentos la app lo dice en lugar de dejar a la persona esperando.                                            |
| Chat (CU5 y CU6)                       | Polling cada 3 s, solo con la pantalla abierta                        | La PPT sugiere WebSockets para un chat, pero acá son mensajes esporádicos entre dos personas: un atraso de 3 s no molesta y no hay carga que justifique mantener conexiones abiertas. |
| Mis entradas y compras del organizador | Refresco al volver a la pantalla, y polling si hay un pago en proceso | Los estados cambian poco. Solo vale la pena consultar seguido cuando se está esperando algo concreto.                                                                                 |
| Reserva sin pagar, en la compra        | Consulta a la hora límite y cada 30 s con el plazo cumplido           | La app pregunta cuando algo cambia, sin calcular el plazo por su cuenta. Con el reloj del celular corrido, nunca consulta más seguido que cada 5 s ni espera más de 1 minuto.         |
| Entradas disponibles al comprar        | Datos siempre frescos al abrir, y refresco ante `SIN_CUPO`            | El cupo se valida en el backend al reservar, así que un dato un poco viejo no permite sobrevender: como mucho, el error se ve un paso después.                                        |
| Server-Sent Events                     | No se usa                                                             | `EventSource` no permite headers propios (la app usa un bearer token) y React Native no lo trae incorporado.                                                                          |
| WebSockets                             | No se usa                                                             | Queda como mejora si el chat creciera: suma una conexión por persona y reconexión manual, sin una necesidad que lo pague hoy.                                                         |

### Dominio

```mermaid
classDiagram
  class Usuario { nombre; apellido; email; favoritos }
  class Evento { nombre; descripcion; fecha; lugar; multimedia; tuPrecioEstaEntre(min, max) }
  class Categoria { nombre; descripcion }
  class TipoEntrada { nombre; precio; cupo; hayCupoPara(cantidad); reservar(); liberar() }
  class Compra { cantidad; total; estado; pagar(); cancelar(); marcarUtilizada(); reseniar() }
  class EstadoCompra { <<State>> Pendiente; Confirmada; Utilizada; Cancelada; Reembolsada }
  class CambioEstadoCompra { estado; quien; fechaHora }
  class Mensaje { mensaje; enviado }
  class Resenia { puntuacion; detalle }
  Evento --> Categoria
  Evento --> "1..*" TipoEntrada
  Evento --> Usuario : organizador
  Compra --> Usuario : comprador
  Compra --> Evento
  Compra --> TipoEntrada
  Compra --> EstadoCompra
  Compra --> "*" CambioEstadoCompra : historial
  Compra --> "*" Mensaje : chat
  Compra --> "0..1" Resenia
```

Estados de una compra: `PENDIENTE` → `CONFIRMADA` → `UTILIZADA`, o `CANCELADA` (→ `REEMBOLSADA` si estaba paga). Las reglas completas están en [`backend/CLAUDE.md`](backend/CLAUDE.md).

## Estructura

```
ai-ticket-it/
├── backend/
│   ├── src/
│   │   ├── app.js            # arma Express e inyecta dependencias
│   │   ├── routes/           # endpoints + documentación OpenAPI
│   │   ├── controllers/      # HTTP → service → DTO
│   │   ├── services/         # casos de uso
│   │   ├── domain/           # entidades y reglas (estados/ con el patrón State)
│   │   ├── repositories/     # persistencia en memoria
│   │   ├── auth/             # JWT, refresh tokens, bcrypt
│   │   ├── schemas/  dtos/  errors/  middlewares/  infra/  data/
│   └── test/                 # unit/ (dominio, servicios) y api/ (endpoints)
├── mobile/
│   └── src/
│       ├── app/              # pantallas (Expo Router: cada archivo es una ruta)
│       ├── components/       # ui/ = componentes base del sistema de diseño
│       ├── hooks/            # TanStack Query por recurso
│       ├── api/  context/  utils/
│       └── theme.js          # tokens de diseño (claro y oscuro)
└── docs/capturas/
```

## Comandos

| Qué                        | Dónde                  | Comando                                             |
| -------------------------- | ---------------------- | --------------------------------------------------- |
| API con recarga al guardar | `backend/`             | `npm run dev`                                       |
| Tests y cobertura          | `backend/`             | `npm test` / `npm run coverage`                     |
| Tests por tipo             | `backend/` y `mobile/` | `npm run test:unit` / `npm run test:integration`    |
| Tests de la app            | `mobile/`              | `npm test`                                          |
| E2E (Cypress)              | `mobile/`              | `npm run e2e` (ver "Tests de punta a punta")        |
| Lint y formato             | `backend/` y `mobile/` | `npm run lint` / `npm run format`                   |
| App                        | `mobile/`              | `npx expo start` (`w` para abrirla en el navegador) |

## Pendiente

- Escanear el QR de la entrada para validarla.
- Chat en tiempo real (SSE o WebSocket) en lugar de consultar cada 3 segundos.
- Notificaciones push, subir imágenes, base de datos real y deploy.
