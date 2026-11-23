import express from 'express'
import {
    createChannel,
    createChannelMessage,
    deleteChannel,
    getChannelMessages,
    getChannels
} from '../controllers/channel.controller.js'
import authMiddleware from '../middlewares/auth.middleware.js'
import workspaceMiddleware from '../middlewares/workspace.middleware.js'

/*
Router de canales de un espacio de trabajo.
Se monta anidado en /api/workspaces/:workspace_id/channels, por eso usa
mergeParams: true para recibir el workspace_id desde la ruta padre.

- GET    /                               (cualquier miembro) listar canales
- POST   /                               (owner, admin)      crear un canal
- DELETE /:channel_id                    (owner, admin)      eliminar un canal
- GET    /:channel_id/messages           (cualquier miembro) listar mensajes
- POST   /:channel_id/messages           (cualquier miembro) enviar un mensaje
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

channel_router.get(
    '/:channel_id/messages',
    authMiddleware,
    workspaceMiddleware([]),
    getChannelMessages
)

channel_router.post(
    '/:channel_id/messages',
    authMiddleware,
    workspaceMiddleware([]),
    createChannelMessage
)

export default channel_router
