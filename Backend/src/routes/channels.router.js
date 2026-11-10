import express from 'express'
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
    (request, response) => {
        response.status(200).send({
            ok: true,
            message: 'Channel'
        })
    }
)

export default channel_router

