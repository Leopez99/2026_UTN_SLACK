/*
Server-Sent Events (SSE): push de mensajes nuevos sobre HTTP puro, sin
dependencias externas (reemplaza al Socket.IO anterior).

Registry en memoria de las conexiones SSE abiertas por canal. El servidor
se crea una sola vez por request (streamChannelEvents en channel.controller)
y las demas capas (por ejemplo los controllers REST) emiten eventos a esas
conexiones sin importar main.js y generar dependencias circulares.

En Vercel cada conexion queda "pineada" a una instancia de Function: este
registry solo alcanza a las conexiones abiertas en la misma instancia. Para
broadcast entre instancias hace falta un adaptador externo (Redis pub/sub).
*/

export const CHANNEL_MESSAGE_EVENT = 'mensaje-nuevo'

const HEARTBEAT_INTERVAL_MS = 25000

/* channel_id (string) -> Set de conexiones abiertas */
const channel_subscriptions = new Map()

function getSubscriptions(channel_id) {
    const channel_key = String(channel_id)

    if (!channel_subscriptions.has(channel_key)) {
        channel_subscriptions.set(channel_key, new Set())
    }

    return channel_subscriptions.get(channel_key)
}

/*
Escribe un bloque de evento SSE en la respuesta del cliente. Devuelve false
si la conexion ya cerro, para que el caller la limpie del registry.
*/
function writeEvent(response, { event, data }) {
    if (response.writableEnded) {
        return false
    }

    response.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)

    return true
}

/*
Suscribe la respuesta de un request al feed del canal y arranca el heartbeat
(comentarios ":" que mantienen viva la conexion a traves de proxies).

member_id es la membresia del usuario en el workspace: es la clave que
despues usa emitNewChannelMessage para no reenviarle su propio mensaje.

Devuelve la funcion de limpieza: corta el heartbeat y desuscribe la conexion.
*/
export function subscribeToChannelEvents(channel_id, response, member_id) {
    const subscription = { response, member_id: String(member_id) }
    const subscriptions = getSubscriptions(channel_id)

    subscriptions.add(subscription)

    const heartbeat = setInterval(() => {
        if (!response.writableEnded) {
            response.write(':ping\n\n')
            return
        }

        unsubscribe()
    }, HEARTBEAT_INTERVAL_MS)

    function unsubscribe() {
        clearInterval(heartbeat)
        subscriptions.delete(subscription)

        if (subscriptions.size === 0) {
            channel_subscriptions.delete(String(channel_id))
        }
    }

    request_cleanup_on_close(response, unsubscribe)

    return unsubscribe
}

/*
Por si el cliente corta sin que el controller vea 'close' (por ejemplo cuando
la plataforma termina la Function), se limpia igual en el cierre del stream.
*/
function request_cleanup_on_close(response, unsubscribe) {
    response.on?.('close', unsubscribe)
}

/*
Emite un mensaje nuevo a las conexiones del canal. El autor no recibe su
propio mensaje (ya lo agrego la pantalla desde la respuesta REST), asi que
se lo excluye por su member_id, que viaja en el autor del mensaje.
*/
export function emitNewChannelMessage(channel_id, message) {
    const author_member_id = message?.autor?.member_id

    if (author_member_id == null) {
        return false
    }

    const author_key = String(author_member_id)
    const subscriptions = channel_subscriptions.get(String(channel_id))

    if (!subscriptions) {
        return false
    }

    let delivered = false

    for (const subscription of subscriptions) {
        if (subscription.member_id === author_key) {
            continue
        }

        delivered = writeEvent(subscription.response, {
            event: CHANNEL_MESSAGE_EVENT,
            data: {
                canal_id: String(channel_id),
                mensaje: message
            }
        }) || delivered
    }

    if (subscriptions.size === 0) {
        channel_subscriptions.delete(String(channel_id))
    }

    return delivered
}
