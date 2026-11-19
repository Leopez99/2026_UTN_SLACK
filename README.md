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

