import mongoose from "mongoose"
import channel_repository from "../repositories/channel.repository.js"
import channel_message_repository from "../repositories/channelMessage.repository.js"
import { emitNewChannelMessage } from "../realtime/realtime.emitter.js"
import ServerError from "../utils/error.util.js"
import { DEFAULT_CHANNEL_NAME, toChannelResponse } from "../utils/channel.util.js"
import { toChannelMessageResponse } from "../utils/channelMessage.util.js"

/*
Los controllers son la capa HTTP de la API:
- Reciben la request, delegan la logica de negocio en la capa de repositorios (repositories/)
- Y arman la response con el formato que devuelve la API

Estas rutas se montan anidadas en /api/workspaces/:workspace_id/channels,
por eso el middleware de workspace ya dejo el espacio validado en request.workspace
y la membresia del usuario en request.membership.
*/

/* Valida el channel_id de la ruta y que el canal pertenezca al workspace
   validado por workspaceMiddleware. */
async function getWorkspaceChannelOrThrow(request) {

    const { channel_id } = request.params

    if (!mongoose.isValidObjectId(channel_id)) {
        throw new ServerError('Canal no encontrado', 404)
    }

    const channel = await channel_repository.getById(channel_id)

    const channel_belongs_to_workspace =
        channel && String(channel.fk_id_espacio_trabajo) === String(request.workspace._id)

    if (!channel_belongs_to_workspace) {
        throw new ServerError('Canal no encontrado', 404)
    }

    return channel
}

export async function getChannels(request, response) {

    const channels = await channel_repository.getAllChannelsByWorkspaceId(request.workspace._id)

    return response.status(200).send({
        ok: true,
        status: 200,
        message: 'Canales obtenidos correctamente',
        data: {
            channels: channels.map(toChannelResponse)
        }
    })
}


export async function createChannel(request, response) {

    const { name, description, categoria } = request.body

    if (!name || !String(name).trim()) {
        throw new ServerError('name es un campo requerido', 400)
    }

    const channel_name = String(name).trim()
    const channel_description = String(description || '').trim()
    const channel_category = categoria ? String(categoria).trim() : null

    if (channel_name.length > 60) {
        throw new ServerError('name no puede superar los 60 caracteres', 400)
    }

    if (channel_description.length > 1000) {
        throw new ServerError('description no puede superar los 1000 caracteres', 400)
    }

    if (channel_category && channel_category.length > 60) {
        throw new ServerError('categoria no puede superar los 60 caracteres', 400)
    }

    const channel_created = await channel_repository.createChannel(
        channel_name,
        channel_description,
        request.workspace._id,
        channel_category
    )

    return response.status(201).send({
        ok: true,
        status: 201,
        message: 'Canal creado',
        data: {
            channel_created: toChannelResponse(channel_created)
        }
    })
}


export async function deleteChannel(request, response) {

    const channel = await getWorkspaceChannelOrThrow(request)

    if (channel.nombre === DEFAULT_CHANNEL_NAME) {
        throw new ServerError('El canal General del espacio no se puede eliminar', 403)
    }

    await channel_repository.deleteById(channel._id)
    await channel_message_repository.deleteAllByChannelId(channel._id)

    return response.status(200).send({
        ok: true,
        status: 200,
        message: 'Canal eliminado correctamente',
        data: {
            channel_deleted: toChannelResponse(channel)
        }
    })
}


export async function getChannelMessages(request, response) {

    const channel = await getWorkspaceChannelOrThrow(request)
    const messages = await channel_message_repository.getAllMessagesByChannelId(channel._id)

    return response.status(200).send({
        ok: true,
        status: 200,
        message: 'Mensajes obtenidos correctamente',
        data: {
            messages: messages.map(toChannelMessageResponse)
        }
    })
}


export async function createChannelMessage(request, response) {

    const channel = await getWorkspaceChannelOrThrow(request)
    const { content } = request.body

    if (!content || !String(content).trim()) {
        throw new ServerError('content es un campo requerido', 400)
    }

    const message_content = String(content).trim()

    if (message_content.length > 30000) {
        throw new ServerError('content no puede superar los 30000 caracteres', 400)
    }

    const message_created = await channel_message_repository.createMessage(
        request.membership._id,
        channel._id,
        message_content
    )

    const message_response = toChannelMessageResponse(message_created)

    /* Avisa por WebSocket a los miembros suscritos al canal (si esta instancia
       tiene el servidor realtime activo). */
    emitNewChannelMessage(channel._id, message_response)

    return response.status(201).send({
        ok: true,
        status: 201,
        message: 'Mensaje creado',
        data: {
            message_created: message_response
        }
    })
}
