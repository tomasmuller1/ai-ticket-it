# Requerimientos de AI Ticket It

Todo lo que se le pide al TP, en un solo lugar, con su fuente y su estado al 6/11/2026. El detalle de tareas de los puntos de la cursada sigue en `docs/checklist-requerimientos.md`. Lo que falta implementar está en `docs/superpowers/plans/2026-11-06-decisiones-ux.md`.

## Fuentes

| Marca | Fuente                                                                                                  | Qué tan directa es                                                                                                                      |
| ----- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **E** | `DDS UTN Trabajo Práctico Individual de Desarrollo con IA - 2C 2026 - Público.pdf` (no está en el repo) | Leído entero. Citas textuales, con página                                                                                               |
| **C** | `docs/checklist-requerimientos.md`                                                                      | Requerimientos armados con el material de la cursada. Los PDF de clase no se releyeron para este archivo: es una fuente de segunda mano |
| **P** | `CLAUDE.md`, `backend/CLAUDE.md` y `mobile/CLAUDE.md`                                                   | Reglas propias del proyecto. La cátedra no las exige, salvo donde se aclara                                                             |
| **S** | Chat de la sesión anterior y `docs/ux.md`                                                               | Las 4 decisiones de UX                                                                                                                  |

**Cómo se comprobó el estado.** El 6/11/2026 pasaron `npm test`, lint y formato en los dos paquetes: 255 tests en el backend y 140 en la app. Los E2E no se corrieron ese día; el checklist registra 19 de 19 en su última corrida. Nada se probó todavía en un celular.

**El trabajo reciente no está en `main`.** Vive en los PR abiertos #14 a #22, apilados. Mientras no se mergeen, `main` no refleja este estado.

## 1. Enunciado (E)

### Objetivo (p. 3)

> En este trabajo se buscará que los estudiantes desarrollen una aplicación completa utilizando Inteligencia Artificial como principal apoyo durante todo el proceso de construcción.

### Requerimientos técnicos (pp. 6-7)

| Requerimiento                                                                                | Estado                                                                                                           |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| "**Módulo Back-End**, desarrollado utilizando Node + express."                               | Cumplido                                                                                                         |
| "**Módulo Front-End**, desarrollado utilizando React Native."                                | Cumplido                                                                                                         |
| "La aplicación deberá ejecutarse de forma **local en un dispositivo "mobile"**"              | **Sin confirmar:** falta la prueba en Expo Go                                                                    |
| "...y utilizar un mecanismo de **persistencia en memoria** para el almacenamiento de datos." | Cumplido                                                                                                         |
| "**No se espera bajo ningún concepto la suscripción, compra o uso de herramientas pagas**"   | Cumplido en el stack de la app (`CLAUDE.md`). De las herramientas recomendadas dice: "Su uso no es obligatorio." |

### Qué se valora (p. 7)

> Se valorará especialmente el criterio utilizado durante el proceso de desarrollo, la justificación de decisiones y la reflexión crítica sobre el uso de IA en el contexto planteado.

También aclara que "el enfoque estará puesto en la comprensión de los conceptos, la capacidad de análisis y la correcta aplicación de las herramientas disponibles por sobre la perfección absoluta de los resultados obtenidos".

### Casos de uso (p. 8)

Los números son los del `CLAUDE.md`: el enunciado no los numera. El estado sale de la tabla "Casos de uso" del `README.md`.

| CU   | Texto del enunciado                                                                                                                                                                                         | Estado |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| CU1  | Como comprador, quiero poder visualizar mis compras, diferenciando con claridad el estado en el que se encuentran y cuántos días faltan para el evento en caso de estar en estado confirmada.               | Hecho  |
| CU2  | Como organizador, quiero poder visualizar las compras asociadas a un Evento en particular, diferenciando con claridad el estado en el que se encuentran y cuántas entradas quedan disponibles de cada tipo. | Hecho  |
| CU3  | Como comprador, quiero poder buscar Eventos de forma específica mediante una búsqueda textual o explorarlos por categorías.                                                                                 | Hecho  |
| CU4  | Como organizador, quiero poder crear un Evento ofreciendo distintos tipos de entrada, cada uno con su precio y cupo, permitiendo adaptarse a diferentes públicos y presupuestos.                            | Hecho  |
| CU5  | Como comprador, quiero poder enviar mensajes en cualquier momento relacionados a una compra mediante un chat dentro de la misma.                                                                            | Hecho  |
| CU6  | Como organizador, quiero poder responder mensajes en cualquier momento relacionados a una compra mediante un chat dentro de la misma.                                                                       | Hecho  |
| CU7  | Como comprador, quiero poder cancelar una compra para obtener el reembolso en caso de no poder asistir al evento.                                                                                           | Hecho  |
| CU8  | Como organizador, quiero que los compradores puedan cancelar una compra siempre que la misma no se encuentre en estado **utilizada** y el evento aún no se haya realizado.                                  | Hecho  |
| CU9  | Como organizador, quiero que una vez utilizada una entrada el comprador pueda puntuar el Evento de forma numérica y dejar un comentario escrito.                                                            | Hecho  |
| CU10 | Como comprador, quiero que las reseñas de eventos anteriores se visualicen en los Eventos de cada organizador para conocer experiencias previas antes de comprar.                                           | Hecho  |
| CU11 | Como comprador, al buscar Eventos, quiero poder ordenarlos por precio, fecha del evento y puntaje del organizador.                                                                                          | Hecho  |
| CU12 | Como comprador, quiero poder realizar una compra sobre un Evento seleccionando uno de los tipos de entrada disponibles y la cantidad deseada, sin superar el cupo disponible.                               | Hecho  |

