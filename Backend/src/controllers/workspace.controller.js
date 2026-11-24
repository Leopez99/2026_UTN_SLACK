import workspace_repository from "../repositories/workspace.repository.js"
import member_repository from "../repositories/member.repository.js"
import channel_repository from "../repositories/channel.repository.js"
import channel_message_repository from "../repositories/channelMessage.repository.js"
import ServerError from "../utils/error.util.js"
import { DEFAULT_CHANNEL_NAME, toChannelResponse } from "../utils/channel.util.js"
import { validateWorkspaceLogo } from "../utils/logo.util.js"

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

    const { name, description, logo } = request.body

    /*
    El logo es opcional. Si viene, tiene que ser una data URL base64
    valida (PNG, JPG o WebP) y no superar los 200 KB decodificados.
    */
    const logo_error_mensaje = validateWorkspaceLogo(logo)
    if (logo_error_mensaje) {
        throw new ServerError(logo_error_mensaje, 400)
    }

    const workspace_created = await workspace_repository.createWorkspace(name, description, logo ?? null)

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
    const { name, description, logo } = request.body

    if (!name) {
        throw new ServerError("name es un campo requerido", 400)
    }

    /*
    El logo se actualiza solo si se envia en el body:
    - `logo: "data:image/..."` -> reemplaza el logo actual
    - `logo: null`             -> quita el logo
    - sin campo `logo`         -> conserva el logo actual
    */
    const logo_error_mensaje = validateWorkspaceLogo(logo)
    if (logo_error_mensaje) {
        throw new ServerError(logo_error_mensaje, 400)
    }

    const update_data = { nombre: name, description: description ?? '' }

    if (logo !== undefined) {
        update_data.logo = logo ?? null
    }

    const workspace_updated = await workspace_repository.updateById(
        workspace_id,
        update_data
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


export async function removeMember(request, response) {

    const { member_id } = request.params

    const member = await member_repository.getById(member_id)

    /*
    La membresia tiene que existir y pertenecer al workspace de la ruta.
    Si no, se responde 404 para no exponer membresias de otros espacios.
    */
    if (!member || String(member.fk_id_espacio_trabajo) !== String(request.workspace._id)) {
        throw new ServerError("Miembro no encontrado en este espacio de trabajo", 404)
    }

    /* Nadie se elimina a si mismo desde este endpoint */
    if (String(member.fk_id_usuario) === String(request.user.id)) {
        throw new ServerError("No podes eliminar tu propia membresia", 403)
    }

    /* El owner del espacio de trabajo no puede ser expulsado */
    if (member.rol === 'owner') {
        throw new ServerError("No se puede eliminar al owner del espacio de trabajo", 403)
    }

    /* Un admin solo puede expulsar usuarios comunes, no a otros admins */
    if (request.membership.rol === 'admin' && member.rol === 'admin') {
        throw new ServerError("Un admin no puede eliminar a otro admin", 403)
    }

    await member_repository.deleteById(member_id)

    return response.status(200).send({
        ok: true,
        message: "Miembro eliminado correctamente",
        status: 200,
        data: {
            member_deleted: {
                member_id: member._id,
                member_rol: member.rol,
                usuario_id: member.fk_id_usuario
            }
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
