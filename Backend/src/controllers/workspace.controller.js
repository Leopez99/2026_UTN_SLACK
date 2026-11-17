import workspace_repository from "../repositories/workspace.repository.js"
import member_repository from "../repositories/member.repository.js"
import channel_repository from "../repositories/channel.repository.js"
import channel_message_repository from "../repositories/channelMessage.repository.js"
import ServerError from "../utils/error.util.js"
import { DEFAULT_CHANNEL_NAME, toChannelResponse } from "../utils/channel.util.js"

/*
Los controllers son la capa HTTP de la API:
- Reciben la request, delegan la logica de negocio en la capa de repositorios (repositories/)
- Y arman la response con el formato que devuelve la API
*/

export async function getWorkspaces(request, response) {

    const workspaces_obtenidos = await member_repository.getAllWorkspaceByUserId(request.user.id)

    return response.status(200).send({
        ok: true,
        message: "Obtenidos todos los datos",
        status: 200,
        data: {
            workspaces: workspaces_obtenidos
        }
    })
}


export async function createWorkspace(request, response) {

    console.log('[CREATE WORKSPACE]', request.user)
    const { name, description } = request.body

    const workspace_created = await workspace_repository.createWorkspace(name, description)

    let owner_membership
    let default_channel

    /*
    Todo espacio nuevo arranca con el canal General.
    Si falla la membresia o el canal, se deshace la creacion para no dejar
    espacios a medio armar (Mongo standalone no soporta transacciones).
    */
    try {
        owner_membership = await member_repository.create(
            request.user.id,
            workspace_created._id,
            'owner'
        )

        default_channel = await channel_repository.createChannel(
            DEFAULT_CHANNEL_NAME,
            'Canal general del espacio de trabajo',
            workspace_created._id
        )
    }
    catch (error) {
        await Promise.allSettled([
            channel_repository.deleteAllByWorkspaceId(workspace_created._id),
            member_repository.deleteAllMembershipsByWorkspaceId(workspace_created._id),
            workspace_repository.deleteById(workspace_created._id)
        ])

        throw error
    }

    return response.status(201).send(
        {
            ok: true,
            status: 201,
            message: "Workspace creado",
            data: {
                workspace_created,
                owner_membership,
                default_channel: toChannelResponse(default_channel)
            }
        }
    )
}


export async function getWorkspaceById(request, response) {

    const members = await member_repository.getAllMembershipsByWorkspaceId(request.workspace._id)

    return response.status(200).send({
        ok: true,
        message: "Workspace obtenido correctamente",
        status: 200,
        data: {
            workspace_selected: request.workspace,
            members
        }
    })
}


export async function deleteWorkspace(request, response) {

    const channel_ids = await channel_repository.deleteAllByWorkspaceId(request.workspace._id)

    await channel_message_repository.deleteAllByChannelIds(channel_ids)
    await workspace_repository.deleteById(request.workspace._id)
    await member_repository.deleteAllMembershipsByWorkspaceId(request.workspace._id)

    return response.status(200).send({
        ok: true,
        message: "Workspace eliminado correctamente",
        status: 200,
        data: {
            workspace_deleted: request.workspace
        }
    })
}


export async function updateWorkspace(request, response) {

    const { workspace_id } = request.params
    const { name, description } = request.body

    if (!name || !description) {
        throw new ServerError("name y description son campos requeridos", 400)
    }

    const workspace_updated = await workspace_repository.updateById(
        workspace_id,
        { nombre: name, description }
    )

    return response.status(200).send({
        ok: true,
        message: "Workspace actualizado correctamente",
        status: 200,
        data: {
            workspace_updated
        }
    })
}


export async function getWorkspaceMembers(request, response) {

    const members = await member_repository.getAllMembershipsByWorkspaceId(request.workspace._id)

    return response.status(200).send({
        ok: true,
        message: "Miembros obtenidos correctamente",
        status: 200,
        data: { members }
    })
}