**Requerimientos que aparecen solo en el contexto (p. 4).** "Guardar eventos favoritos": hecho. "Material multimedia": hecho, como URLs. "Filtrar por categorías": hecho.

### Diagrama tentativo (p. 5)

| Clase                | Atributos y métodos del diagrama                                                                                          | Diferencia con `backend/src/domain`            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `Usuario`            | `nombre`, `apellido`, `favoritos: Evento[]`                                                                               | Ninguna en estos campos                        |
| `Evento`             | `nombre`, `descripcion`, `categoria`, `fecha`, `tiposEntrada`, `multimedia`, `organizador`, `tuPrecioEstaEntre(Int, Int)` | Ninguna en estos campos. Suma `lugar`          |
| `TipoEntrada`        | `nombre`, `descripcion`, `precio`, `cupo`, `hayCupoPara(Int)`                                                             | Ninguna en estos campos                        |
| `Categoria`          | `nombre`, `descripcion`                                                                                                   | Ninguna                                        |
| `Compra`             | `comprador`, `evento`, `tipoEntrada`, `cantidad`, `total`, `estado`, `mensajes`, `actualizarEstado(EstadoCompra)`         | Ninguna en estos campos                        |
| `EstadoCompra`       | `PENDIENTE`, `CONFIRMADA`, `UTILIZADA`, `CANCELADA`, `REEMBOLSADA`                                                        | Ninguna                                        |
| `Mensaje`            | `usuario`, `mensaje`, `enviado`                                                                                           | Ninguna                                        |
| `CambioEstadoCompra` | `compra`, `estado`, `quien`, `fechaHora`                                                                                  | No guarda `compra`: vive en `compra.historial` |
| `Resenia`            | `comprador`, `evento`, `detalle`, `puntuacion: Double`                                                                    | La puntuación es un entero de 1 a 5            |

### Entrega (p. 9)

**Estado: pendiente, y hasta ahora no figuraba en ninguna lista del repo.**

> Cada estudiante deberá grabar un video de entre **5 y 10 minutos** de duración y enviarlo al equipo docente (la fecha de entrega será informada oportunamente).

> En el video se deberá realizar una demostración técnica completa de la aplicación desarrollada. La presentación deberá enfocarse en uno de los flujos funcionales implementados (a elección del alumno), explicando su funcionamiento integral.

Tiene que detallar:

- "La implementación del flujo en el **Back-End**."
- "La implementación del flujo en el **Front-End**."
- "El recorrido completo del flujo dentro de la **interfaz gráfica** de la aplicación."

> Adicionalmente, el estudiante deberá incluir una **conclusión final**, en la cual reflexione sobre el proceso de desarrollo utilizando herramientas de Inteligencia Artificial. En esta sección se espera que se identifiquen ventajas y desventajas del uso de IA en el desarrollo de software, dificultades encontradas durante la implementación, aprendizajes obtenidos y una valoración personal sobre el impacto de estas herramientas en su productividad y en la calidad del resultado final.

## 2. Requerimientos de la cursada (C)

No están en el enunciado: salen del material de clase. El detalle está en `docs/checklist-requerimientos.md`.

