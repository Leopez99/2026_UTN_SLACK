/*
La capa de SERVICIOS contiene la logica de negocio de cada endpoint:
aqui viven las validaciones, las reglas y los flujos de la aplicacion.

Los controllers se limitan a la capa HTTP: reciben la request, delegan en estos servicios
y arman la response. Los repositorios solo saben hablar con la base de datos.
*/

import jwt from 'jsonwebtoken'
import ENVIRONMENT from "../config/environment.config.js"
import mailer_transporter from "../config/mailer.config.js"
import user_repository from "../repositories/user.repository.js"
import { compareHash, generateHash } from "../utils/bcrypt.util.js"
import ServerError from "../utils/error.util.js"
import { buildVerificationEmailHtml, buildVerificationEmailText } from "../utils/email-templates/verification.email.js"
import { buildPasswordResetEmailHtml, buildPasswordResetEmailText } from "../utils/email-templates/reset-password.email.js"

/*
Registro de usuario:
1. Valida los datos recibidos
2. Verifica que el email no este registrado
3. Guarda al usuario con la password encriptada (hash irreversible)
4. Genera un token de verificacion de email (valido por 7 dias) y envia el mail
*/
export async function register(username, email, password) {

    if (!username || !email || !password) {
        throw new ServerError(
            "Email, password and username is required",
            400
        )
    }

    if (!(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
        throw new ServerError(
            "Email is incorrect",
            400
        )
    }

    //Validar si el mail ya esta registrado
    const user_already_exist = await user_repository.getByEmail(email)
    if (user_already_exist) {
        throw new ServerError(
            'Email is already used',
            400
        )
    }

    /*
    Encriptamos la password para que en DB se guarde un dato irreversible
    Viendo el dato irreversible es IMPROBABLE que se sepa el dato original
    */
    const password_hash = await generateHash(password)

    await user_repository.create(username, email, password_hash)

    const verify_email_token = jwt.sign(
        {
            email: email
        },
        ENVIRONMENT.JWT_SECRET_KEY,
        {
            expiresIn: '7d' // -> expira en 7 dias
        }
    )

    const verification_url = `${ENVIRONMENT.URL_FRONTEND}/verify-email?verification_token=${verify_email_token}`

    await mailer_transporter.sendMail(
        {
            to: email,
            from: ENVIRONMENT.GMAIL_USER,
            subject: "Verificá tu correo electrónico",
            html: buildVerificationEmailHtml(username, verification_url),
            text: buildVerificationEmailText(username, verification_url)
        }
    )
}

/*
Inicio de sesion:
1. Valida los datos recibidos
2. Verifica que el usuario exista y que la password coincida con el hash guardado en DB
3. Bloquea el acceso si el email aun no fue verificado
4. Crea la credencial de sesion firmada (auth_token)

Los JWT son objetos de JS (JSON) pasados a string (HS256) con una firma.
Al iniciar sesion le damos al usuario una credencial firmada que indica quien es;
mas adelante el usuario nos devuelve esa credencial y podemos confiar en ella.
*/
export async function login(email, password) {

    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
        throw new ServerError(
            "Email and password are required",
            400
        )
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new ServerError(
            "Email is incorrect",
            400
        )
    }

    const user = await user_repository.getByEmail(email)

    if (!user) {
        throw new ServerError(
            "Invalid email or password",
            401
        )
    }

    //Compara el hash guardado en DB contra la contraseña que el cliente nos envió
    const isPasswordValid = await compareHash(password, user.password)
    if (!isPasswordValid) {
        throw new ServerError(
            "Invalid email or password",
            401
        )
    }

    if (!user.email_verificado) {
        throw new ServerError(
            'Email no verificado',
            403
        )
    }

    /* Crear un token firmado de sesion */
    const auth_token = jwt.sign(
        {
            //Aca va a info que queres guardar en la credencial
            id: user._id,
            name: user.nombre,
            email: user.email
        },
        ENVIRONMENT.JWT_SECRET_KEY //Firmamos con esto
    )

    return {
        auth_token
    }
}

