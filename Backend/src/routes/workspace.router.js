import express from 'express'
import workspace_repository from '../repositories/workspace.repository.js'
import member_repository from '../repositories/member.repository.js'
import authMiddleware from '../middlewares/auth.middleware.js'
import channel_router from './channels.router.js'
import ServerError from '../utils/error.util.js'
import workspaceMiddleware from '../middlewares/workspace.middleware.js'

const workspace_router = express.Router()


/* 
(Authentified) GET /api/workspace
    Traer la lista de espacios de trabajo asocidadas a ese usuario (basicamente sus membresias), con el rol de membresia en cada espacio de trabajo
*/
workspace_router.get(
    '/',
    authMiddleware,
    async (request, response) => {
        
        const workspaces_obtenidos = await member_repository.getAllWorkspaceByUserId(request.user.id)
        return response.status(200).send({
            ok:true,
            message: "Obtenidos todos los datos",
            status: 200,
            data: {
                workspaces: workspaces_obtenidos
            }
        })
    }
)

/* 
(Authentified) POST /api/workspace
    Crear un nuevo espacio de trabajo con el nombre y la descripcion enviados en el body.
    El usuario que lo crea queda automaticamente como miembro con rol 'owner'
*/
workspace_router.post(
    '/',
    authMiddleware,
    async (request, response) => {
        console.log('[CREATE WORKSPACE]', request.user)
        const {name, description} = request.body



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
                message: "Por ahora todo bien",
                data: {
                    workspace_created,
                    owner_membership
                }
            }
        )
    }
)

/* 
(todos) GET /api/workspace/:workspace_id
    Traer los datos del espacio de trabajo seleccionado.
    Solo un miembro de ese espacio de trabajo puede consultarlo
*/
workspace_router.get(
    '/:workspace_id', 
    authMiddleware,
    workspaceMiddleware([]),
    async (request, response) => {
        

        return response.status(200).send({
            ok: true,
            message: "Workspace obtenido correctamente",
            status: 200,
            data: {
                workspace_selected: request.workspace
            }
        })
    }
)

/* 
(owner) DELETE /api/workspace/:workspace_id
    Eliminar el espacio de trabajo seleccionado y todas las membresias asociadas a el
*/
workspace_router.delete(
    '/:workspace_id',
    authMiddleware,
    workspaceMiddleware(['owner']),
    async (request, response) => {
        await  workspace_repository.deleteById(request.workspace._id)
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
)

/* 
(owner, admin) PUT /api/workspace/:workspace_id
    Actualizar el nombre y la descripcion del espacio de trabajo seleccionado (ambos campos son requeridos)
*/
workspace_router.put(
    '/:workspace_id',
    authMiddleware,
    workspaceMiddleware(['owner', 'admin']),
    async (request, response) => {
        const { workspace_id } = request.params
        const { name, description } = request.body

        if(!name || !description){
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
)

/* 
(todos) GET /api/workspace/:workspace_id/members
    Traer la lista de miembros de un workspace
*/
workspace_router.get(
    '/:workspace_id/members',
    authMiddleware,
    workspaceMiddleware([]),   // [] = cualquier miembro puede verla
    async (request, response) => {
        const members = await member_repository.getAllMembershipsByWorkspaceId(request.workspace._id)

        return response.status(200).send({
            ok: true,
            message: "Miembros obtenidos correctamente",
            status: 200,
            data: { members }
        })
    }
)

export default workspace_router
