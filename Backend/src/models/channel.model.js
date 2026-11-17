import mongoose from "mongoose";
import { WORKSPACE_COLLECTION_NAME } from "./workspace.model.js";

const channelSchema = new mongoose.Schema(
    {
        nombre: {
            type: String,
            required: true,
            maxlength: 60,
            trim: true
        },
        descripcion: {
            type: String,
            maxlength: 1000,
            trim: true
        },
        /* Categoria del canal (por ejemplo "Canales de texto").
           Opcional: si no se define, el canal se muestra suelto en la UI. */
        categoria: {
            type: String,
            maxlength: 60,
            trim: true
        },
        fk_id_espacio_trabajo: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: WORKSPACE_COLLECTION_NAME
        },
        fecha_creacion: {
            type: Date,
            default: Date.now
        }
    }
)
export const CHANNEL_COLLECTION_NAME = 'Canal'
const Channel = mongoose.model(CHANNEL_COLLECTION_NAME, channelSchema)
export default Channel
