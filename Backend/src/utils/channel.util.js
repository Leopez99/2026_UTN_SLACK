/*
Los canales se guardan en Mongo con campos en español (nombre, descripcion,
categoria) y se devuelven a la API con el prefijo canal_* que ya usa el
frontend, igual que hace el resto de los endpoints.
*/

export const DEFAULT_CHANNEL_NAME = 'General'

export function toChannelResponse(channel) {
    return {
        canal_id: channel._id,
        canal_nombre: channel.nombre,
        canal_descripcion: channel.descripcion || '',
        categoria: channel.categoria || null,
        fecha_creacion: channel.fecha_creacion
    }
}
