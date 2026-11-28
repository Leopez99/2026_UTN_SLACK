/*
Procesamiento del logo de un espacio de trabajo en el navegador.

La imagen elegida se recorta a un cuadrado de 256x256 (ajustando la imagen
de fondo como "cover") y se convierte a data URL base64, que es el formato
que espera el backend para guardarlo en MongoDB.

El mismo procesamiento se reutiliza para la foto de perfil del usuario
(RegistroScreen y SettingsScreen): el backend aplica las mismas reglas de
formato y peso, por lo que un alias con nombre mas claro se exporta abajo.
*/

const LOGO_ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const LOGO_DIMENSION = 256

/*
~200 KB decodificados = ~273000 caracteres base64.
El backend rechaza con 400 algo mas grande que esto.
*/
const LOGO_MAX_DATA_URL_LENGTH = 273500

const LOGO_ERROR_TYPE = 'El logo debe ser una imagen PNG, JPG o WebP'
const LOGO_ERROR_SIZE = 'El logo quedó demasiado grande. Probá con una imagen más simple'

/* Carga una imagen desde un object URL y la resuelve cuando termina de decodificar */
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const image = new Image()
        image.onload = () => resolve(image)
        image.onerror = () => reject(new Error('No se pudo leer la imagen seleccionada'))
        image.src = src
    })
}

/*
Convierte un archivo de imagen en una data URL base64 de 256x256.
Tira una excepcion con mensaje legible si el archivo no sirve.
*/
export async function readImageAsLogoDataUrl(file) {

    if (!LOGO_ALLOWED_TYPES.includes(file.type)) {
        throw new Error(LOGO_ERROR_TYPE)
    }

    const object_url = URL.createObjectURL(file)

    try {
        const image = await loadImage(object_url)

        const canvas = document.createElement('canvas')
        canvas.width = LOGO_DIMENSION
        canvas.height = LOGO_DIMENSION

        /* Recorte tipo "cover": se escala la imagen hasta cubrir el cuadrado
           y se centra, de modo que siempre quede llena (como un avatar) */
        const scale = Math.max(
            LOGO_DIMENSION / image.naturalWidth,
            LOGO_DIMENSION / image.naturalHeight
        )
        const scaled_width = Math.round(image.naturalWidth * scale)
        const scaled_height = Math.round(image.naturalHeight * scale)

        const context = canvas.getContext('2d')
        context.drawImage(
            image,
            (LOGO_DIMENSION - scaled_width) / 2,
            (LOGO_DIMENSION - scaled_height) / 2,
            scaled_width,
            scaled_height
        )

        /* PNG y WebP mantienen la transparencia; JPEG se comprime con calidad fija.
           Un PNG de 256x256 con muchos colores puede pesar mas que el limite,
           entonces en ese caso se intenta con JPEG como plan B */
        const keep_transparency = file.type !== 'image/jpeg'
        let data_url = keep_transparency
            ? canvas.toDataURL('image/png')
            : canvas.toDataURL('image/jpeg', 0.85)

        if (data_url.length > LOGO_MAX_DATA_URL_LENGTH && keep_transparency) {
            data_url = canvas.toDataURL('image/jpeg', 0.85)
        }

        if (data_url.length > LOGO_MAX_DATA_URL_LENGTH) {
            throw new Error(LOGO_ERROR_SIZE)
        }

        return data_url
    }
    finally {
        URL.revokeObjectURL(object_url)
    }
}

/*
Alias para usar el mismo recorte cuando la imagen es una foto de perfil de
usuario (mismo formato data URL base64 de 256x256 que espera el backend).
*/
export const readImageAsAvatarDataUrl = readImageAsLogoDataUrl
