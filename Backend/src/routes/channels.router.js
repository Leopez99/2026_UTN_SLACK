import express from 'express'
import { getChannels } from '../controllers/channel.controller.js'
import authMiddleware from '../middlewares/auth.middleware.js'

const channel_router = express.Router({mergeParams: true})

/* 
(Authentified) GET /api/channels
    Traer la lista de canales (endpoint de prueba).
    Este router usa mergeParams porque esta pensado para montarse tambien anidado en
    /api/workspaces/:workspace_id/channels, donde recibe el workspace_id por params
*/
channel_router.get(
    '/',
    authMiddleware,
    getChannels
)

export default channel_router
