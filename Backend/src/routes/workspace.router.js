import express from 'express'
import {
    createWorkspace,
    deleteWorkspace,
    getWorkspaceById,
    getWorkspaceMembers,
    getWorkspaces,
    updateWorkspace
} from '../controllers/workspace.controller.js'
import authMiddleware from '../middlewares/auth.middleware.js'
import workspaceMiddleware from '../middlewares/workspace.middleware.js'
import channel_router from './channels.router.js'

const workspace_router = express.Router()


/* 
(Authentified) GET /api/workspace
    Traer la lista de espacios de trabajo asocidadas a ese usuario (basicamente sus membresias), con el rol de membresia en cada espacio de trabajo
*/
workspace_router.get(
    '/',
    authMiddleware,
    getWorkspaces
)

/* 
(Authentified) POST /api/workspace
    Crear un nuevo espacio de trabajo con el nombre y la descripcion enviados en el body.
    El usuario que lo crea queda automaticamente como miembro con rol 'owner'
*/
workspace_router.post(
    '/',
    authMiddleware,
    createWorkspace
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
    getWorkspaceById
)

/* 
(owner) DELETE /api/workspace/:workspace_id
    Eliminar el espacio de trabajo seleccionado y todas las membresias asociadas a el
*/
workspace_router.delete(
    '/:workspace_id',
    authMiddleware,
    workspaceMiddleware(['owner']),
    deleteWorkspace
)

/* 
(owner, admin) PUT /api/workspace/:workspace_id
    Actualizar el nombre y la descripcion del espacio de trabajo seleccionado (ambos campos son requeridos)
*/
workspace_router.put(
    '/:workspace_id',
    authMiddleware,
    workspaceMiddleware(['owner', 'admin']),
    updateWorkspace
)

/* 
(todos) GET /api/workspace/:workspace_id/members
    Traer la lista de miembros de un workspace
*/
workspace_router.get(
    '/:workspace_id/members',
    authMiddleware,
    workspaceMiddleware([]),   // [] = cualquier miembro puede verla
    getWorkspaceMembers
)

/* 
Canales del espacio de trabajo.
El router de canales valida la membresia y el rol de cada operacion.
    GET    /api/workspaces/:workspace_id/channels
    POST   /api/workspaces/:workspace_id/channels            (owner, admin)
    DELETE /api/workspaces/:workspace_id/channels/:channel_id (owner, admin)
*/
workspace_router.use(
    '/:workspace_id/channels',
    channel_router
)

export default workspace_router
