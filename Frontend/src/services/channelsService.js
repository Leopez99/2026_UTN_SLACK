const API_URL = import.meta.env.VITE_APP_URL_BACKEND

function buildAuthHeaders(extra_headers = {}) {
    const auth_token = localStorage.getItem('auth_token')

    return {
        ...extra_headers,
        'Authorization': `bearer ${auth_token}`
    }
}

async function readResponse(response_http) {
    const response_body = await response_http.json()

    if (!response_body.ok) {
        throw new Error(response_body.message)
    }

    return response_body
}

export async function getWorkspaceChannels(workspace_id) {
    const response_http = await fetch(
        API_URL + `/api/workspaces/${workspace_id}/channels`,
        {
            method: 'GET',
            headers: buildAuthHeaders()
        }
    )

    return readResponse(response_http)
}

export async function createChannel(workspace_id, { name, description, categoria }) {
    const response_http = await fetch(
        API_URL + `/api/workspaces/${workspace_id}/channels`,
        {
            method: 'POST',
            headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ name, description, categoria })
        }
    )

    return readResponse(response_http)
}

export async function deleteChannel(workspace_id, channel_id) {
    const response_http = await fetch(
        API_URL + `/api/workspaces/${workspace_id}/channels/${channel_id}`,
        {
            method: 'DELETE',
            headers: buildAuthHeaders()
        }
    )

    return readResponse(response_http)
}
