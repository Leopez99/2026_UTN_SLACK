import * as auth_services from "../services/auth.services.js"

/*
Los controllers son la capa HTTP de la API:
- Reciben la request, delegan la logica de negocio en la capa de servicios (services/)
- Y arman la response con el formato que devuelve la API

Para enviar en una request HTTP info a una API usamos el body.
Las consultas (request) tipo GET NO TIENEN body.
*/

export async function register(request, response) {

    console.log("[REGISTER]", request.body)
    const { username, email, password } = request.body

    await auth_services.register(username, email, password)

    return response.status(201).send({
        ok: true,
        status: 201,
        message: "User registered successfully"
    })
}


export async function login(request, response) {

    const { email, password } = request.body

    const { auth_token } = await auth_services.login(email, password)

    return response.status(200).send({
        ok: true,
        message: "You have logged in successfully",
        status: 200,
        data: {
            auth_token
        }
    })
}


export async function verifyEmail (request, response){

    //El token puede venir por querystring (link del mail) o por param (compatibilidad)
    const verify_email_token = request.query.verification_token || request.params.verify_email_token

    const { already_verified } = await auth_services.verifyEmail(verify_email_token)

    if (already_verified) {
        return response.status(200).send(
            {
                ok: true,
                status: 200,
                message: 'El email ya estaba verificado',
                data: {
                    already_verified: true
                }
            }
        )
    }

    return response.status(200).send(
        {
            ok: true,
            status: 200,
            message: 'Usuario verificado exitosamente'
        }
    )
}


export async function forgotPassword(request, response) {

    const { email } = request.body

    await auth_services.requestPasswordReset(email)

    /*
    Respondemos siempre lo mismo, exista o no el usuario:
    asi nadie puede usar este endpoint para descubrir emails registrados.
    */
    return response.status(200).send(
        {
            ok: true,
            status: 200,
            message: 'Si el email está registrado, te enviamos un correo con las instrucciones para restablecer tu contraseña'
        }
    )
}


export async function resetPassword(request, response) {

    const { reset_token, new_password } = request.body

    await auth_services.resetPassword(reset_token, new_password)

    return response.status(200).send(
        {
            ok: true,
            status: 200,
            message: 'Contraseña actualizada correctamente'
        }
    )
}
