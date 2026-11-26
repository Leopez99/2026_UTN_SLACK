const API_URL = import.meta.env.VITE_APP_URL_BACKEND

export async function getAllWorkspaces(){
    const auth_token = localStorage.getItem('auth_token')
    const response_http = await fetch(
            API_URL + '/api/workspaces',
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

export async function createWorkspace(name, description, logo){
    const auth_token = localStorage.getItem('auth_token')
    const body = {
        name: name,
        description: description
    }

    /* El logo es opcional: solo se lo manda al backend cuando el usuario eligio una imagen */
    if (logo) {
        body.logo = logo
    }

    const response_http = await fetch(
            API_URL + '/api/workspaces',
            {
                method: 'POST',
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

export async function updateWorkspace(workspace_id, name, description, logo){
    const auth_token = localStorage.getItem('auth_token')
    const body = {
        name: name,
        description: description
    }

    /*
    El logo solo se actualiza si se envia:
    - undefined -> conserva el logo actual (no se incluye en el body)
    - null      -> quita el logo
    - data URL  -> reemplaza el logo actual
    */
    if (logo !== undefined) {
        body.logo = logo
    }

    const response_http = await fetch(
            API_URL + `/api/workspaces/${workspace_id}`,
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

export async function deleteWorkspace(workspace_id){
    const auth_token = localStorage.getItem('auth_token')
    const response_http = await fetch(
            API_URL + `/api/workspaces/${workspace_id}`,
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

export async function getWorkspaceById(workspace_id){
    const auth_token = localStorage.getItem('auth_token')
    const response_http = await fetch(
            API_URL + `/api/workspaces/${workspace_id}`,
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

export async function getWorkspaceMembers(workspace_id){
    const auth_token = localStorage.getItem('auth_token')
    const response_http = await fetch(
            API_URL + `/api/workspaces/${workspace_id}/members`,
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

export async function removeWorkspaceMember(workspace_id, member_id){
    const auth_token = localStorage.getItem('auth_token')
    const response_http = await fetch(
            API_URL + `/api/workspaces/${workspace_id}/members/${member_id}`,
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

export async function createInvitation(workspace_id, { email, rol }){
    const auth_token = localStorage.getItem('auth_token')
    const response_http = await fetch(
            API_URL + `/api/workspaces/${workspace_id}/invitations`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `bearer ${auth_token}`
                },
                body: JSON.stringify({
                    email: email,
                    rol: rol || 'user'
                })
            }
        )
    const response_body = await response_http.json()

    if(!response_body.ok){
        throw new Error(response_body.message)
    }

    return response_body
}