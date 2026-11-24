import mongoose from "mongoose";
import { validateWorkspaceLogo } from "../utils/logo.util.js";

const workspaceSchema = new mongoose.Schema(
    {
        nombre:{
            type: String,
            required: true,
            maxlength: 30,
            trim: true
        },
        description: {
            type: String,
            maxlength: 1000,
            trim: true   
        },
        /*
        Logo del espacio de trabajo como data URL base64 (opcional).
        Son validos string con formato `data:image/...` y null (sin logo).
        La validacion de formato/peso reutiliza la del controller.
        */
        logo: {
            type: String,
            default: null,
            validate: {
                validator: (value) => validateWorkspaceLogo(value) === null,
                message: "logo debe ser una imagen en formato data URL base64 (PNG, JPG o WebP)"
            }
        },
        fecha_creacion: {
            type: Date,
            default: Date.now
        }
    }
);

export const WORKSPACE_COLLECTION_NAME = 'EspacioTrabajo'
const Workspace = mongoose.model(WORKSPACE_COLLECTION_NAME, workspaceSchema);
export default Workspace;

