import express from 'express'
import {
    createChannel,
    deleteChannel,
    getChannels
} from '../controllers/channel.controller.js'
import authMiddleware from '../middlewares/auth.middleware.js'
import workspaceMiddleware from '../middlewares/workspace.middleware.js'

/*
Router de canales de un espacio de trabajo.
Se monta anidado en /api/workspaces/:workspace_id/channels, por eso usa
mergeParams: true para recibir el workspace_id desde la ruta padre.

- GET    /  (cualquier miembro) listar canales
- POST   /  (owner, admin)      crear un canal
- DELETE /:channel_id (owner, admin) eliminar un canal
*/
const channel_router = express.Router({ mergeParams: true })

channel_router.get(
    '/',
    authMiddleware,
    workspaceMiddleware([]),
    getChannels
)

channel_router.post(
    '/',
    authMiddleware,
    workspaceMiddleware(['owner', 'admin']),
    createChannel
)

channel_router.delete(
    '/:channel_id',
    authMiddleware,
    workspaceMiddleware(['owner', 'admin']),
    deleteChannel
)

export default channel_router
