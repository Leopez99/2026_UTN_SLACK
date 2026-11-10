import React from 'react'
import { Link, useNavigate } from 'react-router'
import useForm from '../../hooks/useForm'
import useRequest from '../../hooks/useRequest'
import { forgotPassword } from '../../services/authService'
import './ForgotPasswordScreen.css'

/*
El usuario ingresa su email y el backend envia un mail con el link para restablecer la contraseña.
Por seguridad el backend responde lo mismo exista o no la cuenta.
*/

function ForgotPasswordScreen() {

  const initial_state = { email: '' }
  const { formState, handleChangeInput } = useForm(initial_state)
  const { loading, response, error, sendRequest } = useRequest()

  const navigate = useNavigate()

  async function handleSubmit(event) {
    event.preventDefault()
    sendRequest(
      () => forgotPassword(formState.email)
    )
  }

  return (
    <div className="forgot-password-screen">

      <main className="forgot-password-card">

        <header className="forgot-password-header">
          <h1 className="forgot-password-title">¿Olvidaste tu contraseña?</h1>
          <p className="forgot-password-subtitle">
            Ingresá el email de tu cuenta y te enviaremos un enlace para restablecerla.
          </p>
        </header>

        <form className="forgot-password-form" onSubmit={handleSubmit}>

          <label className="sr-only" htmlFor="email">Email</label>
          <input
            className="forgot-password-input"
            name='email'
            id='email'
            type='email'
            placeholder='Email'
            autoComplete='email'
            value={formState.email}
            onChange={handleChangeInput}
          />

          {error && !loading && (
            <p className="forgot-password-message forgot-password-message-error">{error}</p>
          )}

          {loading ? (
            <button className="forgot-password-button" type='submit' disabled={true}>
              Enviando...
            </button>
          ) : (
            <button className="forgot-password-button" type='submit'>
              Enviar enlace
            </button>
          )}

          {response && !loading && (
            <p className="forgot-password-message forgot-password-message-success">
              {response.message} Revisá también la carpeta de spam.
            </p>
          )}

          <div className="forgot-password-divider">
            <span className="forgot-password-divider-line" />
            <span className="forgot-password-divider-text">O</span>
            <span className="forgot-password-divider-line" />
          </div>

          <div className="forgot-password-back">
            <p className="forgot-password-back-text">¿Ya recordaste tu contraseña?</p>
            <button
              className="forgot-password-button-secondary"
              type='button'
              onClick={() => navigate('/login')}
            >
              Volver a iniciar sesión
            </button>
          </div>

        </form>

        <p className="forgot-password-alt">
          ¿No tenés una cuenta? <Link className="forgot-password-link" to='/register'>Registrate</Link>
        </p>

      </main>

    </div>
  )
}

export default ForgotPasswordScreen
