const API_URL = import.meta.env.VITE_APP_URL_BACKEND

/*
(Authenticated) GET /api/users/me
Trae el perfil completo del usuario de la sesion, incluyendo foto_perfil y
descripcion, que no viajan dentro del JWT.
*/
export async function getMe(){
    const auth_token = localStorage.getItem('auth_token')
    const response_http = await fetch(
            API_URL + '/api/users/me',
            {
                method: 'GET',
                headers: {
                    'Authorization': `bearer ${auth_token}`
                }
            }
        )
    const response_body = await response_http.json()

    if(!response_body.ok){
        throw new Error(response_body.message)
    }

    return response_body
}

/*
(Authenticated) PUT /api/users/me
Cambia el nombre y, opcionalmente, la descripcion y la foto de perfil.
- foto_perfil: data URL base64 para reemplazar, null para quitar y undefined
  para conservar la foto actual (el campo no viaja en el body).
El backend devuelve un JWT re-firmado con el nombre nuevo.
*/
export async function updateMe(name, descripcion = undefined, foto_perfil = undefined){
    const auth_token = localStorage.getItem('auth_token')

    const body = { name: name }

    if (descripcion !== undefined) {
        body.descripcion = descripcion
    }

    if (foto_perfil !== undefined) {
        body.foto_perfil = foto_perfil
    }

    const response_http = await fetch(
            API_URL + '/api/users/me',
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `bearer ${auth_token}`
                },
                body: JSON.stringify(body)
            }
        )
    const response_body = await response_http.json()

    if(!response_body.ok){
        throw new Error(response_body.message)
    }

    return response_body
}

export async function deleteMe(){
    const auth_token = localStorage.getItem('auth_token')
    const response_http = await fetch(
            API_URL + '/api/users/me',
            {
                method: 'DELETE',
                headers: {
                    'Authorization': `bearer ${auth_token}`
                }
            }
        )
    const response_body = await response_http.json()

    if(!response_body.ok){
        throw new Error(response_body.message)
    }

    return response_body
}