| #   | Requerimiento                   | Estado          | Qué falta                                                               |
| --- | ------------------------------- | --------------- | ----------------------------------------------------------------------- |
| 1   | Reintentos y pantallas de error | Hecho           | Nada                                                                    |
| 2   | Spinners y skeletons            | Hecho en código | Probar con red lenta en el celular                                      |
| 3   | Pago cautivo sin doble cobro    | Hecho           | Nada                                                                    |
| 4   | Polling en el pago              | Hecho           | Nada                                                                    |
| 5   | Caché entre pantallas           | Hecho           | Nada                                                                    |
| 6   | `useQuery`                      | Hecho           | Nada                                                                    |
| 7   | Usuarios con JWT                | Hecho           | Nada                                                                    |
| 8   | Accesibilidad                   | Hecho en código | VoiceOver, TalkBack, Accessibility Inspector y Scanner, letra al máximo |
| 9   | Tests con Jest y E2E            | Hecho en código | Prueba manual en Expo Go                                                |
| 10  | Guía práctica UX                | Parcial         | Persona externa, recorrido con lector y UX Detective                    |

Esta tabla es solo un resumen: el estado de cada punto se actualiza en el checklist y, si difieren, vale ese archivo. La lista de control de la Guía práctica UX y sus entregables están en el punto 10 del checklist.

## 3. Reglas de negocio (P)

Copiadas de `backend/CLAUDE.md`, que sigue siendo la fuente de verdad: si difieren, vale ese archivo. Algunas concretan los CU; las demás son decisiones del proyecto. Las decisiones de la sección 4 cambian algunas.

**Transiciones de `Compra`**

| Estado actual           | Pagar        | Cancelar                                                 | Validar (usar)                    | Reseñar         |
| ----------------------- | ------------ | -------------------------------------------------------- | --------------------------------- | --------------- |
| PENDIENTE               | → CONFIRMADA | → CANCELADA (sin reembolso, o sola al vencer la reserva) | ✗                                 | ✗               |
| CONFIRMADA              | ✗            | → CANCELADA → REEMBOLSADA (automático, vía la pasarela)  | → UTILIZADA (solo el organizador) | ✗               |
| UTILIZADA               | ✗            | ✗                                                        | ✗                                 | ✓, una sola vez |
| CANCELADA / REEMBOLSADA | ✗            | ✗                                                        | ✗                                 | ✗               |

- **Vencimiento de la reserva:** una compra PENDIENTE sin pagar vence a los 15 minutos. Un barrido cada 60 segundos la pasa a CANCELADA y libera el cupo, con un margen para el pago que venía en camino. Con un pago en proceso no vence, y un rechazo da 5 minutos más para reintentar.
- **Cancelar:** no se puede si la compra está UTILIZADA ni si el evento ya se realizó (`ahora >= fecha`). Libera el cupo.
- **Comprar:** el evento tiene que ser futuro y el tipo de entrada, de ese evento. Cantidad entera entre 1 y 10, que además cumpla `hayCupoPara`. Total = precio × cantidad, con el precio congelado al comprar. El organizador no puede comprar entradas de su propio evento. El cupo se reserva al crear la compra (PENDIENTE).
- **Pagar:** es asincrónico. `POST /compras/:id/pago` responde 202 con un `operacionId` y el resultado se consulta en `GET /compras/:id/pago/:operacionId`. La compra sigue PENDIENTE hasta que se aprueba. Con una operación pendiente no se puede iniciar otro pago ni cancelar (409 `PAGO_EN_PROCESO`).
- **Idempotencia:** `POST /compras`, `POST /pago` y `/cancelacion` aceptan `Idempotency-Key`. Con la misma clave, por usuario, se devuelve la respuesta guardada, sin volver a operar.
- **Disponibles por tipo:** `cupo − vendidas`. Cuentan como vendidas las compras PENDIENTE, CONFIRMADA y UTILIZADA.
- **Días restantes:** solo para compras CONFIRMADAS, `ceil((fecha − ahora) / 1 día)`.
- **Crear evento:** fecha futura y al menos 1 tipo de entrada, sin nombres repetidos. Precio ≥ 0 y cupo ≥ 1. La categoría tiene que existir. El organizador es el usuario autenticado.
- **Chat:** solo el comprador y el organizador del evento, con la compra en cualquier estado. Mensajes de 1 a 1000 caracteres. Cualquier otro usuario recibe 403.
- **Reseña:** solo el comprador de una compra UTILIZADA, una por compra. Puntuación entera de 1 a 5 y detalle de hasta 500 caracteres.
- **Puntaje del organizador:** promedio de sus reseñas con 1 decimal, o `null` si no tiene. Al ordenar por puntaje, los `null` van últimos.
- **Tarjetas:** se guardan la marca, los últimos 4, el vencimiento y el token, nunca el número completo ni el código. Una tarjeta vencida no se acepta.

