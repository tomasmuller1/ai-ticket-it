# UX: persona, POV y revisión de la app

Entregables de la `Guia práctica UX.pdf`, sección "Aplicación al Trabajo Práctico". La Guía aclara que no hace falta resolver todo, pero que cada decisión debe poder justificarse pensando en la persona usuaria.

**Qué tan firme es esto.** Las personas y el POV son hipótesis armadas desde el enunciado, sin entrevistas. La revisión de heurísticas la hizo Claude leyendo el código y mirando capturas en Expo web, a ancho de celular: no reemplaza una prueba con personas ni un recorrido con VoiceOver o TalkBack. La prueba de usabilidad de más abajo todavía no se hizo.

## User Persona

### Comprador: Camila

| Campo               | Detalle                                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Edad                | 27 años                                                                                                            |
| Profesión           | Diseñadora en relación de dependencia                                                                              |
| Ubicación           | CABA                                                                                                               |
| Nivel tecnológico   | Medio-alto. Compra por el celular, pero no le gusta cargar la tarjeta en cada lado                                 |
| Contexto            | Se entera de un recital por redes, muchas veces en el colectivo o en la calle, con señal irregular                 |
| Objetivos           | Conseguir entrada antes de que se agote, saber si quedó paga y tenerla a mano el día del evento                    |
| Frustraciones       | Formularios largos, no saber si le cobraron cuando se corta la conexión y que la app se trabe sin explicar por qué |
| Frase que la define | "Si dudo de si me cobraron, no vuelvo a tocar el botón de pagar"                                                   |

### Organizador: Julián

| Campo               | Detalle                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------ |
| Edad                | 41 años                                                                                    |
| Profesión           | Productor independiente de ciclos de música                                                |
| Ubicación           | Rosario                                                                                    |
| Nivel tecnológico   | Medio. Usa el celular para todo, pero no es técnico                                        |
| Contexto            | Publica dos o tres eventos por mes y controla el ingreso en la puerta, con gente esperando |
| Objetivos           | Publicar rápido, ver cuánto vendió por tipo de entrada y validar entradas sin demoras      |
| Frustraciones       | Contestar las mismas consultas por varios canales y no saber cuánto cupo le queda          |
| Frase que lo define | "En la puerta no tengo tiempo de pelearme con una app"                                     |

## POV

- **Camila** necesita comprar una entrada desde el celular en menos de un minuto y saber con certeza si quedó paga **porque** compra en el momento en que se entera del evento, muchas veces con mala señal, y le da miedo pagar dos veces o quedarse sin lugar.
- **Julián** necesita ver de un vistazo cuánto vendió y validar cada entrada en segundos **porque** controla el ingreso en persona y cada demora se convierte en una fila.

## Preguntas guía

| #   | Pregunta                                                         | Respuesta                                                                                                                                                                                                                                             |
| --- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | ¿Quién es la persona principal, qué quiere y en qué dispositivo? | Camila: comprar una entrada, desde el celular                                                                                                                                                                                                         |
| 2   | ¿Cuál es el POV del flujo?                                       | El de Camila, arriba                                                                                                                                                                                                                                  |
| 3   | ¿Cuál es el camino más corto?                                    | Ver la sección siguiente                                                                                                                                                                                                                              |
| 4   | ¿Qué pasa cuando algo sale mal?                                  | Sin red o 5xx: reintenta solo y ofrece Reintentar. 404 y 403: mensaje claro y Volver. Dato inválido: error junto al campo y foco del lector en el primero. Sesión vencida: el login lo explica. Pago incierto: consulta la compra antes de decir nada |
| 5   | ¿Cómo sabe que su acción se registró?                            | Spinner en el botón, anillo durante el cobro, tilde y vibración al confirmar, avisos abajo y anuncios para el lector de pantalla                                                                                                                      |
| 6   | ¿Qué información se comunica solo con color?                     | Ninguna: los estados llevan ícono y texto, y los errores, borde, ícono y texto                                                                                                                                                                        |
| 7   | ¿Se puede completar con el teclado?                              | Es una pauta de web. El equivalente mobile es el lector de pantalla: **falta recorrerlo con VoiceOver y TalkBack**                                                                                                                                    |
| 8   | ¿Qué le mostrarías a otra persona para validar la idea?          | La app en Expo Go, con la tarea de la prueba de usabilidad                                                                                                                                                                                            |

## Camino más corto para comprar

Hoy, con una tarjeta ya guardada, son estos toques desde que se encuentra el evento:

1. Tocar la tarjeta del evento.
2. "Comprar entradas".
3. Elegir tipo y cantidad (ya viene elegido el primer tipo con entradas) y "Reservar".
4. "Pagar $ X" en la pantalla de la compra.
5. "Pagar $ X" en la hoja de pago.

**Se puede eliminar el paso 4:** al reservar, abrir directamente la hoja de pago. Si la persona la cierra, la reserva queda en pie y puede pagar después. No lo cambié porque modifica el flujo principal y conviene decidirlo con la prueba de usabilidad. El resto de los pasos tiene una función: el 3 es la decisión de compra y el 5 evita un cobro por un toque accidental.

## Las 10 heurísticas

