/*
Los mensajes se guardan en Mongo con campos en español (contenido, fecha_creacion,
fk_miembro_id, fk_canal_id) y se devuelven a la API con el prefijo mensaje_* que
ya usa el frontend. El autor se resuelve desde la membresía (Miembro -> Usuario).
*/

export function toChannelMessageResponse(message) {
    const author_member = message.fk_miembro_id

    return {
        mensaje_id: message._id,
        contenido: message.contenido,
        fecha_creacion: message.fecha_creacion,
        autor: {
            member_id: author_member?._id ?? author_member,
            nombre: author_member?.fk_id_usuario?.nombre ?? 'Usuario'
        }
    }
}
