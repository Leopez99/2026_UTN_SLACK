import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import { Server } from 'socket.io'
import ENVIRONMENT from '../config/environment.config.js'
import connectMongoDB from '../config/mongo.config.js'
import channel_repository from '../repositories/channel.repository.js'
import channel_message_repository from '../repositories/channelMessage.repository.js'
import member_repository from '../repositories/member.repository.js'
import { toChannelMessageResponse } from '../utils/channelMessage.util.js'
import {
    emitNewChannelMessage,
    getChannelRoom,
    setRealtimeServer
} from './realtime.emitter.js'

/*
WebSockets con Socket.IO montados sobre el mismo servidor HTTP de Express,
que es el patron que documenta Vercel para Functions (Fluid Compute).

Eventos:
- join_channel({ channel_id })        -> el usuario se suscribe al room del canal
- leave_channel({ channel_id })       -> se desuscribe
- send_message({ channel_id, contenido }) -> persiste y avisa a los demas
- mensaje-nuevo (server -> client)    -> payload { canal_id, mensaje }

Todos los eventos con callback responden { ok, message?, data? }.
*/

const MAX_MESSAGE_LENGTH = 30000

/*
Los origenes permitidos salen de URL_FRONTEND (admite varios separados por coma).
Si no esta configurado (dev local) se acepta cualquier origen, igual que el
middleware cors() de Express.
*/
function getAllowedOrigins() {
    const configured_origins = (ENVIRONMENT.URL_FRONTEND || '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)

    return configured_origins.length > 0 ? configured_origins : true
}

function getHandshakeToken(socket) {
    const auth_token = socket.handshake.auth?.token

    if (auth_token) {
        return auth_token
    }

    const auth_header = socket.handshake.headers?.authorization

    if (!auth_header) {
        return null
    }

    return auth_header.split(' ')[1] ?? null
}

function getAck(callback) {
    return typeof callback === 'function' ? callback : () => {}
}

/*
Valida que el canal exista y que el usuario autenticado sea miembro del
workspace al que pertenece. Devuelve { channel, membership } o null.
*/
async function getChannelAccess(user_id, channel_id) {
    if (!mongoose.isValidObjectId(channel_id)) {
        return null
    }

    const channel = await channel_repository.getById(channel_id)

    if (!channel) {
        return null
    }

    const membership = await member_repository.getMembershipByUserAndWorkspace(
        user_id,
        channel.fk_id_espacio_trabajo
    )

    if (!membership) {
        return null
    }

    return { channel, membership }
}

export function createRealtimeServer(http_server) {
    const io = new Server(http_server, {
        /*
        Vercel no soporta el long-polling HTTP de Socket.IO: la conexion tiene
        que ser WebSocket directo. El cliente usa transports: ['websocket'].
        */
        transports: ['websocket'],
        cors: {
            origin: getAllowedOrigins()
        }
    })

    /* Handshake autenticado con el mismo JWT que usa la API REST. */
    io.use(async (socket, next) => {
        try {
            await connectMongoDB()

            const auth_token = getHandshakeToken(socket)

            if (!auth_token) {
                return next(new Error('unauthorized'))
            }

            const { id, name, email } = jwt.verify(auth_token, ENVIRONMENT.JWT_SECRET_KEY)

            socket.data.user = { id, name, email }

            return next()
        }
        catch (error) {
            console.log('[Socket handshake]:', error.message)
            return next(new Error('unauthorized'))
        }
    })

    io.on('connection', (socket) => {

        socket.on('join_channel', async (payload, callback) => {
            const respond = getAck(callback)

            try {
                const channel_id = payload?.channel_id
                const access = await getChannelAccess(socket.data.user.id, channel_id)

                if (!access) {
                    return respond({ ok: false, message: 'Canal no encontrado' })
                }

                await socket.join(getChannelRoom(access.channel._id))

                return respond({
                    ok: true,
                    data: { canal_id: String(access.channel._id) }
                })
            }
            catch (error) {
                console.log('[Socket join_channel]:', error)
                return respond({ ok: false, message: 'No pudimos unirte al canal' })
            }
        })

        socket.on('leave_channel', async (payload, callback) => {
            const respond = getAck(callback)
            const channel_id = payload?.channel_id

            if (channel_id) {
                await socket.leave(getChannelRoom(channel_id))
            }

            return respond({ ok: true })
        })

        socket.on('send_message', async (payload, callback) => {
            const respond = getAck(callback)

            try {
                const channel_id = payload?.channel_id
                const content = payload?.contenido

                if (!content || !String(content).trim()) {
                    return respond({ ok: false, message: 'content es un campo requerido' })
                }

                const message_content = String(content).trim()

                if (message_content.length > MAX_MESSAGE_LENGTH) {
                    return respond({
                        ok: false,
                        message: `content no puede superar los ${MAX_MESSAGE_LENGTH} caracteres`
                    })
                }

                const access = await getChannelAccess(socket.data.user.id, channel_id)

                if (!access) {
                    return respond({ ok: false, message: 'Canal no encontrado' })
                }

                const message_created = await channel_message_repository.createMessage(
                    access.membership._id,
                    access.channel._id,
                    message_content
                )

                const message_response = toChannelMessageResponse(message_created)

                /* El emisor recibe su mensaje en el ack: no se le reenvia. */
                emitNewChannelMessage(access.channel._id, message_response, {
                    exclude_socket_id: socket.id
                })

                return respond({
                    ok: true,
                    data: { message_created: message_response }
                })
            }
            catch (error) {
                console.log('[Socket send_message]:', error)
                return respond({ ok: false, message: 'No pudimos enviar el mensaje' })
            }
        })
    })

    setRealtimeServer(io)

    return io
}
