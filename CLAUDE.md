# AI Ticket It — contexto para agentes

TP individual de DSI (UTN FRBA, 2C 2026). Ver `README.md` para los casos de uso.

## Restricciones del enunciado
- Back-End: Node + Express. Front-End: React Native, corriendo localmente en un dispositivo móvil.
- Persistencia **en memoria** (sin base de datos).
- Solo herramientas gratuitas.
- La entrega es un video que explica un flujo completo (back, front y UI), así que el código tiene que ser fácil de explicar: preferir claridad sobre trucos.

## Convenciones
- Código y comentarios en español, consistentes con el dominio (Evento, Compra, TipoEntrada, Organizador, Comprador, Reseña).
- Backend (ESM, Express 5) organizado en capas: rutas → controllers → services → repositories (en memoria) → dominio. Las dependencias se inyectan a mano en `backend/src/app.js`. Tests con `node:test` (`npm test`).
- Mobile: Expo SDK 58 + Expo Router, en JavaScript. Ver `mobile/AGENTS.md` para las reglas de Expo (instalar paquetes con `npx expo install`).
- Reglas de negocio (cupo, cancelación, reseñas) en el dominio/servicios, no en los controllers ni en el front.
