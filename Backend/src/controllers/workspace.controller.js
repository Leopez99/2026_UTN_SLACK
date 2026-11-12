import workspace_repository from "../repositories/workspace.repository.js"
import member_repository from "../repositories/member.repository.js"
import ServerError from "../utils/error.util.js"

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
    const owner_membership = await member_repository.create(
        request.user.id,
        workspace_created._id,
        'owner'
    )

    return response.status(201).send(
        {
            ok: true,
            status: 201,
            message: "Workspace creado",
            data: {
                workspace_created,
                owner_membership
            }
        }
    )
}


export async function getWorkspaceById(request, response) {

    return response.status(200).send({
        ok: true,
        message: "Workspace obtenido correctamente",
        status: 200,
        data: {
            workspace_selected: request.workspace
        }
    })
}


export async function deleteWorkspace(request, response) {

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
