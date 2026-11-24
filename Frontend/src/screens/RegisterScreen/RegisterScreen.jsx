import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import useForm from '../../hooks/useForm'
import useRequest from '../../hooks/useRequest'
import { register } from '../../services/authService'
import logo_disklack from '../../assets/Logos dislack/Logo dislack.png'
import '../LoginScreen/LoginScreen.css'

/*
Pantalla de registro con el mismo estilo que el login (su vista mobile):
solo el panel del formulario, con el logo y una flecha para volver a /login.
La logica de registro (formulario + llamada a la API) no cambia.
*/

function RegisterScreen() {

  const initial_state = { name: '', email: '', password: '' }
  const { formState, handleChangeInput } = useForm(initial_state)
  const { loading, response, error, sendRequest } = useRequest()

  const [show_password, setShowPassword] = useState(false)

  const navigate = useNavigate()

  async function handleSubmit(event) {
    event.preventDefault()
    sendRequest(
      () => register(formState.name, formState.email, formState.password)
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
          <h1 className="login-panel-title">Crear cuenta en Dislack</h1>
          <p className="login-subtitle">
            Bienvenido a <strong className="login-subtitle-brand">DISLACK</strong>. Llená los datos y vas a poder empezar a comunicarte con tu equipo.
          </p>

          <form className="login-form login-form--register" onSubmit={handleSubmit}>

            <label className="sr-only" htmlFor="name">Nombre</label>
            <input
              className="login-input"
              name='name'
              id='name'
              type='text'
              placeholder='Nombre'
              autoComplete='name'
              value={formState.name}
              onChange={handleChangeInput}
            />

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

            <div className="login-password-field">
              <label className="sr-only" htmlFor="password">Contraseña</label>
              <input
                className="login-input login-input-password"
                name='password'
                id='password'
                type={show_password ? 'text' : 'password'}
                placeholder='Contraseña'
                autoComplete='new-password'
                value={formState.password}
                onChange={handleChangeInput}
              />
              <button
                type='button'
                className="login-password-toggle"
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
            </div>

            {error && !loading && (
              <p className="login-message login-message-error">{error}</p>
            )}

            {loading ? (
              <button className="login-button" type='submit' disabled={true}>
                Cargando...
              </button>
            ) : (
              <button className="login-button" type='submit'>
                Registrarse
              </button>
            )}

            {response && !loading && (
              <p className="login-message login-message-success">
                Registro exitoso. Revisá tu correo electrónico para verificar la cuenta.
              </p>
            )}

            <button
              className="login-button-outline"
              type='button'
              onClick={() => navigate('/login')}
            >
              Iniciar sesión
            </button>

          </form>
        </div>
      </main>

    </div>
  )
}

export default RegisterScreen
