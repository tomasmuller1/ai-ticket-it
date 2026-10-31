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
├── backend/   # API REST
└── mobile/    # App React Native
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

_Se completa a medida que se arman los módulos._
