import mongoose from "mongoose"
import { validateProfilePhoto } from "../utils/logo.util.js"

/*
mongoose trabaja con schemas, basicamente nos permite definir que tipo de dato/estructura guardara un documento en una coleccion
*/
const userSchema = new mongoose.Schema(
    {
        nombre: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
            unique: true
        },
        password: {
            type: String,
            required: true
        },
        /*
        Foto de perfil del usuario como data URL base64 (opcional).
        Son validos string con formato `data:image/...` y null (sin foto).
        La validacion de formato/peso reutiliza la del controller.
        */
        foto_perfil: {
            type: String,
            default: null,
            validate: {
                validator: (value) => validateProfilePhoto(value) === null,
                message: "foto_perfil debe ser una imagen en formato data URL base64 (PNG, JPG o WebP)"
            }
        },
        /* Descripcion corta del perfil (bio), opcional */
        descripcion: {
            type: String,
            default: '',
            maxlength: 160,
            trim: true
        },
        fecha_creacion: {
            type: Date,
            default: Date.now
        },
        activo: {
            type: Boolean,
            default: true
        },
        email_verificado: {
            type: Boolean,
            default: false
        }
    }
)
export const USER_COLLECTION_NAME = 'Usuario'
const User = mongoose.model(USER_COLLECTION_NAME, userSchema)

export default User
