import request_log_repository from '../repositories/request-log.repository.js'

/*
Middleware de auditoria de consultas.

Registra IP, URL, endpoint, metodo, timestamp, user_id y status/duracion.
IMPORTANTE: nunca lee ni registra el body ni los headers de la request.

El registro se emite en el evento 'finish' de la respuesta porque recien ahi
tenemos el status final, el endpoint que matcheo y el user_id que dejo
authMiddleware en request.user (si la ruta requeria autenticacion).
*/

/* Parametros de query que no deben quedar en texto plano en los logs */
const SENSITIVE_QUERY_PARAMS = [
    'verification_token',
    'reset_token',
    'token',
    'auth_token'
]

/* Assets de Swagger y favicon: no aportan nada a la auditoria */
const EXCLUDED_PATH_PREFIXES = [
    '/api-docs',
    '/favicon.ico'
]

const MAX_URL_LENGTH = 2048

/*
Reemplaza el valor de los tokens sensibles por [REDACTED]
sin tocar el resto de la URL ni de la query.
*/
function redact_url(original_url) {
    const sensitive_params = SENSITIVE_QUERY_PARAMS.join('|')

    return original_url.replace(
        new RegExp(`([?&](?:${sensitive_params})=)[^&#]*`, 'gi'),
        '$1[REDACTED]'
    )
}

/*
Devuelve el patron de ruta de Express (ej: /api/workspaces/:workspace_id)
en lugar de la URL concreta con ids. Si la request no matcheo ninguna ruta
(404), devuelve null.

No usamos request.baseUrl porque Express lo restaura cuando el error sale del
router (por ejemplo un ServerError manejado por errorHandlerMiddleware), y en
el evento 'finish' ya valdria ''. En cambio reconstruimos el prefijo de montaje
matcheando el patron de request.route contra la URL real.
*/
function escape_regex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalize_endpoint(endpoint) {
    if (endpoint.length > 1 && endpoint.endsWith('/')) {
        return endpoint.slice(0, -1)
    }

    return endpoint
}

function get_endpoint(request) {
    if (!request.route || typeof request.route.path !== 'string') {
        return null
    }

    const route_path = request.route.path
    const pathname = request.originalUrl.split('?')[0]

    /*
    Una ruta declarada como '/' dentro de un router montado (ej: user_router.get('/'))
    matchea el prefijo completo de montaje, no exige que la URL termine en '/'.
    */
    if (route_path === '/') {
        return normalize_endpoint(pathname || '/')
    }

    const route_regex = new RegExp(
        escape_regex(route_path).replace(/:[A-Za-z0-9_]+/g, '[^/]+') + '$'
    )

    const match = pathname.match(route_regex)

    if (!match || match.index === undefined) {
        return route_path
    }

    const base_url = pathname.slice(0, match.index)

    return normalize_endpoint(`${base_url}${route_path}`)
}

/* IP del cliente. Normaliza el formato IPv4 mapeado a IPv6 (::ffff:127.0.0.1) */
function get_client_ip(request) {
    const ip = request.ip || request.socket?.remoteAddress || null

    if (!ip) {
        return null
    }

    return ip.startsWith('::ffff:') ? ip.slice(7) : ip
}

function is_excluded(request) {
    return EXCLUDED_PATH_PREFIXES.some(
        prefix => request.path.startsWith(prefix)
    )
}

export default function requestLogger(request, response, next) {

    if (is_excluded(request)) {
        return next()
    }

    const started_at = Date.now()
    const timestamp = new Date()

    response.on('finish', () => {
        const log_entry = {
            timestamp,
            ip: get_client_ip(request),
            method: request.method,
            url: redact_url(request.originalUrl).slice(0, MAX_URL_LENGTH),
            endpoint: get_endpoint(request),
            /* request.user lo setea authMiddleware solo en rutas protegidas */
            user_id: request.user?.id ? String(request.user.id) : null,
            status: response.statusCode,
            duration_ms: Date.now() - started_at
        }

        /*
        Escritura no bloqueante: no suma latencia a la respuesta.
        Si Mongo no esta disponible (por ejemplo en el 503 de conexion),
        el log se imprime igual en consola para no perderlo.
        */
        request_log_repository.create(log_entry).catch(error => {
            console.error(
                '[RequestLogger] No se pudo guardar el log en MongoDB:',
                error.message
            )
            console.error(JSON.stringify(log_entry))
        })
    })

    next()
}
