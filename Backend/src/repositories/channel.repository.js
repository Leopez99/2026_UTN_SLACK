import Channel from "../models/channel.model.js"

class ChannelRepository {
    async createChannel(name, description, workspace_id, categoria = null) {
        const channel_data = {
            nombre: name,
            descripcion: description,
            fk_id_espacio_trabajo: workspace_id
        }

        if (categoria) {
            channel_data.categoria = categoria
        }

        return await Channel.create(channel_data)
    }

    async getById(channel_id) {
        return await Channel.findById(channel_id)
    }

    async deleteById(channel_id) {
        return await Channel.findByIdAndDelete(channel_id)
    }

    async updateById(channel_id, name, description) {
        const result = await Channel.findByIdAndUpdate(
            channel_id,
            {
                nombre: name,
                descripcion: description
            },
            { new: true } //Hace que te devuelva el canal actualizado
        )
        return result
    }

    async getAllChannelsByWorkspaceId(workspace_id) {
        const result = await Channel
            .find({ fk_id_espacio_trabajo: workspace_id })
            .sort({ fecha_creacion: 1 })

        return result
    }

    /* Borra todos los canales del espacio y devuelve sus ids para
       poder limpiar tambien los mensajes asociados. */
    async deleteAllByWorkspaceId(workspace_id) {
        const channels = await Channel
            .find({ fk_id_espacio_trabajo: workspace_id })
            .select('_id')

        await Channel.deleteMany({ fk_id_espacio_trabajo: workspace_id })

        return channels.map(channel => channel._id)
    }
}
const channel_repository = new ChannelRepository()
export default channel_repository
