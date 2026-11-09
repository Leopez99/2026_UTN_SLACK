import express from 'express'
import authMiddleware from '../middlewares/auth.middleware.js'

const channel_router = express.Router({mergeParams: true})

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

