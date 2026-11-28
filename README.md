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

## Mensajes en tiempo real (Server-Sent Events)

El backend expone un feed **SSE** por canal (`Backend/src/realtime/eventStream.emitter.js`
y `GET .../channels/:channel_id/events` en `Backend/src/routes/channels.router.js`):
una respuesta HTTP `text/event-stream` que queda abierta mientras el cliente
escucha. No usa WebSockets ni librerías externas — `EventSource` es nativo
del navegador.

Cuando otro miembro publica en el canal abierto, en el frontend aparece un
botón flotante **"Hay nuevos mensajes"**; los mensajes se recargan recién cuando
el usuario hace clic (no se insertan solos).

### Eventos

| Evento | Dirección | Payload |
| --- | --- | --- |
| `connected` | servidor → cliente | `{ canal_id }` (bienvenida, al abrir la conexión) |
| `mensaje-nuevo` | servidor → cliente | `{ canal_id, mensaje }` |

El envío de mensajes sigue siendo REST (`POST .../messages`). El feed solo
empuja: cuando el mensaje se persiste por REST, el emitter lo escribe en las
conexiones abiertas del canal (exceptuando al autor, que ya lo agregó la
pantalla desde la respuesta HTTP).

### Autenticación

`EventSource` no puede enviar headers, así que el JWT se pasa por query param:
`GET .../events?token=<auth_token>`. El middleware de auth lo acepta
indistintamente del header `Authorization` (que sigue siendo obligatorio para
el resto de la API). El servidor valida que el usuario sea miembro del
workspace antes de abrir el stream y antes de guardar un mensaje.

### Consideraciones de despliegue

- Cada conexión se cierra cuando la Function llega a su duración máxima
  (~5 min por defecto). `EventSource` se reconecta solo y el frontend
  recarga los mensajes al reconectar (`on_reconnect` del hook).
- Un heartbeat (`:ping` cada 25 s) mantiene viva la conexión a través de proxies.
- Cada conexión queda fijada a una instancia. Para que el aviso llegue a clientes
  conectados a otras instancias hace falta un adaptador de pub/sub externo.
- SSE solo empuja del servidor al cliente: para este flujo alcanza, y no hace
  falta sostener el upgrade de WebSockets.

## Agrupado de mensajes en el chat

El chat agrupa mensajes consecutivos del mismo autor (hasta 7 minutos), como
hace Discord: solo el primer mensaje muestra el header con nombre, hora y avatar.

Para identificar al autor **no se usa el nombre**, porque no es único (dos
usuarios distintos pueden llamarse "Leo" y se agruparían bajo un solo header
como si uno solo hubiera escrito ambos mensajes); se usa el `member_id` único
que el backend incluye en cada mensaje
(`Backend/src/utils/channelMessage.util.js`, `toChannelMessageResponse`).
El agrupado se hace en `buildTimeline()` de
`Frontend/src/screens/WorkspaceScreen/components/ChatArea.jsx`.


