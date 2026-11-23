import mongoose from "mongoose"
import user_repository from "../repositories/user.repository.js"
import member_repository from "../repositories/member.repository.js"
import channel_repository from "../repositories/channel.repository.js"
import ServerError from "../utils/error.util.js"
import { toChannelResponse } from "../utils/channel.util.js"

/*
Los controllers son la capa HTTP de la API:
- Reciben la request, delegan la logica de negocio en la capa de repositorios (repositories/)
- Y arman la response con el formato que devuelve la API

Estas rutas se montan anidadas en /api/workspaces/:workspace_id/invitations,
por eso el middleware de workspace ya dejo el espacio validado en request.workspace
y la membresia del usuario (sin importar el rol) en request.membership.
*/

/* 
    (Cualquier miembro, sin importar el rol) POST /api/workspaces/:workspace_id/invitations
    Invita a un usuario registrado a sumarse al espacio de trabajo.

    Body:
    - email (requerido): email de un usuario ya registrado
    - channel_id (opcional): canal del workspace al que se invita (referencia)

    La invitacion agrega al usuario directo como miembro con rol 'user'.
*/
export async function createInvitation(request, response) {

    const { email, channel_id } = request.body

    if (!email || !String(email).trim()) {
        throw new ServerError('email es un campo requerido', 400)
    }

    const email_invitado = String(email).trim().toLowerCase()

    /* El destinatario de la invitacion tiene que ser un usuario registrado */
    const user_invitado = await user_repository.getByEmail(email_invitado)

    if (!user_invitado) {
        throw new ServerError('El email no pertenece a un usuario registrado', 404)
    }

    /* Canal opcional: si viene, tiene que existir y pertenecer al workspace ya validado */
    let canal = null

    if (channel_id) {
        if (!mongoose.isValidObjectId(channel_id)) {
            throw new ServerError('Canal no encontrado', 404)
        }

        canal = await channel_repository.getById(channel_id)

        const canal_del_workspace =
            canal && String(canal.fk_id_espacio_trabajo) === String(request.workspace._id)

        if (!canal_del_workspace) {
            throw new ServerError('Canal no encontrado', 404)
        }
    }

    /* Si el invitado ya es miembro del espacio, no hace falta invitarlo */
    const membership_existente = await member_repository.getMembershipByUserAndWorkspace(
        user_invitado._id,
        request.workspace._id
    )

    if (membership_existente) {
        throw new ServerError('El usuario ya es miembro de este espacio de trabajo', 409)
    }

    const membership_created = await member_repository.create(
        user_invitado._id,
        request.workspace._id,
        'user'
    )

    return response.status(201).send({
        ok: true,
        status: 201,
        message: 'Invitación enviada',
        data: {
            invitation_created: {
                member_id: membership_created._id,
                member_rol: membership_created.rol,
                fecha_creacion: membership_created.fecha_creacion,
                usuario: {
                    id: user_invitado._id,
                    nombre: user_invitado.nombre,
                    email: user_invitado.email
                },
                canal: canal ? toChannelResponse(canal) : null
            }
        }
    })
}