**Decisiones del proyecto que funcionan como restricciones** (`CLAUDE.md`): JWT con refresh rotativo, patrones State, Strategy y Adapter, Zod y Swagger, chat por polling, TanStack Query y `StyleSheet` con tokens, E2E con Cypress sobre Expo web, y pago asincrónico con `Idempotency-Key`.

## 4. Las 4 decisiones de UX (S)

Todas tienen severidad media en `docs/ux.md`. Las 4 están implementadas en los PR #24 a #27. Falta confirmarlas en Expo Go.

| #   | Decisión                 | Texto original                                                                                                                                                                                 | Dónde                     |
| --- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| 1   | Doble reserva            | "'Reservar' no tiene clave de idempotencia. Si se pierde la respuesta y se toca de nuevo, quedan dos reservas. Se arregla con poco, porque el middleware ya existe."                           | `docs/ux.md:75`           |
| 2   | Reservas sin vencimiento | "Una reserva que nadie paga retiene el cupo para siempre."                                                                                                                                     | `docs/ux.md:73`           |
| 3   | Dos "Pagar" seguidos     | "La propuesta es que la hoja se abra sola después de 'Reservar', y así queda un solo 'Pagar', el que confirma. Si la persona cierra la hoja, la reserva sigue en pie y puede pagar más tarde." | `docs/ux.md:55-63`, `:77` |
| 4   | Formularios largos       | "La propuesta es que, al fallar, la pantalla se desplace sola hasta el primer campo con error. Es un cambio chico y no altera ningún flujo."                                                   | `docs/ux.md:79`           |

**La decisión 2 no tenía solución escrita.** Solo se describía el problema. El 6/11/2026 se aprobó la propuesta del plan: la reserva vence a los 15 minutos, pasa a `CANCELADA` y un barrido lo revisa cada 60 segundos. Una reserva no vence si la persona ya tocó Pagar y todavía no hay respuesta. La app muestra los 15 minutos y la cancelación ocurre entre el minuto 16 y el 17: ese margen deja llegar un pago que ya venía en camino.

**La decisión 3 cambia lo que se había dicho.** La sesión anterior recomendaba esperar a la prueba de usabilidad. Se decidió hacerla igual.

## 5. Qué falta

| Qué                                                                                                                                                       | Quién             | Fuente                           |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | -------------------------------- |
| Confirmar en Expo Go las 4 decisiones de UX                                                                                                               | Vos               | S                                |
| **Video de 5 a 10 minutos con conclusión final**                                                                                                          | Vos               | E, p. 9                          |
| Elegir el flujo del video y averiguar la fecha de entrega                                                                                                 | Vos               | E, p. 9                          |
| Correr la app en un celular con Expo Go: SecureStore, `Alert`, hoja de pago con teclado y "atrás" de Android, selector de fecha, vibración, iOS y Android | Vos               | E, p. 6, y C, punto 9            |
| Red lenta en el celular                                                                                                                                   | Vos               | C, punto 2                       |
| VoiceOver y TalkBack, Accessibility Inspector y Scanner, letra al máximo, búsqueda y filtros con lector                                                   | Vos               | C, puntos 8 y 10                 |
| Prueba de usabilidad con una persona externa                                                                                                              | Vos y esa persona | C, punto 10                      |
| Ejercicio `UX Detective`                                                                                                                                  | Vos               | C, punto 10                      |
| Mergear los PR #14 a #22                                                                                                                                  | Vos               | `CLAUDE.md`: "el usuario mergea" |
| Confirmar con la cátedra si los E2E son requisito                                                                                                         | Vos               | C, punto 9                       |

Notificaciones queda afuera: el checklist lo marca como "No aplica por ahora".

**Hallazgos menores sin decidir (`docs/ux.md`, severidad baja).** En el registro, el error de la contraseña repite lo que dicen sus requisitos. La tarjeta de prueba que se rechaza solo está explicada en el README.

## 6. Dudas aclaradas con el enunciado

- **CU8 y CU9 no son una contradicción.** El rol es Organizador, pero lo que pide es que _el comprador_ pueda cancelar y puntuar. El código hace eso.
- **Los E2E no figuran en el enunciado.** El checklist dice que el video de clase los presenta como requisito "del TP". Sigue a confirmar con la cátedra.
- **El enunciado se contradice en la plataforma.** La p. 4 habla de "una solución web moderna y escalable" y la p. 6 pide React Native en un dispositivo mobile. El proyecto sigue los requerimientos técnicos.
- **El encabezado del PDF dice "Trabajo Práctico Integrador"** y la portada, "Trabajo Práctico Individual". Se toma como individual.