/*
Verificacion del email:
1. Verifica la firma y vigencia del token del link
2. Busca al usuario y controla que este activo
3. Pone email_verificado en true (si ya estaba verificado no es un error: el link pudo usarse dos veces)
*/
export async function verifyEmail(verify_email_token) {

    if (!verify_email_token) {
        throw new ServerError('El link no incluye un token de verificacion', 400)
    }

    let email

    try {
        //Verificar el token
        const payload = jwt.verify(
            verify_email_token,
            ENVIRONMENT.JWT_SECRET_KEY
        )
        email = payload.email
    } catch (error) {
        //Token invalido, alterado o vencido
        throw new ServerError('El enlace de verificacion es invalido o expiro', 400)
    }

    const user_found = await user_repository.getByEmail(email)

    //Si no existe el usuario error
    if (!user_found) {
        throw new ServerError('Usuario no encontrado', 404)
    }

    if (!user_found.activo) {
        throw new ServerError('Usuario esta desactivado de la plataforma, contactate con soporte si consideras que esto es un error', 403)
    }

    //Si ya esta verificado no es un error: el link pudo usarse dos veces.
    if (user_found.email_verificado) {
        return {
            already_verified: true
        }
    }

    //Actualizamos al usuario para verificarlo
    await user_repository.updateById(
        user_found._id,
        {
            email_verificado: true
        }
    )

    return {
        already_verified: false
    }
}

/*
El secreto del token de restablecimiento incluye el hash de la password actual.
Cuando la password cambia, el hash cambia y el token deja de verificar:
asi un link de restablecimiento solo puede usarse una vez.
*/
function buildPasswordResetSecret(password_hash) {
    return `${ENVIRONMENT.JWT_SECRET_KEY}:${password_hash}`
}

/*
Solicitud de restablecimiento de contraseña:
1. Valida el email recibido
2. Si el usuario existe y esta activo, genera un token de reset (valido por 1 hora)
3. Envia el mail con el link al frontend: /reset-password?reset_token=...

Si el email no existe respondemos igual (sin enviar mail) para no revelar
que correos estan registrados en la plataforma.
*/
export async function requestPasswordReset(email) {

    if (!email || typeof email !== 'string') {
        throw new ServerError(
            "Email is required",
            400
        )
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new ServerError(
            "Email is incorrect",
            400
        )
    }

    const user = await user_repository.getByEmail(email)

    if (!user || !user.activo) {
        return {
            email_sent: false
        }
    }

    const reset_password_token = jwt.sign(
        {
            id: user._id,
            email: user.email,
            purpose: 'password_reset'
        },
        buildPasswordResetSecret(user.password),
        {
            expiresIn: '1h'
        }
    )

    const reset_password_url = `${ENVIRONMENT.URL_FRONTEND}/reset-password?reset_token=${reset_password_token}`

    await mailer_transporter.sendMail(
        {
            to: user.email,
            from: ENVIRONMENT.GMAIL_USER,
            subject: "Restablecé tu contraseña",
            html: buildPasswordResetEmailHtml(user.nombre, reset_password_url),
            text: buildPasswordResetEmailText(user.nombre, reset_password_url)
        }
    )

    return {
        email_sent: true
    }
}

/*
Restablecimiento de contraseña:
1. Valida el token recibido y la nueva password
2. Verifica la firma y la vigencia del token
3. Encripta la nueva password y la guarda en DB

Al cambiar la password, el token queda inutilizado automaticamente (ver buildPasswordResetSecret).
*/
export async function resetPassword(reset_token, new_password) {

    if (!reset_token || !new_password || typeof reset_token !== 'string' || typeof new_password !== 'string') {
        throw new ServerError(
            'El token y la nueva contraseña son obligatorios',
            400
        )
    }

    if (new_password.length < 8) {
        throw new ServerError(
            'La contraseña debe tener al menos 8 caracteres',
            400
        )
    }

    const invalid_token_error = new ServerError(
        'El enlace de restablecimiento es inválido o expiró',
        400
    )

    //Leemos el payload (sin validar la firma) solo para saber a que usuario pertenece el token
    const decoded_token = jwt.decode(reset_token)

    if (!decoded_token || decoded_token.purpose !== 'password_reset' || !decoded_token.email) {
        throw invalid_token_error
    }

    const user = await user_repository.getByEmail(decoded_token.email)

    if (!user) {
        throw invalid_token_error
    }

    let payload

    try {
        //Verificamos la firma y la vigencia con el secreto que depende de la password actual
        payload = jwt.verify(
            reset_token,
            buildPasswordResetSecret(user.password)
        )
    } catch (error) {
        throw invalid_token_error
    }

    if (String(payload.id) !== String(user._id)) {
        throw invalid_token_error
    }

    if (!user.activo) {
        throw new ServerError('Usuario esta desactivado de la plataforma, contactate con soporte si consideras que esto es un error', 403)
    }

    const password_hash = await generateHash(new_password)

    await user_repository.updateById(
        user._id,
        {
            password: password_hash
        }
    )

    return {
        email: user.email
    }
}
