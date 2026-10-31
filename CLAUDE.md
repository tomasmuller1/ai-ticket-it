# AI Ticket It — contexto para agentes

TP individual de DSI (UTN FRBA, 2C 2026). Ver `README.md` para los casos de uso.

## Restricciones del enunciado
- Back-End: Node + Express. Front-End: React Native, corriendo localmente en un dispositivo móvil.
- Persistencia **en memoria** (sin base de datos).
- Solo herramientas gratuitas.
- La entrega es un video que explica un flujo completo (back, front y UI), así que el código tiene que ser fácil de explicar: preferir claridad sobre trucos.

## Convenciones
- Código y comentarios en español, consistentes con el dominio (Evento, Compra, TipoEntrada, Organizador, Comprador, Reseña).
- Backend organizado en capas: rutas → controllers → services → repositories (en memoria) → dominio.
- Reglas de negocio (cupo, cancelación, reseñas) en el dominio/servicios, no en los controllers ni en el front.
