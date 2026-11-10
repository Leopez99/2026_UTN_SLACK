import express from 'express'
import { forgotPassword, login, register, resetPassword, verifyEmail } from '../controllers/auth.controller.js'
import ENVIRONMENT from '../config/environment.config.js'

const auth_router = express.Router()

/* 
Validacion del email del usuario
*/
auth_router.post('/register', register)

/* 
Cuando un usuario inicia sesion debemos crear de alguna forma la sesion
*/
auth_router.post('/login', login)

/* 
El token de verificacion viaja por querystring: /api/auth/verify-email?verification_token=...
*/
auth_router.get('/verify-email',  verifyEmail)

/*
Solicitud de restablecimiento de contraseña: recibe el email y envia el mail con el token.
*/
auth_router.post('/forgot-password', forgotPassword)

/*
Restablecimiento de contraseña: recibe el token del mail y la nueva password.
*/
auth_router.post('/reset-password', resetPassword)

/* 
Compatibilidad con links viejos que traian el token en el path.
Los redirigimos al frontend para que la screen de verificacion lo procese.
*/
auth_router.get('/verify-email/:verify_email_token', (request, response) => {
    response.redirect(
        `${ENVIRONMENT.URL_FRONTEND}/verify-email?verification_token=${encodeURIComponent(request.params.verify_email_token)}`
    )
})

export default auth_router