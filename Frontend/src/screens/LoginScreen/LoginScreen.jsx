import React, { useEffect, useState } from 'react'
import useForm from '../../hooks/useForm'
import { login } from '../../services/authService'
import useRequest from '../../hooks/useRequest'
import { Link, useNavigate } from 'react-router'
import './LoginScreen.css'

/* 
Siguiendo las practicas implementadas la conectar el formulario de login con nuesta API REST
Desarrollar la implementacion del formulario de registro y la consulta a la API REST
*/

function LoginScreen() {
    
    const initial_state = {email: '', password: ''}
    const {formState, handleChangeInput} = useForm(initial_state)
    const {loading, response, error, sendRequest} = useRequest()
    
    const navigate = useNavigate()
   

    async function handleSubmit (event){
        event.preventDefault()
        sendRequest(
            () => login(formState.email, formState.password)
        )
        console.log('Usuario intenta iniciar sesion', formState)
    }

    /* 
    Los efectos sirven para controlar la recarga/ejecucion de una funcion

    Cuando la response cambie/llegue:
        - Guardar en localstorage el auth_token (para que luego podamos seguir usandolo)
        - voy a redireccionar a /home
    */
    useEffect(
        () => {
            if(response && response.data){
                localStorage.setItem('auth_token', response.data.auth_token)
                navigate('/')
            }
        },
        [response]
    )

    
    
return (
        <div className="login-screen">
            <main className="login-card">
                {/* Logo pendiente: cuando este, va aca arriba del titulo */}
                <header className="login-header">
                    <h1 className="login-title">Iniciar sesión</h1>
                    <p className="login-subtitle">
                        Ingresá con tu email y contraseña para ver tus espacios de trabajo.
                    </p>
                </header>
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
                    <label className="sr-only" htmlFor="password">Contraseña</label>
                    <input
                        className="login-input"
                        name='password'
                        id='password'
                        type='password'
                        placeholder='Contraseña'
                        autoComplete='current-password'
                        value={formState.password}
                        onChange={handleChangeInput}
                    />
                    <Link className="login-forgot-link" to='/forgot-password'>
                        ¿Olvidaste tu contraseña?
                    </Link>
                    {error && !loading && (
                        <p className="login-message login-message-error">{error}</p>
                    )}
                    {loading ? (
                        <button className="login-button" type='submit' disabled={true}>
                            Cargando...
                        </button>
                    ) : (
                        <button className="login-button" type='submit'>
                            Iniciar sesión
                        </button>
                    )}
                    {response && !loading && (
                        <p className="login-message login-message-success">
                            Inicio de sesión exitoso
                        </p>
                    )}
                    <div className="login-divider">
                        <span className="login-divider-line" />
                        <span className="login-divider-text">O</span>
                        <span className="login-divider-line" />
                    </div>

                    <div className="login-register">
                        <p className="login-register-text">¿No tenés una cuenta?</p>
                        <button
                            className="login-button-secondary"
                            type='button'
                            onClick={() => navigate('/register')}
                        >
                            Registrate
                        </button>
                    </div>

                </form>
            </main>
        </div>
    )
}

export default LoginScreen