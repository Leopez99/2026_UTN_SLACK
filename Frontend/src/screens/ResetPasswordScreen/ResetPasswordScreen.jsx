import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import useForm from '../../hooks/useForm'
import useRequest from '../../hooks/useRequest'
import { resetPassword } from '../../services/authService'
import './ResetPasswordScreen.css'

/*
El backend manda al usuario a /reset-password?reset_token=...
Esta screen pide la nueva contraseña y su confirmacion, valida que coincidan
y envia el token + la nueva password a la API.
*/

function ResetPasswordScreen() {

  const [search_params] = useSearchParams()
  const reset_token = search_params.get('reset_token')

  const initial_state = { new_password: '', confirm_password: '' }
  const { formState, handleChangeInput } = useForm(initial_state)
  const { loading, response, error, sendRequest } = useRequest()

  const [show_password, setShowPassword] = useState(false)
  const [validation_error, setValidationError] = useState(null)

  const navigate = useNavigate()

  //Cuando el backend confirma el cambio redirigimos al login
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

  //Limpiamos el error de validacion cuando el usuario vuelve a escribir
  function handleFieldChange(event) {
    if (validation_error) {
      setValidationError(null)
    }
    handleChangeInput(event)
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (formState.new_password.length < 8) {
      setValidationError('La contraseña debe tener al menos 8 caracteres')
      return
    }

    if (formState.new_password !== formState.confirm_password) {
      setValidationError('Las contraseñas no coinciden')
      return
    }

    setValidationError(null)
    sendRequest(
      () => resetPassword(reset_token, formState.new_password)
    )
  }

  const has_token = Boolean(reset_token)
  const is_success = Boolean(response)
  const form_error = validation_error || error

  const password_toggle = (
    <button
      type='button'
      className="reset-password-password-toggle"
      onClick={() => setShowPassword(!show_password)}
      aria-label={show_password ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      aria-pressed={show_password}
    >
      {show_password ? (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21.5 4.5 3.5 20.5" />
          <path d="M10.6 6.1A9.9 9.9 0 0 1 12 6c6.4 0 10 6 10 6a17.6 17.6 0 0 1-3.2 4" />
          <path d="M6.3 8.3A17.4 17.4 0 0 0 2 12s3.6 6 10 6a9.7 9.7 0 0 0 4.2-.9" />
          <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
        </svg>
      )}
    </button>
  )

  if (!has_token) {
    return (
      <div className="reset-password-screen">
        <main className="reset-password-card">
          <header className="reset-password-header">
            <h1 className="reset-password-title">No pudimos restablecer tu contraseña</h1>
            <p className="reset-password-subtitle">
              El enlace no incluye un token válido. Pedí uno nuevo para continuar.
            </p>
          </header>
          <button
            className="reset-password-button"
            type='button'
            onClick={() => navigate('/forgot-password')}
          >
            Pedir un nuevo enlace
          </button>
        </main>
      </div>
    )
  }

  if (is_success) {
    return (
      <div className="reset-password-screen">
        <main className="reset-password-card">
          <header className="reset-password-header">
            <h1 className="reset-password-title">Contraseña actualizada</h1>
            <p className="reset-password-subtitle">
              Ya podés iniciar sesión con tu nueva contraseña. Te estamos redirigiendo...
            </p>
          </header>
          <div className="reset-password-status">
            <span className="reset-password-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="m7.5 12.2 3 3 6-6.2" />
              </svg>
            </span>
            <p className="reset-password-message reset-password-message-success">
              ¡Listo! Tu contraseña fue cambiada.
            </p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="reset-password-screen">

      <main className="reset-password-card">

        <header className="reset-password-header">
          <h1 className="reset-password-title">Restablecé tu contraseña</h1>
          <p className="reset-password-subtitle">
            Elegí una contraseña nueva de al menos 8 caracteres y confirmala.
          </p>
        </header>

        <form className="reset-password-form" onSubmit={handleSubmit}>

          <div className="reset-password-password-field">
            <label className="sr-only" htmlFor="new_password">Nueva contraseña</label>
            <input
              className="reset-password-input reset-password-input-password"
              name='new_password'
              id='new_password'
              type={show_password ? 'text' : 'password'}
              placeholder='Nueva contraseña'
              autoComplete='new-password'
              minLength={8}
              value={formState.new_password}
              onChange={handleFieldChange}
              disabled={loading}
            />
            {password_toggle}
          </div>

          <div className="reset-password-password-field">
            <label className="sr-only" htmlFor="confirm_password">Confirmar contraseña</label>
            <input
              className="reset-password-input reset-password-input-password"
              name='confirm_password'
              id='confirm_password'
              type={show_password ? 'text' : 'password'}
              placeholder='Confirmar contraseña'
              autoComplete='new-password'
              minLength={8}
              value={formState.confirm_password}
              onChange={handleFieldChange}
              disabled={loading}
            />
            {password_toggle}
          </div>

          {form_error && !loading && (
            <p className="reset-password-message reset-password-message-error">{form_error}</p>
          )}

          {loading ? (
            <button className="reset-password-button" type='submit' disabled={true}>
              Restableciendo...
            </button>
          ) : (
            <button className="reset-password-button" type='submit'>
              Restablecer contraseña
            </button>
          )}

        </form>

      </main>

    </div>
  )
}

export default ResetPasswordScreen
