/* 
Interaccion con la API
*/

const API_URL = import.meta.env.VITE_APP_URL_BACKEND

export async function login (email, password){
    const response_http = await fetch(
        API_URL + '/api/auth/login',
        {
            method: 'POST',
            headers: {
                'Content-Type': "application/json"
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        }
    )
    const response_body = await response_http.json()

    if(!response_body.ok){
        throw new Error(response_body.message)
    }

    return response_body
}

/* 
JSON.stringify sirve para transformar un Objeto de JS en un JSON
*/


export async function register(username, email, password, descripcion = '', foto_perfil = null) {
    /*
    La descripcion y la foto de perfil son opcionales: la foto solo se envia
    si el usuario eligio una (data URL base64 de 256x256, igual que el logo de
    un workspace); si no, se envia null para indicar "sin foto".
    */
    const body = {
        username: username,
        email: email,
        password: password,
        descripcion: descripcion
    }

    if (foto_perfil) {
        body.foto_perfil = foto_perfil
    }

    const response_http = await fetch(
        API_URL + '/api/auth/register',
        {
            method: 'POST',
            headers: {
                'Content-Type': "application/json"
            },
            body: JSON.stringify(body)
        }
    )
    //Leemos el cuerpo de la respuesta como un JSON
    const response_body = await response_http.json()

    if(!response_body.ok){
        throw new Error(response_body.message)
    }
    return response_body
}


/* 
El token de verificacion llega por querystring desde el link del mail
*/
export async function verifyEmail (verification_token) {
    const response_http = await fetch(
        API_URL + '/api/auth/verify-email?verification_token=' + encodeURIComponent(verification_token),
        {
            method: 'GET'
        }
    )
    const response_body = await response_http.json()

    if(!response_body.ok){
        throw new Error(response_body.message)
    }

    return response_body
}


/*
Solicitud de restablecimiento: el backend envia el mail solo si el usuario existe.
*/
export async function forgotPassword (email) {
    const response_http = await fetch(
        API_URL + '/api/auth/forgot-password',
        {
            method: 'POST',
            headers: {
                'Content-Type': "application/json"
            },
            body: JSON.stringify({
                email: email
            })
        }
    )
    const response_body = await response_http.json()

    if(!response_body.ok){
        throw new Error(response_body.message)
    }

    return response_body
}


/*
El token de restablecimiento llega por querystring desde el link del mail
*/
export async function resetPassword (reset_token, new_password) {
    const response_http = await fetch(
        API_URL + '/api/auth/reset-password',
        {
            method: 'POST',
            headers: {
                'Content-Type': "application/json"
            },
            body: JSON.stringify({
                reset_token: reset_token,
                new_password: new_password
            })
        }
    )
    const response_body = await response_http.json()

    if(!response_body.ok){
        throw new Error(response_body.message)
    }

    return response_body
}