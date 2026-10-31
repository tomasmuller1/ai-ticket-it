# AI Ticket It

Plataforma de publicación de eventos y venta de entradas. TP Individual de Desarrollo con IA de Diseño de Sistemas de Información (UTN FRBA, 2C 2026). Se construye **como un producto real de una empresa grande**: seguridad, errores bien manejados, tests, API documentada y UI cuidada, no una maqueta.

## Stack (lo exige la cátedra, no cambiarlo)

- `backend/`: Node + Express 5, **JavaScript ESM**, persistencia **en memoria**. Ver `backend/CLAUDE.md`.
- `mobile/`: React Native con Expo SDK 58 + Expo Router, JavaScript. Ver `mobile/CLAUDE.md`.
- Solo herramientas y servicios gratuitos.

## Comandos

| Qué                                  | Dónde      | Comando                            |
| ------------------------------------ | ---------- | ---------------------------------- |
| Levantar la API (recarga al guardar) | `backend/` | `npm run dev`                      |
| Tests / cobertura                    | `backend/` | `npm test` / `npm run coverage`    |
| Lint / formato                       | `backend/` | `npm run lint` / `npm run format`  |
| Documentación de la API              | navegador  | `http://localhost:3000/api/docs`   |
| Levantar la app                      | `mobile/`  | `npx expo start` (QR para Expo Go) |

## Casos de uso (enunciado)

| CU   | Rol         | Descripción                                                                           |
| ---- | ----------- | ------------------------------------------------------------------------------------- |
| CU1  | Comprador   | Ver mis compras con su estado y los días que faltan para el evento si está CONFIRMADA |
| CU2  | Organizador | Ver las compras de un evento con su estado y las entradas disponibles por tipo        |
| CU3  | Comprador   | Buscar eventos por texto o explorarlos por categoría                                  |
| CU4  | Organizador | Crear un evento con distintos tipos de entrada (precio y cupo)                        |
| CU5  | Comprador   | Enviar mensajes en el chat de una compra, en cualquier momento                        |
| CU6  | Organizador | Responder mensajes en el chat de una compra, en cualquier momento                     |
| CU7  | Comprador   | Cancelar una compra y obtener el reembolso                                            |
| CU8  | Organizador | Solo se cancela si la compra no está UTILIZADA y el evento no se realizó              |
| CU9  | Organizador | Con la entrada UTILIZADA, el comprador puntúa el evento (número y comentario)         |
| CU10 | Comprador   | Las reseñas de eventos anteriores se ven en los eventos de cada organizador           |
| CU11 | Comprador   | Ordenar la búsqueda por precio, fecha y puntaje del organizador                       |
| CU12 | Comprador   | Comprar eligiendo tipo de entrada y cantidad, sin superar el cupo                     |

Extra del contexto del enunciado: favoritos.

## Glosario del dominio (nombres del diagrama de la cátedra; usarlos tal cual)

- **Usuario**: una sola clase. _Comprador_ y _organizador_ son roles, no clases.
- **Evento**: tiene una **Categoria**, varios **TipoEntrada** (General, Platea, VIP… con precio y cupo), multimedia (URLs) y un organizador.
- **Compra**: un comprador compra `cantidad` entradas de un TipoEntrada. Tiene un **EstadoCompra** (PENDIENTE, CONFIRMADA, UTILIZADA, CANCELADA, REEMBOLSADA), un historial de **CambioEstadoCompra** (estado, quién, cuándo) y **Mensaje**s (el chat).
- **Resenia**: puntuación (1 a 5) y detalle que deja el comprador de un evento al que asistió.
- **Puntaje del organizador**: promedio de las reseñas de todos sus eventos.

## Decisiones tomadas

1. **Auth real con JWT** (access corto + refresh rotativo), en su propia fase. Hasta entonces, el back identifica al usuario con un autenticador inyectable (`AutenticadorDesarrollo`, header `X-Usuario-Id`) que **nunca** llega a la app ni a producción.
2. **Patrón State** para los estados de la compra; **Strategy** para el orden de la búsqueda; **Adapter** para la pasarela de pagos (fake).
3. **Zod** valida la entrada y genera la documentación OpenAPI (**Swagger** en `/api/docs`). No hay documentación de la API fuera de Swagger.
4. El cupo se reserva al crear la compra y se libera al cancelar.
5. Chat por polling (cada 3 s con la pantalla abierta).
6. App: **TanStack Query** para los datos y `StyleSheet` con tokens de `theme.js`.
7. Verificación de la UI con **Expo web** en el navegador integrado; lo nativo lo confirma el usuario con Expo Go.

## Cómo trabajar en este repo

- **Una rama y un PR por fase o feature** (`feat/...`, `fix/...`, `chore/...`). Nunca commitear directo a `main`; el usuario mergea.
- Commits en español con Conventional Commits: `feat(compras): reservar cupo al comprar`.
- Para cada regla de negocio, **primero el test que falla** y después el código.
- **No agregar dependencias sin justificarlas** (qué resuelve y por qué no alcanza con lo que hay). En `mobile/`, siempre `npx expo install`.
- Antes de dar algo por terminado: tests, lint y formato en verde, y probarlo de verdad (Swagger para la API, Expo web para la UI).
- Pensar como producto real: validar la entrada, devolver errores claros, contemplar los estados de carga, vacío y error, y no filtrar datos de otros usuarios.
- Al terminar un CU, tacharlo en el checklist de `README.md`.
- Código, nombres y mensajes en **español**. Los mensajes al usuario van en español rioplatense ("tenés", "elegí").

## Errores frecuentes de la IA en este repo (mantener actualizado)

- Usar APIs de Expo de memoria: en SDK 58 muchas cambiaron. Consultar `mobile/AGENTS.md` y la documentación versionada.
- Poner lógica de negocio en controllers o en la app: va en el dominio y en los services.
- Usar `new Date()` en reglas de negocio en lugar del `Reloj` inyectado (rompe los tests).
- Leer `req.query`, `req.params` o `req.body` sin validar: usar `req.validado` después de `validar(schema)`.
- Olvidarse de documentar un endpoint nuevo en Swagger.
