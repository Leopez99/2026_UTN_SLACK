import express from 'express'
import { createInvitation } from '../controllers/invitation.controller.js'
import authMiddleware from '../middlewares/auth.middleware.js'
import workspaceMiddleware from '../middlewares/workspace.middleware.js'

/*
Router de invitaciones de un espacio de trabajo.
Se monta anidado en /api/workspaces/:workspace_id/invitations, por eso usa
mergeParams: true para recibir el workspace_id desde la ruta padre.

- POST /   (cualquier miembro, sin importar el rol) invitar a un usuario registrado.
  El rol del invitado lo define el controller: solo un owner puede invitar con rol admin.
*/
const invitation_router = express.Router({ mergeParams: true })

invitation_router.post(
    '/',
    authMiddleware,
    workspaceMiddleware([]),   // [] = cualquier miembro (user, admin u owner) puede invitar
    createInvitation
)

export default invitation_router
