# AI Ticket It

Plataforma de publicación de eventos y venta de entradas.
Trabajo Práctico Individual de Desarrollo con IA — Diseño de Sistemas de Información, UTN FRBA, 2C 2026.

## Stack

| Módulo | Tecnología |
|--------|------------|
| `backend/` | Node.js + Express (API REST, persistencia en memoria) |
| `mobile/` | React Native (Expo), ejecutable en un dispositivo móvil |

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
│   │   ├── errors/  middlewares/  data/
│   └── test/                # node:test
└── mobile/
    └── src/
        ├── app/             # pantallas (Expo Router: cada archivo es una ruta)
        ├── components/
        └── api/client.js    # llamadas al backend
```

## Casos de uso

**Comprador**
- [ ] Ver mis compras con su estado y los días que faltan para el evento (si está confirmada)
- [ ] Buscar eventos por texto o explorarlos por categoría
- [ ] Ordenar eventos por precio, fecha y puntaje del organizador
- [ ] Comprar eligiendo tipo de entrada y cantidad, sin superar el cupo
- [ ] Enviar mensajes en el chat de una compra
- [ ] Cancelar una compra y obtener el reembolso
- [ ] Ver las reseñas de eventos anteriores de cada organizador

**Organizador**
- [ ] Crear un evento con distintos tipos de entrada (precio y cupo)
- [ ] Ver las compras de un evento con su estado y las entradas disponibles por tipo
- [ ] Responder mensajes en el chat de una compra

**Reglas de negocio**
- [ ] Una compra se puede cancelar si no está *utilizada* y el evento no se realizó
- [ ] Una vez utilizada la entrada, el comprador puede puntuar (numérico) y comentar el evento

Estados de una compra: `PENDIENTE_PAGO` → `CONFIRMADA` → `UTILIZADA` / `CANCELADA` / `REEMBOLSADA`.

## Cómo correrlo

Requisitos: Node 20+ y la app **Expo Go** en el celular, conectado a la misma red Wi-Fi que la computadora.

**Backend** (puerto 3000):

```bash
cd backend
npm install
npm run dev     # se reinicia solo al guardar
npm test
```

**App móvil** (en otra terminal):

```bash
cd mobile
npm install
npx expo start
```

Escaneá el QR con la cámara (iOS) o con Expo Go (Android). La app usa automáticamente la IP de la computadora para llegar al backend; para usar otra URL, copiá `mobile/.env.example` a `mobile/.env.local`.

### Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/health` | Estado del servidor |
| GET | `/api/eventos` | Lista de eventos con sus tipos de entrada |
| GET | `/api/eventos/:id` | Detalle de un evento |
