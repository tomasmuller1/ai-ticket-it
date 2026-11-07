# Preguntas de "Para pensar" (Semana 10)

Cómo responde este proyecto a las preguntas de `[DDS UTN] Clase Semana - 10`.

## Sincronismo

**1. ¿Todos los endpoints brindan una respuesta "instantánea"?**
No. La mayoría lee o escribe en memoria y responde enseguida, pero cobrar depende de un servicio externo que puede tardar. Por eso `POST /compras/:id/pago` no espera el resultado.

**2. ¿Qué pasa si mi backend procesa mi solicitud en un momento posterior?**
Hay que separar "lo recibí" de "lo terminé". El pago responde 202 con un `operacionId` y la app consulta `GET /compras/:id/pago/:operacionId` hasta que queda APROBADA o RECHAZADA. La compra sigue PENDIENTE mientras tanto, y el estado "en proceso" vive en `OperacionPago`.

**3. ¿Qué pasa si mi backend realiza un procesamiento pesado y nos da la respuesta en el momento?**
La conexión queda ocupada todo ese tiempo y, si se corta, el cliente no sabe cómo terminó. Ese es el caso peligroso: el cobro pudo salir y la respuesta perderse. Por eso existen el 202 y la `Idempotency-Key`: reintentar con la misma clave devuelve lo mismo, sin cobrar de nuevo.

**4. ¿Qué pasa si existe mucha latencia cada vez que llamo a mi backend?**
La app tiene que seguir explicando qué pasa:

- Skeletons y spinners mientras carga.
- Caché entre pantallas y datos del listado mientras llega el detalle.
- Timeout de 15 s en cada request, para no quedarse en un skeleton para siempre.
- Reintentos solo en lecturas, con backoff y azar, y Reintentar solo si puede servir.
- Debounce en la búsqueda y `signal` para cancelar lo que ya nadie espera.

**5. Al realizar la request, ¿el usuario debería poder seguir usando el resto del sistema o la pantalla es cautiva?**
Depende de qué se pierde si se va. El pago es cautivo mientras se inicia y se espera, porque salir sin saber el resultado invita a pagar de nuevo: no se cierra con la cruz, tocando afuera ni con "atrás". Pero tiene un máximo de intentos: al agotarse, la hoja se cierra y avisa que el pago sigue en proceso. Todo lo demás (buscar, favoritos, chat) no bloquea.

## Autenticación con JWT

**Un usuario cierra sesión en el front. ¿El JWT deja de ser válido? ¿Qué podríamos hacer para invalidarlo?**
No: un JWT es válido hasta que vence, porque el backend solo verifica la firma y la fecha. En esta app sigue sirviendo hasta 15 minutos. Al cerrar sesión, la app lo borra de la memoria y el backend revoca el refresh token, así que no se puede renovar.

Para invalidarlo en el momento haría falta consultar algo en cada request, por ejemplo una lista de tokens revocados (por `jti`) o una versión de sesión en el usuario. Eso resigna parte de la ventaja de no guardar estado. No se hizo: con 15 minutos de vida, la exposición es acotada.

**¿Por qué el access token dura minutos y el refresh token días? ¿Qué pasa si roban cada uno?**
El access token viaja en cada request y se verifica sin consultar nada, así que no se puede revocar: se limita el daño con una vida corta. Si lo roban, sirve como máximo 15 minutos.

El refresh token viaja solo al renovar y se puede revocar porque está guardado del lado del servidor, por eso puede durar 30 días y evitar que la persona inicie sesión a cada rato. Para protegerlo:

- En el celular va en SecureStore.
- En el backend se guarda solo su hash SHA-256.
- Rota en cada uso: si alguien lo reutiliza, se detecta y se revoca toda la sesión.
