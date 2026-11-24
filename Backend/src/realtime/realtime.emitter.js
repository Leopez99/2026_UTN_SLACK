/*
Registry del servidor Socket.IO y helpers de emision.

El servidor se crea una sola vez en main.js (createRealtimeServer) y se guarda
aca para que otras capas (por ejemplo los controllers REST) puedan emitir
eventos sin importar main.js y generar dependencias circulares.

En Vercel cada conexion queda "pineada" a una instancia de Function: este
registry solo alcanza a los sockets conectados a la misma instancia. Para
broadcast entre instancias hace falta un adaptador externo (Redis pub/sub).
*/

export const CHANNEL_MESSAGE_EVENT = 'mensaje-nuevo'

const CHANNEL_ROOM_PREFIX = 'canal:'

let realtime_server = null

export function setRealtimeServer(io) {
    realtime_server = io
}

export function getRealtimeServer() {
    return realtime_server
}

export function getChannelRoom(channel_id) {
    return `${CHANNEL_ROOM_PREFIX}${String(channel_id)}`
}

/*
Emite un mensaje nuevo a todos los sockets suscritos al canal.

exclude_socket_id permite saltear al socket que origino el mensaje (por
ejemplo el emisor por WebSocket, que ya recibe el mensaje en el ack).
*/
export function emitNewChannelMessage(channel_id, message, { exclude_socket_id = null } = {}) {
    if (!realtime_server) {
        return false
    }

    const room = getChannelRoom(channel_id)
    const event_payload = {
        canal_id: String(channel_id),
        mensaje: message
    }

    if (exclude_socket_id) {
        realtime_server
            .to(room)
            .except(exclude_socket_id)
            .emit(CHANNEL_MESSAGE_EVENT, event_payload)
    }
    else {
        realtime_server
            .to(room)
            .emit(CHANNEL_MESSAGE_EVENT, event_payload)
    }

    return true
}
