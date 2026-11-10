import express from 'express'
import { forgotPassword, login, register, resetPassword, verifyEmail } from '../controllers/auth.controller.js'
import ENVIRONMENT from '../config/environment.config.js'

const auth_router = express.Router()

/* 
(Unauthentified) POST /api/auth/register
    Registro de usuario. Valida los datos recibidos y envia un mail de verificacion de email
*/
auth_router.post('/register', register)

/* 
(Unauthentified) POST /api/auth/login
    Inicio de sesion: valida las credenciales y devuelve el token de autenticacion del usuario
*/
auth_router.post('/login', login)

/* 
(Unauthentified) GET /api/auth/verify-email
    Verificacion del email del usuario. El token de verificacion viaja por querystring:
    /api/auth/verify-email?verification_token=...
*/
auth_router.get('/verify-email',  verifyEmail)

/*
(Unauthentified) POST /api/auth/forgot-password
    Solicitud de restablecimiento de contraseña: recibe el email y envia el mail con el token
*/
auth_router.post('/forgot-password', forgotPassword)

/*
(Unauthentified) POST /api/auth/reset-password
    Restablecimiento de contraseña: recibe el token del mail y la nueva password
*/
auth_router.post('/reset-password', resetPassword)

/* 
(Unauthentified) GET /api/auth/verify-email/:verify_email_token
    Compatibilidad con links viejos que traian el token en el path.
    Los redirigimos al frontend para que la screen de verificacion lo procese
*/
auth_router.get('/verify-email/:verify_email_token', (request, response) => {
    response.redirect(
        `${ENVIRONMENT.URL_FRONTEND}/verify-email?verification_token=${encodeURIComponent(request.params.verify_email_token)}`
    )
})

export default auth_router