import user_repository from "../repositories/user.repository.js"
import ServerError from "../utils/error.util.js"
import { updateOwnProfile, deleteOwnAccount } from "../services/user.services.js"


export async function getUsers(request, response) {
    const user_list = await user_repository.get()
    response.status(200).send({
        message: "Get users list",
        ok: true,
        status: 200,
        data: {
            users: user_list
        }
    })
}

export async function getUserById(request, response) {
    const user_id = request.params.user_id
    const user = await user_repository.getById(user_id)

    if (!user) {
        throw new ServerError("User not found", 404)
    }
    return response.status(200).send(
        {
            message: "Get user details successfully",
            status: 200,
            ok: true,
            data: {
                user: user
            }
        }
    )
}

/*
(Authenticated) GET /api/users/me
    Devuelve el perfil completo del usuario de la sesion, incluyendo
    foto_perfil y descripcion, que NO viajan dentro del JWT (el payload
    del token queda chico: solo id, name y email)
*/
export async function getMe(request, response) {
    const user = await user_repository.getById(request.user.id)

    if (!user) {
        throw new ServerError("User not found", 404)
    }

    return response.status(200).send(
        {
            message: "Perfil obtenido correctamente",
            status: 200,
            ok: true,
            data: {
                user: {
                    id: user._id,
                    nombre: user.nombre,
                    email: user.email,
                    foto_perfil: user.foto_perfil ?? null,
                    descripcion: user.descripcion ?? ''
                }
            }
        }
    )
}

/*
(Authenticated) PUT /api/users/me
    Cambia el nombre del usuario de la sesion y, opcionalmente, la descripcion
    y la foto de perfil. Devuelve un JWT re-firmado con el nombre actualizado
    (ademas del usuario actualizado con sus datos nuevos de perfil)
*/
export async function updateMe(request, response) {

    const { name, descripcion, foto_perfil } = request.body ?? {}

    const { user_updated, auth_token } = await updateOwnProfile(
        request.user.id,
        {
            name: name,
            descripcion: descripcion,
            foto_perfil: foto_perfil
        }
    )

    return response.status(200).send({
        message: "Perfil actualizado correctamente",
        status: 200,
        ok: true,
        data: {
            user_updated: {
                id: user_updated._id,
                nombre: user_updated.nombre,
                email: user_updated.email,
                foto_perfil: user_updated.foto_perfil ?? null,
                descripcion: user_updated.descripcion ?? ''
            },
            auth_token: auth_token
        }
    })
}

/*
(Authenticated) DELETE /api/users/me
    Borra la cuenta DEFINITIVAMENTE y sus datos asociados. Los espacios donde
    el usuario es el unico owner se eliminan por completo. Devuelve los
    espacios eliminados en data.workspaces_deleted
*/
export async function deleteMe(request, response) {

    const { user_deleted, workspaces_deleted } = await deleteOwnAccount(request.user.id)

    return response.status(200).send({
        message: "Cuenta eliminada correctamente",
        status: 200,
        ok: true,
        data: {
            account_deleted: true,
            user_deleted: {
                id: user_deleted._id,
                nombre: user_deleted.nombre,
                email: user_deleted.email
            },
            workspaces_deleted: workspaces_deleted
        }
    })
}