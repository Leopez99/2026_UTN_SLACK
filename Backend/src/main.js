import connectMongoDB from "./config/mongo.config.js";
//connectMongoDB()


import express from 'express'
import errorHandlerMiddleware from "./middlewares/error.middleware.js";
import auth_router from "./routes/auth.router.js";
import user_router from "./routes/user.router.js";
import workspace_router from "./routes/workspace.router.js";
import cors from 'cors'
import swaggerUi from 'swagger-ui-express'
import ENVIRONMENT from "./config/environment.config.js";
import openapi_document from './docs/openapi.document.js'


const PORT = ENVIRONMENT.PORT || 8080
const app = express()

app.use(cors())
/*
El limite de express.json() por defecto (100kb) rechazaria el body cuando
se envia un logo de workspace en base64, por lo que lo subimos a 1mb.
*/
app.use(express.json({ limit: '1mb' }))

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

app.use(
    errorHandlerMiddleware
)


/*
En desarrollo local levantamos el puerto nosotros; en Vercel el listen lo
maneja la plataforma (por eso se verifica process.env.VERCEL).
El push en tiempo real (mensajes nuevos) viaja por SSE en
/api/workspaces/:workspace_id/channels/:channel_id/events, sobre este mismo
server HTTP de Express.
*/

if (!process.env.VERCEL) {
    app.listen(
        PORT,
        () => {
            console.log(
                `El servidor se esta escuchando correctamente en http://localhost:${PORT}`
            )
        }
    )
}

export default app

