const API_URL = import.meta.env.VITE_APP_URL_BACKEND

export async function updateMe(name){
    const auth_token = localStorage.getItem('auth_token')
    const response_http = await fetch(
            API_URL + '/api/users/me',
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `bearer ${auth_token}`
                },
                body: JSON.stringify({ name: name })
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
