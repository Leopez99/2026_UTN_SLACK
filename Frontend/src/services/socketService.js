import { io } from 'socket.io-client'

const API_URL = import.meta.env.VITE_APP_URL_BACKEND
const SEND_MESSAGE_TIMEOUT_MS = 8000

/*
Un unico socket por pestaña, compartido por toda la app.

- transports: ['websocket'] es obligatorio en Vercel: el long-polling HTTP de
  Socket.IO no funciona con el ciclo de vida de las Vercel Functions.
- autoConnect: false para abrir la conexion recien cuando hay un canal abierto.
- Socket.IO reconecta solo (con backoff) cuando Vercel cierra la conexion al
  llegar a la duracion maxima de la Function.
*/

let socket = null

export function getSocket() {
    if (!socket) {
        socket = io(API_URL, {
            transports: ['websocket'],
            autoConnect: false
        })
    }

    return socket
}

export function connectSocket() {
    const auth_token = localStorage.getItem('auth_token')

    if (!auth_token) {
        return null
    }

    const current_socket = getSocket()

    current_socket.auth = { token: auth_token }

    if (!current_socket.connected) {
        current_socket.connect()
    }

    return current_socket
}

export function isSocketConnected() {
    return Boolean(socket?.connected)
}

export function sendChannelMessage(channel_id, contenido) {
    return new Promise((resolve, reject) => {
        const current_socket = connectSocket()

        if (!current_socket) {
            return reject(new Error('Tu sesión expiró, volvé a iniciar sesión'))
        }

        current_socket
            .timeout(SEND_MESSAGE_TIMEOUT_MS)
            .emit(
                'send_message',
                { channel_id, contenido },
                (timeout_error, response_body) => {
                    if (timeout_error) {
                        return reject(new Error('El servidor no respondió a tiempo. Probá de nuevo.'))
                    }

                    if (!response_body?.ok) {
                        return reject(new Error(response_body?.message || 'No pudimos enviar el mensaje'))
                    }

                    return resolve(response_body?.data?.message_created ?? null)
                }
            )
    })
}

export function disconnectSocket() {
    if (!socket) {
        return
    }

    socket.removeAllListeners()
    socket.disconnect()
    socket = null
}
