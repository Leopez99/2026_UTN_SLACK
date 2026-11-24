import React from 'react'
import { Link } from 'react-router'
import useForm from '../../hooks/useForm'
import useRequest from '../../hooks/useRequest'
import { forgotPassword } from '../../services/authService'
import logo_disklack from '../../assets/Logos dislack/Logo dislack.png'
import '../LoginScreen/LoginScreen.css'

/*
Pantalla de recuperacion de contraseña con el mismo estilo que el login (su vista mobile):
solo el panel del formulario, con el logo y una flecha para volver a /login.

El usuario ingresa su email y el backend envia un mail con el link para restablecer la contraseña.
Por seguridad el backend responde lo mismo exista o no la cuenta.
*/

function ForgotPasswordScreen() {

  const initial_state = { email: '' }
  const { formState, handleChangeInput } = useForm(initial_state)
  const { loading, response, error, sendRequest } = useRequest()

  async function handleSubmit(event) {
    event.preventDefault()
    sendRequest(
      () => forgotPassword(formState.email)
    )
  }

  return (
    <div className="login-screen login-screen--form-only">

      <main className="login-panel">
        <Link className="login-back" to='/login' aria-label='Volver a iniciar sesión'>
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 12H5" />
            <path d="m12 19-7-7 7-7" />
          </svg>
        </Link>

        <div className="login-panel-inner">
          <img
            className="login-panel-logo"
            src={logo_disklack}
            alt="Logo de Dislack"
          />
          <h1 className="login-panel-title">¿Olvidaste tu contraseña?</h1>
          <p className="login-subtitle">
            Ingresá el email con el que te registraste y se enviará un correo para resetear tu contraseña.
          </p>

          <form className="login-form" onSubmit={handleSubmit}>

            <label className="sr-only" htmlFor="email">Email</label>
            <input
              className="login-input"
              name='email'
              id='email'
              type='email'
              placeholder='Email'
              autoComplete='email'
              value={formState.email}
              onChange={handleChangeInput}
            />

            {error && !loading && (
              <p className="login-message login-message-error">{error}</p>
            )}

            {loading ? (
              <button className="login-button" type='submit' disabled={true}>
                Enviando...
              </button>
            ) : (
              <button className="login-button" type='submit'>
                Enviar enlace
              </button>
            )}

            {response && !loading && (
              <p className="login-message login-message-success">
                {response.message} Revisá también la carpeta de spam.
              </p>
            )}

            <p className="login-alt">
              ¿No tenés una cuenta? <Link className="login-alt-link" to='/register'>Registrate</Link>
            </p>

          </form>
        </div>
      </main>

    </div>
  )
}

export default ForgotPasswordScreen
