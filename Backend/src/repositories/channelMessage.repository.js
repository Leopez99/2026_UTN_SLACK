import ChannelMessage from "../models/channelMessage.model.js"

/* Populate del autor: el mensaje referencia a la membresia (Miembro) y esta
   al usuario, que es quien tiene el nombre visible. */
const AUTHOR_POPULATE = {
    path: 'fk_miembro_id',
    select: 'fk_id_usuario rol',
    populate: {
        path: 'fk_id_usuario',
        select: 'nombre'
    }
}

class ChannelMessageRepository {
    async createMessage(member_id, channel_id, content) {
        const message = await ChannelMessage.create({
            fk_miembro_id: member_id,
            fk_canal_id: channel_id,
            contenido: content
        })

        return await message.populate(AUTHOR_POPULATE)
    }

    async getAllMessagesByChannelId(channel_id) {
        return await ChannelMessage
            .find({ fk_canal_id: channel_id })
            .sort({ fecha_creacion: 1 })
            .populate(AUTHOR_POPULATE)
    }

    async deleteAllByChannelId(channel_id) {
        await ChannelMessage.deleteMany({ fk_canal_id: channel_id })
    }

    async deleteAllByChannelIds(channel_ids = []) {
        if (channel_ids.length === 0) {
            return
        }

        await ChannelMessage.deleteMany({ fk_canal_id: { $in: channel_ids } })
    }
}

const channel_message_repository = new ChannelMessageRepository()
export default channel_message_repository
