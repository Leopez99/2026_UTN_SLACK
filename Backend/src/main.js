import connectMongoDB from "./config/mongo.config.js";

//connectMongoDB()


import express from 'express'
import errorHandlerMiddleware from "./middlewares/error.middleware.js";
import auth_router from "./routes/auth.router.js";
import user_router from "./routes/user.router.js";
import workspace_router from "./routes/workspace.router.js";
import channel_router from "./routes/channels.router.js";
import cors from 'cors'
import requestLogger from "./middlewares/request-logger.middleware.js";
import swaggerUi from 'swagger-ui-express'
import ENVIRONMENT from "./config/environment.config.js";
import openapi_document from './docs/openapi.document.js'


const PORT = ENVIRONMENT.PORT || 8080
const app = express()

/*
Detras de Vercel u otro proxy, request.ip devuelve la IP del proxy.
Con trust proxy Express toma la IP real del cliente desde X-Forwarded-For.
*/
app.set('trust proxy', 1)

app.use(cors())

/*
Auditoria de consultas: se monta antes de express.json() y del middleware
de conexion a MongoDB para registrar tambien los errores de JSON malformado
y los 503 por base de datos no disponible.
*/
app.use(requestLogger)
app.use(express.json())

/*
Documentacion de la API (OpenAPI 3.0.3).
Se monta antes del middleware de conexion a MongoDB para que /api-docs
funcione incluso si la base de datos no esta disponible.

- GET /api-docs      -> Swagger UI
- GET /api-docs.json -> documento OpenAPI crudo (importable en Postman, etc.)
*/
app.get('/api-docs.json', (request, response) => {
    return response.status(200).json(openapi_document)
})

app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(openapi_document, {
        customSiteTitle: '2026 UTN Slack API - Documentación',
        swaggerOptions: {
            persistAuthorization: true,
            displayRequestDuration: true,
            filter: true,
            tryItOutEnabled: true
        }
    })
)

app.use(async (req, res, next) => {
    try {
        await connectMongoDB();
        next();
    } catch (error) {
        console.error("Error conectando MongoDB:", error);

        res.status(503).json({
            message: "No se pudo conectar a la base de datos"
        });
    }
});


app.use('/api/auth', auth_router)
app.use('/api/users', user_router)
app.use('/api/workspaces', workspace_router)
app.use('/api/channels', channel_router)

app.use(
    errorHandlerMiddleware
)


app.listen(
    PORT,
    () => {
        console.log(
            `El servidor se esta escuchando correctamente en http://localhost:${PORT}`
        )
    }
)

