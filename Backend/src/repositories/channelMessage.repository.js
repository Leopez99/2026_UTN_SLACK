import ChannelMessage from "../models/channelMessage.model.js"

class ChannelMessageRepository {
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