Severidad según la Guía: **crítica** (impide completar la tarea), **alta** (se completa con mucho esfuerzo o ayuda), **media** (molesta o genera dudas, pero se supera) y **baja** (detalle de pulido).

| #   | Heurística                         | Qué hace bien la app                                                                       | Hallazgo                                                                                                                                                    | Severidad |
| --- | ---------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| 1   | Visibilidad del estado del sistema | Skeletons, anillo de pago, botones con spinner y "Pago en proceso" en la compra            | Sin hallazgos en esta revisión                                                                                                                              | —         |
| 2   | Coincidencia con el mundo real     | "Reservar", "Pagar", entrada con forma de entrada impresa                                  | Sin hallazgos en esta revisión                                                                                                                              | —         |
| 3   | Control y libertad del usuario     | Volver en toda pantalla, hojas que se cierran y cancelación con confirmación               | Una reserva que nadie paga ni cancela retiene el cupo para siempre: no vence                                                                                | Media     |
| 4   | Consistencia y estándares          | Componentes compartidos en `components/ui/`                                                | Sin hallazgos en esta revisión                                                                                                                              | —         |
| 5   | Prevención de errores              | Stepper con tope, confirmación en lo destructivo e `Idempotency-Key` en pago y cancelación | "Reservar" no tiene clave de idempotencia: si se pierde la respuesta y se toca de nuevo, quedan dos reservas                                                | Media     |
| 6   | Reconocer en lugar de recordar     | Tarjeta elegida a la vista y requisitos de la contraseña siempre visibles                  | Sin hallazgos en esta revisión                                                                                                                              | —         |
| 7   | Flexibilidad y eficiencia          | Autocompletado, teclado correcto en cada campo y tarjetas guardadas                        | Dos toques de "Pagar" seguidos (ver el camino más corto)                                                                                                    | Media     |
| 8   | Diseño estético y minimalista      | Una sola dirección visual, sin color de más                                                | En el registro, el error de la contraseña repite lo que dicen sus requisitos                                                                                | Baja      |
| 9   | Ayudar con los errores             | Mensaje junto al campo, qué pasó y cómo seguir                                             | En un formulario largo (Nuevo evento) la pantalla no se desplaza al primer error: quien no usa lector ve "Revisá los campos marcados" y tiene que buscarlos | Media     |
| 10  | Ayuda y documentación              | Ayuda junto a cada campo y aviso de pago simulado                                          | La tarjeta de prueba que se rechaza solo está explicada en el README                                                                                        | Baja      |

## UX Detective contra este proyecto

El ejercicio interactivo es de Clicka. Esta comparación usa la lista de sus 9 errores, tomada del notebook: **falta hacer el ejercicio en sí**.

| #   | Error del ejercicio                            | ¿Aparecía en este proyecto?                                                                                                                                                   |
| --- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Placeholder usado como etiqueta                | No en formularios: `Campo` tiene etiqueta visible. El buscador y el chat solo tienen placeholder visible, con `accessibilityLabel`                                            |
| 2   | Contraste insuficiente                         | No: texto ≥ 4,5:1, calculado sobre los tokens de `theme.js`                                                                                                                   |
| 3   | Casilla marcada por defecto con doble negación | No: la app no tiene casillas de consentimiento                                                                                                                                |
| 4   | Requisitos de contraseña ocultos               | En parte: se veían antes, pero desaparecían con un error y no se tildaban. **Corregido**                                                                                      |
| 5   | Mensaje de error genérico                      | En parte: el 500 mostraba texto del backend y el 404, un UUID. **Corregido**. El login dice "Email o contraseña incorrectos" a propósito, para no revelar qué cuentas existen |
| 6   | Error comunicado solo con color                | No: borde, ícono y texto                                                                                                                                                      |
| 7   | Botón diminuto con texto ambiguo               | No: botones de 52 de alto y textos que dicen la acción                                                                                                                        |
| 8   | Enlace no descriptivo                          | No: por ejemplo, "Creala gratis" se anuncia como "Crear una cuenta gratis"                                                                                                    |
| 9   | Foco de teclado invisible                      | No aplica igual en mobile. El equivalente es el foco del lector, **sin probar en un celular**                                                                                 |

## Prueba de usabilidad (pendiente)

Hay que hacerla con al menos una persona externa al proyecto, en Expo Go. Lleva unos 15 minutos.

**Preparación:** backend con `npm run dev`, celular en la misma red y sesión iniciada con `valentina@aiticketit.com` (contraseña `aiticketit123`).

**Consigna (leerla tal cual):** "Querés ir a ver jazz este mes. Conseguí dos entradas para algún evento de jazz y pagalas. Después, encontrá la entrada que compraste. Contame en voz alta lo que vas pensando."

**Cómo observar:** no ayudar ni explicar. Si la persona pregunta, responder "¿vos qué harías?". Anotar dónde se traba y por qué.

**Para mirar en especial:**

- ¿Duda en alguno de los dos "Pagar"?
- ¿Entiende que la reserva todavía no es la compra?
- ¿Sabe en todo momento si ya pagó?

**Hallazgos**

| Dónde | Qué pasó | Severidad (crítica, alta, media o baja) | Qué cambiar |
| ----- | -------- | --------------------------------------- | ----------- |
|       |          |                                         |             |
