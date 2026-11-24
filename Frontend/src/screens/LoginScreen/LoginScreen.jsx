import React, { useEffect, useState } from 'react'
import useForm from '../../hooks/useForm'
import { login } from '../../services/authService'
import useRequest from '../../hooks/useRequest'
import { Link, useNavigate } from 'react-router'
import logo_disklack from '../../assets/Logos dislack/Logo dislack.png'
import logo_disklack_completo from '../../assets/Logos dislack/Dislack logo completo.png'
import titulo_disklack from '../../assets/Logos dislack/Titulo dislack.png'
import './LoginScreen.css'

/*
Pantalla de login con el layout de la referencia de Instagram:
un hero de marca a la izquierda y el formulario a la derecha.

La logica de autenticacion no cambia: el formulario consulta la API REST,
guarda el auth_token en localStorage y redirige al home.
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

            <section className="login-hero">
                <Link className="login-brand" to="/" aria-label="Dislack, ir al inicio">
                    <img className="login-brand-logo" src={logo_disklack} alt="" />
                </Link>

                <div className="login-hero-content">
                    <h1 className="login-hero-title">
                        <span className="login-hero-line">Mirá lo que pasa en tus</span>
                        <span className="login-hero-highlight">espacios de trabajo</span>.
                    </h1>
                    <img
                        className="login-hero-art"
                        src={logo_disklack_completo}
                        alt="Logo de Dislack"
                    />
                </div>
            </section>

            <main className="login-panel">
                <div className="login-panel-inner">
                    <img
                        className="login-panel-logo"
                        src={logo_disklack}
                        alt="Logo de Dislack"
                    />
                    <h2 className="login-panel-title">Iniciar sesión en Dislack</h2>

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

                        <button
                            className="login-button-outline"
                            type='button'
                            onClick={() => navigate('/register')}
                        >
                            Crear cuenta nueva
                        </button>
                    </form>

                    <footer className="login-panel-footer">
                        <img
                            className="login-footer-mark"
                            src={titulo_disklack}
                            alt="Dislack"
                        />
                    </footer>
                </div>
            </main>

        </div>
    )
}

export default LoginScreen
