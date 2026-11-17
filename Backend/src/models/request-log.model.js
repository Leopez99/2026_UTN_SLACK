import mongoose from 'mongoose'

/*
Modelo de auditoria de consultas HTTP.

Cada request que recibe la API deja un documento en la coleccion RegistroConsulta.
NUNCA se guarda el body ni los headers (podrian contener credenciales).
Los tokens que viajan por query string se guardan redactados.
*/
const request_log_schema = new mongoose.Schema(
    {
        timestamp: {
            type: Date,
            default: Date.now
        },
        ip: {
            type: String,
            default: null
        },
        method: {
            type: String,
            required: true
        },
        url: {
            type: String,
            required: true,
            maxlength: 2048
        },
        endpoint: {
            /* Patron de ruta de Express, ej: /api/workspaces/:workspace_id */
            type: String,
            default: null
        },
        user_id: {
            /* String para que un id invalido en el JWT no rompa la escritura del log */
            type: String,
            default: null
        },
        status: {
            type: Number,
            required: true
        },
        duration_ms: {
            type: Number,
            required: true
        }
    },
    {
        versionKey: false,
        /* Si Mongo esta caido, la escritura falla rapido en vez de esperar el buffer */
        bufferCommands: false
    }
)

/*
El indice TTL tambien sirve para consultar/ordenar por timestamp.
Las consultas se conservan 30 dias y despues MongoDB las elimina solo.
*/
request_log_schema.index(
    { timestamp: -1 },
    { expireAfterSeconds: 60 * 60 * 24 * 30 }
)

request_log_schema.index({ endpoint: 1, timestamp: -1 })
request_log_schema.index({ user_id: 1, timestamp: -1 })

export const REQUEST_LOG_COLLECTION_NAME = 'RegistroConsulta'

const RequestLog = mongoose.model(REQUEST_LOG_COLLECTION_NAME, request_log_schema)

export default RequestLog
