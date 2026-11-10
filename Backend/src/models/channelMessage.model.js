import mongoose from "mongoose";
import { MEMBER_COLLECTION_NAME } from "./member.model.js";
import { CHANNEL_COLLECTION_NAME } from "./channel.model.js";

const channelMessageSchema = new mongoose.Schema(
    {
        fk_miembro_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: MEMBER_COLLECTION_NAME
        },
        fk_canal_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: CHANNEL_COLLECTION_NAME
        },
        contenido: {
            type: String,
            required: true,
            maxlength: 30000
        },
        fecha_creacion: {
            type: Date,
            default: Date.now
        }
    }
)
export const CHANNEL_MESSAGE_COLLECTION_NAME = 'MensajeCanal'
const ChannelMessage = mongoose.model(CHANNEL_MESSAGE_COLLECTION_NAME, channelMessageSchema)
export default ChannelMessage
