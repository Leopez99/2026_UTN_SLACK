import React, { useState } from 'react'
import { register } from '../../services/authService'
import useForm from '../../hooks/useForm'
import useRequest from '../../hooks/useRequest'

function RegisterScreen() {

    const initial_state = {username: '', email: '', password: ''}
    const {formState, handleChangeInput} = useForm(initial_state)
    const {loading, response, error, sendRequest} = useRequest()
   

    async function handleSubmit (event){
        event.preventDefault()
        sendRequest(
            () => register(formState.username, formState.email, formState.password)
        )
        console.log('Usuario registrarse', formState)
    }

    return (
        <div>
            <h1>Registrarse</h1>
            <form onSubmit={handleSubmit}>

                <div>
                    <label htmlFor="username">Nombre:</label>
                    <input 
                        name='username' 
                        id='username' 
                        type='username' 
                        value={formState.username} 
                        onChange={handleChangeInput} 
                    />
                </div>

                <div>
                    <label htmlFor="email">Email:</label>
                    <input 
                        name='email' 
                        id='email' 
                        type='email' 
                        value={formState.email} 
                        onChange={handleChangeInput} 
                    />
                </div>
                <div>
                    <label htmlFor="password">Password:</label>
                    <input 
                        name='password' 
                        id='password' 
                        type='password' 
                        value={formState.password} 
                        onChange={handleChangeInput} 
                    />
                </div>
                {
                    error && !loading  &&  <span style={{color: 'red'}}>{error}</span>
                }

                {
                    loading
                    ? <button type='submit' disabled={true} >Cargando...</button>
                    : <button type='submit'>Registrandose</button>
                }
                

                {
                    response && !loading && <span style={{color: 'greenyellow'}}>Registro exitoso</span>
                }
            </form>
        </div>
    )
}

export default RegisterScreen