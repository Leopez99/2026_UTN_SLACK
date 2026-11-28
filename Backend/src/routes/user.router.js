import express from 'express'
import { getUserById, getUsers, getMe, updateMe, deleteMe } from '../controllers/user.controller.js'
import authMiddleware from '../middlewares/auth.middleware.js'

const user_router = express.Router()

/*
(Authenticated) GET /api/users/me
    Perfil completo del usuario de la sesion, con foto_perfil y descripcion
    (esos datos no viajan dentro del JWT)
*/
user_router.get(
    '/me',
    authMiddleware,
    getMe
)

/*
(Authenticated) PUT /api/users/me
    Cambiar el nombre del propio usuario y, opcionalmente, la descripcion y
    la foto de perfil. Devuelve el usuario actualizado y un token nuevo
    firmado con ese nombre
*/
user_router.put(
    '/me',
    authMiddleware,
    updateMe
)

/* 
(Authenticated) DELETE /api/users/me
    Borrar la cuenta definitivamente (con sus espacios propios en cascada)
*/
user_router.delete(
    '/me',
    authMiddleware,
    deleteMe
)

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