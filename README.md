# 2026_UTN_SLACK

## Documentación de la API con Swagger UI

La API se documenta con **OpenAPI 3.0.3** y se visualiza con **Swagger UI**.

### Cómo levantarla

```bash
cd Backend
npm install
npm run dev   # o npm start
```

Luego abrir:

| Recurso | URL |
| --- | --- |
| Swagger UI | <http://localhost:8080/api-docs> |
| Documento OpenAPI (JSON) | <http://localhost:8080/api-docs.json> |

> El puerto se toma de `PORT` y, si no está definido, usa `8080`.
> La documentación se monta antes del middleware de conexión a MongoDB, así que
> `/api-docs` responde incluso si la base de datos no está disponible.

### Qué incluye

Para cada endpoint se documenta:

- **Entrada**: path params, query params, headers, body requerido y schema de cada campo (tipos, obligatoriedad, longitudes, enums).
- **Todas las salidas posibles**: código HTTP, mensaje y ejemplo de respuesta. Incluye los errores de validación (`400`), autenticación (`401`), permisos (`403`), recursos inexistentes (`404`), errores inesperados (`500`) y fallos de conexión a MongoDB (`503`).
- **Autenticación**: esquema `bearerAuth` (JWT). En Swagger UI usar el botón **Authorize** con el `auth_token` devuelto por `POST /api/auth/login`; la sesión se conserva al recargar (`persistAuthorization`).

### Dónde se edita

- Documento completo: `Backend/src/docs/openapi.document.js`
- Montaje de Swagger UI: `Backend/src/main.js` (`/api-docs` y `/api-docs.json`)

Al agregar un endpoint nuevo, agregarlo en `paths` y reutilizar los schemas/responses de `components` (`ErrorResponse`, `User`, `Workspace`, `Member`, etc.).

### Importar en Postman

En Postman: **Import → Link** y pegar `http://localhost:8080/api-docs.json`, o importar el archivo JSON.

## Mensajes en tiempo real (WebSockets)

El backend expone un endpoint WebSocket con **Socket.IO** montado sobre el mismo
servidor HTTP de Express (`Backend/src/realtime/socket.server.js`). Se despliega
en el mismo proyecto de Vercel que la API: no hay que levantar un servidor aparte.

En el frontend, cuando otro miembro publica en el canal abierto, aparece un
botón flotante **"Hay nuevos mensajes"**; los mensajes se recargan recién cuando
el usuario hace clic (no se insertan solos).

### Eventos

| Evento | Dirección | Payload |
| --- | --- | --- |
| `join_channel` | cliente → servidor | `{ channel_id }` (ack `{ ok, data? , message? }`) |
| `leave_channel` | cliente → servidor | `{ channel_id }` |
| `send_message` | cliente → servidor | `{ channel_id, contenido }` (ack con `data.message_created`) |
| `mensaje-nuevo` | servidor → cliente | `{ canal_id, mensaje }` |

El handshake se autentica con el mismo JWT de la API (`socket.handshake.auth.token`).
El servidor valida que el usuario sea miembro del workspace del canal antes de
unirlo al room `canal:<id>` y antes de guardar un mensaje.

### Consideraciones de Vercel

- WebSockets requieren **Fluid Compute** (activado por defecto en proyectos
  creados desde abril de 2025; en proyectos viejos se activa en Settings → Functions).
- El cliente debe usar `transports: ['websocket']`: el long-polling HTTP de
  Socket.IO no funciona con el ciclo de vida de las Functions.
- Cada conexión se cierra cuando la Function llega a su duración máxima
  (300 s en Hobby). Socket.IO reconecta solo y el frontend recarga los mensajes
  al reconectar.
- Cada conexión queda fijada a una instancia. Para que el aviso llegue a miembros
  conectados a otras instancias hace falta un adaptador de pub/sub externo
  (por ejemplo `@socket.io/redis-adapter` con Redis de Vercel Marketplace).


