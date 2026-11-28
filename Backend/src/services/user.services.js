/*
La capa de SERVICIOS contiene la logica de negocio de cada endpoint:
aqui viven las validaciones, las reglas y los flujos de la aplicacion.

Configuracion de la propia cuenta:
- updateOwnProfile: cambia el nombre (y descripcion/foto de perfil) del usuario
  logueado y re-emite el JWT
  (el payload del token guarda el nombre, si no se re-emite quedaría viejo)
- deleteOwnAccount: borra la cuenta DEFINITIVAMENTE con borrado en cascada:
  ~ Los espacios donde el usuario es el UNICO owner se eliminan por completo
    (con sus canales y mensajes y las membresias de todos sus integrantes)
  ~ En espacios ajenos, se borran los MENSAJES escritos por el usuario y su
    membresia, pero el espacio y los demas miembros quedan intactos
*/

import jwt from 'jsonwebtoken'
import ENVIRONMENT from "../config/environment.config.js"
import user_repository from "../repositories/user.repository.js"
import member_repository from "../repositories/member.repository.js"
import workspace_repository from "../repositories/workspace.repository.js"
import channel_repository from "../repositories/channel.repository.js"
import channel_message_repository from "../repositories/channelMessage.repository.js"
import ServerError from "../utils/error.util.js"
import { validateProfilePhoto } from "../utils/logo.util.js"

/* Firma una credencial de sesion con el mismo payload que usa el login */
function signAuthToken(user) {
    return jwt.sign(
        {
            id: user._id,
            name: user.nombre,
            email: user.email
        },
        ENVIRONMENT.JWT_SECRET_KEY
    )
}

/*
Cambio de datos del propio usuario (nombre, descripcion y foto de perfil):
1. Valida el nombre y la descripcion recibidos
2. Valida la foto: si viene tiene que ser una data URL base64 (PNG/JPG/WebP)
   de hasta 200 KB. Semantica de 3 estados igual que el logo de workspace:
   ~ foto_perfil omitido -> se conserva la actual
   ~ foto_perfil: null   -> se quita la foto
   ~ foto_perfil: "data..." -> reemplaza la foto
3. Verifica que el usuario exista y este activo
4. Actualiza los campos y firma un token nuevo con el nombre actualizado
   (la foto y la descripcion NO viajan en el JWT: quedan solo en DB y la
   config se las trae con GET /api/users/me)
*/
export async function updateOwnProfile(user_id, { name, descripcion, foto_perfil }) {

    if (!name || typeof name !== 'string' || !name.trim()) {
        throw new ServerError('name es un campo requerido', 400)
    }

    const new_name = name.trim()

    if (new_name.length > 60) {
        throw new ServerError('name no puede superar los 60 caracteres', 400)
    }

    /* La descripcion es opcional: si viene se acota a 160 caracteres.
       `undefined` significa "no toco la descripcion" y se conserva la actual */
    let descripcion_actual

    if (descripcion !== undefined) {
        descripcion_actual = typeof descripcion === 'string' ? descripcion.trim() : ''

        if (descripcion_actual.length > 160) {
            throw new ServerError('descripcion no puede superar los 160 caracteres', 400)
        }
    }

    const foto_error = validateProfilePhoto(foto_perfil)
    if (foto_error) {
        throw new ServerError(foto_error, 400)
    }

    const user = await user_repository.getById(user_id)

    if (!user || !user.activo) {
        throw new ServerError('Usuario no encontrado', 404)
    }

    const update_data = {
        nombre: new_name
    }

    if (descripcion !== undefined) {
        update_data.descripcion = descripcion_actual
    }

    /* Solo se toca la foto si el campo vino en el body (omitido = conserva) */
    if (foto_perfil !== undefined) {
        update_data.foto_perfil = foto_perfil ?? null
    }

    const user_updated = await user_repository.updateById(
        user_id,
        update_data
    )

    const auth_token = signAuthToken(user_updated)

    return {
        user_updated: user_updated,
        auth_token: auth_token
    }
}

/*
Borrado definitivo de la propia cuenta:
1. Verifica que el usuario exista
2. Recorre sus membresias: los espacios donde es el UNICO owner se borran
   por completo (canales -> mensajes -> membresias de todos -> workspace)
3. Borra los mensajes escritos por todas sus membresias restantes
4. Borra sus membresias restantes y por ultimo el usuario

Mongo standalone no soporta transacciones, por eso se borra con el mismo
orden en cascada que usa deleteWorkspace (hijos primero, padre al final).
*/
export async function deleteOwnAccount(user_id) {

    const user = await user_repository.getById(user_id)

    if (!user) {
        throw new ServerError('Usuario no encontrado', 404)
    }

    const workspaces_deleted = []

    const memberships = await member_repository.getAllByUserId(user_id)

    for (const membership of memberships) {

        if (membership.rol !== 'owner') {
            continue
        }

        const workspace_id = membership.fk_id_espacio_trabajo

        /* Solo se elimina el espacio si el usuario es el unico owner:
           si hay otro owner, el espacio sigue vivo sin su membresia */
        const owner_count = await member_repository.countOwnersByWorkspaceId(workspace_id)

        if (owner_count > 1) {
            continue
        }

        /* Borrado en cascada del espacio (mismo orden que deleteWorkspace) */
        const channel_ids = await channel_repository.deleteAllByWorkspaceId(workspace_id)
        await channel_message_repository.deleteAllByChannelIds(channel_ids)
        await workspace_repository.deleteById(workspace_id)
        await member_repository.deleteAllMembershipsByWorkspaceId(workspace_id)

        workspaces_deleted.push({
            workspace_id: workspace_id
        })
    }

    /* En los espacios que sobrevivieron, se borran los mensajes escritos
       por el usuario (se identifican por su membresia) */
    const remaining_memberships = await member_repository.getAllByUserId(user_id)

    await channel_message_repository.deleteAllByMemberIds(
        remaining_memberships.map(membership => membership._id)
    )

    /* Sus membresias restantes y el propio usuario */
    await member_repository.deleteAllByUserId(user_id)
    await user_repository.deleteById(user_id)

    return {
        user_deleted: user,
        workspaces_deleted: workspaces_deleted
    }
}
