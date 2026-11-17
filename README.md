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

## Logger de consultas

Cada request que recibe la API deja un documento en la colección **`RegistroConsulta`** de MongoDB.

### Qué se registra

| Campo | Descripción |
| --- | --- |
| `timestamp` | Fecha y hora de recepción (UTC) |
| `ip` | IP del cliente (real detrás de proxy/Vercel) |
| `method` | Método HTTP (`GET`, `POST`, `PUT`, `DELETE`, ...) |
| `url` | URL consultada, con tokens redactados |
| `endpoint` | Patrón de ruta de Express, por ejemplo `/api/workspaces/:workspace_id` |
| `user_id` | Id del usuario autenticado, o `null` en rutas públicas |
| `status` | Código HTTP final de la respuesta |
| `duration_ms` | Duración total del procesamiento en milisegundos |

Ejemplo de documento:

```json
{
  "timestamp": "2026-11-17T18:20:31.402Z",
  "ip": "190.12.34.56",
  "method": "GET",
  "url": "/api/workspaces/6ab01f9a190ff6061955c88a/members",
  "endpoint": "/api/workspaces/:workspace_id/members",
  "user_id": "6aabff9a190ff6061955c889",
  "status": 200,
  "duration_ms": 14
}
```

### Qué NO se registra

- **El body** de la request (nunca se lee).
- Headers ni `Authorization`.
- Valores de `verification_token`, `reset_token`, `token` y `auth_token`: se guardan como `[REDACTED]`.

La escritura es asíncrona (no agrega latencia a la respuesta). Si MongoDB no está disponible, el log se imprime por consola para no perderlo. Las consultas se conservan **30 días** por un índice TTL.

### Consultar los logs

```js
// En un script o en mongosh (base de datos configurada en MONGO_DB_NAME)
db.RegistroConsulta.find().sort({ timestamp: -1 }).limit(10)
```

Rutas excluidas: `/api-docs*` (assets de Swagger) y `/favicon.ico`.

> Detrás de Vercel u otro proxy, Express usa `trust proxy` para obtener la IP real desde `X-Forwarded-For`.

