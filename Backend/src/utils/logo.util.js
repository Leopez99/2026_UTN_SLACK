/*
Validacion del logo de un espacio de trabajo.

El logo viaja como data URL base64 (por ejemplo:
`data:image/png;base64,iVBORw0KGgo...`) para evitar tener que manejar
archivos en disco: el backend corre en Vercel (serverless) y el sistema
de archivos no persiste. El frontend lo redimensiona a 256x256 antes de
enviarlo, asi el peso queda acotado.
*/

const LOGO_DATA_URL_PATTERN = /^data:image\/(png|jpeg|webp);base64,/
const LOGO_BASE64_PAYLOAD_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/

/* Maximo de bytes decodificados que aceptamos para un logo */
export const MAX_LOGO_BYTES = 200 * 1024

export const LOGO_ERROR_MESSAGE = 'logo debe ser una imagen en formato data URL base64 (PNG, JPG o WebP)'
export const LOGO_TOO_LARGE_MESSAGE = 'logo no puede superar los 200 KB'

/*
Devuelve un mensaje de error si el logo es invalido, o null si es valido
(tambien son validos `undefined` y `null`: el logo es opcional).
*/
export function validateWorkspaceLogo(logo) {

    if (logo === undefined || logo === null) {
        return null
    }

    if (typeof logo !== 'string' || !LOGO_DATA_URL_PATTERN.test(logo)) {
        return LOGO_ERROR_MESSAGE
    }

    const base64_payload = logo.slice(logo.indexOf(',') + 1)

    if (!LOGO_BASE64_PAYLOAD_PATTERN.test(base64_payload)) {
        return LOGO_ERROR_MESSAGE
    }

    const decoded_bytes = Math.floor(base64_payload.length * 3 / 4)

    if (decoded_bytes > MAX_LOGO_BYTES) {
        return LOGO_TOO_LARGE_MESSAGE
    }

    return null
}
