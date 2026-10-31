# AI Ticket It

Plataforma de publicación de eventos y venta de entradas.
Trabajo Práctico Individual de Desarrollo con IA — Diseño de Sistemas de Información, UTN FRBA, 2C 2026.

## Stack

| Módulo     | Tecnología                                                                      |
| ---------- | ------------------------------------------------------------------------------- |
| `backend/` | Node.js + Express 5 (API REST documentada con Swagger, persistencia en memoria) |
| `mobile/`  | React Native (Expo), ejecutable en un dispositivo móvil                         |

## Estructura

```
ai-ticket-it/
├── backend/
│   ├── src/
│   │   ├── app.js           # arma Express e inyecta dependencias
│   │   ├── server.js        # punto de entrada
│   │   ├── routes/          # endpoints
│   │   ├── controllers/     # HTTP → servicio
│   │   ├── services/        # casos de uso y reglas de negocio
│   │   ├── repositories/    # persistencia en memoria
│   │   ├── domain/          # Evento, TipoEntrada, ...
│   │   ├── dtos/            # forma de las respuestas JSON
│   │   ├── schemas/         # validación con Zod + documentación OpenAPI
│   │   ├── infra/           # config, logs, Swagger, reloj, autenticador
│   │   ├── errors/  middlewares/  data/
│   └── test/                # Vitest + Supertest (unit/ y api/)
└── mobile/
    └── src/
        ├── app/             # pantallas (Expo Router: cada archivo es una ruta)
        ├── components/
        └── api/client.js    # llamadas al backend
```

## Casos de uso

| CU   | Descripción                                                              | API | App |
| ---- | ------------------------------------------------------------------------ | :-: | :-: |
| CU1  | Ver mis compras con su estado y los días que faltan (si está confirmada) | ✅  | ✅  |
| CU2  | Organizador: compras de un evento y entradas disponibles por tipo        | ✅  | ⬜  |
| CU3  | Buscar eventos por texto o explorarlos por categoría                     | ✅  | ✅  |
| CU4  | Crear un evento con distintos tipos de entrada (precio y cupo)           | ✅  | ⬜  |
| CU5  | Comprador: chat dentro de la compra                                      | ✅  | ✅  |
| CU6  | Organizador: responder el chat de la compra                              | ✅  | ⬜  |
| CU7  | Cancelar una compra y obtener el reembolso                               | ✅  | ✅  |
| CU8  | Solo se cancela si no está _utilizada_ y el evento no se realizó         | ✅  | ✅  |
| CU9  | Con la entrada utilizada, puntuar el evento y comentar                   | ✅  | ✅  |
| CU10 | Ver las reseñas de eventos anteriores de cada organizador                | ✅  | ✅  |
| CU11 | Ordenar por precio, fecha y puntaje del organizador                      | ✅  | ✅  |
| CU12 | Comprar eligiendo tipo de entrada y cantidad, sin superar el cupo        | ✅  | ✅  |
| —    | Favoritos                                                                | ✅  | ✅  |
| —    | Autenticación real (JWT)                                                 | ✅  | ✅  |

Estados de una compra: `PENDIENTE` → `CONFIRMADA` → `UTILIZADA` / `CANCELADA` → `REEMBOLSADA`.

## Cómo correrlo

Requisitos: Node 22.9+ y la app **Expo Go** en el celular, conectado a la misma red Wi-Fi que la computadora.

**Backend** (puerto 3000):

```bash
cd backend
npm install
cp .env.example .env   # opcional
npm run dev            # se reinicia solo al guardar
npm test               # tests (npm run coverage para cobertura)
npm run lint
```

La documentación interactiva de la API (Swagger) queda en **http://localhost:3000/api/docs**. Para probar los endpoints protegidos: `POST /api/auth/login` con un usuario de ejemplo, copiar el `accessToken` y pegarlo en **Authorize**.

Usuarios de ejemplo (contraseña `aiticketit123`): `sofia@aiticketit.com` y `valentina@aiticketit.com` (compradoras), `lucia@aiticketit.com` y `martin@aiticketit.com` (organizadores), `tomas@aiticketit.com` (compra y organiza).

**App móvil** (en otra terminal):

```bash
cd mobile
npm install
npx expo start
```

Escaneá el QR con la cámara (iOS) o con Expo Go (Android). La app usa automáticamente la IP de la computadora para llegar al backend; para usar otra URL, copiá `mobile/.env.example` a `mobile/.env.local`.
