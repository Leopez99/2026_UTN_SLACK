import express from 'express'
import { getUserById, getUsers } from '../controllers/user.controller.js'

const user_router = express.Router()

/* 
(Unauthentified) GET /api/users
    Traer la lista completa de usuarios registrados
    (Ojo: esta ruta hoy no usa authMiddleware, queda publica)
*/
user_router.get(
    '/',
    getUsers
)

/* 
(Unauthentified) GET /api/users/:user_id
    Traer los datos de un usuario en particular por su id. Responde 404 si no existe
    (Ojo: esta ruta hoy no usa authMiddleware, queda publica)
*/
user_router.get(
    '/:user_id',
    getUserById
)

export default user_router