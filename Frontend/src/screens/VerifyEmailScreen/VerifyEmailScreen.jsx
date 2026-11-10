import React, { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import useRequest from '../../hooks/useRequest'
import { verifyEmail } from '../../services/authService'
import './VerifyEmailScreen.css'

/* 
El backend manda al usuario a /verify-email?verification_token=...
Esta screen toma el token, consulta a la API y:
    - Si verifica correctamente -> redirecciona a /login
    - Si falla -> muestra el error y un acceso a /login
*/

function VerifyEmailScreen() {

    const [search_params] = useSearchParams()
    const verification_token = search_params.get('verification_token')

    const { loading, response, error, sendRequest } = useRequest()
    const navigate = useNavigate()

    //Evita disparar la consulta dos veces (por ejemplo con StrictMode)
    const request_started = useRef(false)

    useEffect(
        () => {
            if (!verification_token || request_started.current) {
                return
            }
            request_started.current = true
            sendRequest(
                () => verifyEmail(verification_token)
            )
        },
        [verification_token]
    )

    //Cuando el backend confirma la verificacion redirigimos al login
    useEffect(
        () => {
            if (!response) {
                return
            }
            const timeout = setTimeout(
                () => navigate('/login', { replace: true }),
                1500
            )
            return () => clearTimeout(timeout)
        },
        [response, navigate]
    )

    const has_token = Boolean(verification_token)
    const is_success = Boolean(response)
    const is_error = Boolean(error) || !has_token
    const is_loading = has_token && loading && !is_success && !error

    return (
        <div className="verify-email-screen">
            <main className="verify-email-card">

                <header className="verify-email-header">
                    <h1 className="verify-email-title">
                        {is_success ? 'Correo verificado' : is_error ? 'No pudimos verificar tu correo' : 'Verificando tu correo'}
                    </h1>
                    <p className="verify-email-subtitle">
                        {is_success
                            ? 'Tu cuenta ya está activa. Te estamos redirigiendo a iniciar sesión.'
                            : is_error
                                ? 'Revisá el enlace o pedí uno nuevo para completar la verificación.'
                                : 'Estamos confirmando tu correo electrónico. Esperá un momento.'}
                    </p>
                </header>

                <div className="verify-email-status">
                    {is_loading && (
                        <>
                            <span className="verify-email-spinner" aria-hidden="true" />
                            <p className="verify-email-message">Validando el enlace...</p>
                        </>
                    )}

                    {is_success && !loading && (
                        <>
                            <span className="verify-email-icon verify-email-icon-success" aria-hidden="true">
                                <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="m7.5 12.2 3 3 6-6.2" />
                                </svg>
                            </span>
                            <p className="verify-email-message verify-email-message-success">
                                ¡Verificación exitosa!
                            </p>
                        </>
                    )}

                    {is_error && (
                        <>
                            <span className="verify-email-icon verify-email-icon-error" aria-hidden="true">
                                <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M12 7.5v5.5" />
                                    <path d="M12 16.5h.01" />
                                </svg>
                            </span>
                            <p className="verify-email-message verify-email-message-error">
                                {has_token
                                    ? error
                                    : 'El enlace no incluye un token de verificación.'}
                            </p>
                        </>
                    )}
                </div>

                {is_error && (
                    <button
                        className="verify-email-button"
                        type='button'
                        onClick={() => navigate('/login')}
                    >
                        Ir a iniciar sesión
                    </button>
                )}

            </main>
        </div>
    )
}

export default VerifyEmailScreen
