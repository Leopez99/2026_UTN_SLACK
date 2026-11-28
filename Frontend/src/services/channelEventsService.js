const API_URL = import.meta.env.VITE_APP_URL_BACKEND

/*
Conexiones Server-Sent Events (SSE) para el feed en tiempo real de un canal.

- EventSource es nativo del navegador: no hay dependencias externas.
- EventSource se reconecta solo (con intervalos crecientes) cuando el
  servidor o la plataforma cortan la conexion (en Vercel a los 300 s).
- EventSource no puede enviar headers: el JWT viaja por query param.
*/

export function createChannelEventSource(workspace_id, channel_id) {
    const auth_token = localStorage.getItem('auth_token')

    if (!auth_token) {
        return null
    }

    const events_url =
        `${API_URL}/api/workspaces/${workspace_id}/channels/${channel_id}/events` +
        `?token=${encodeURIComponent(auth_token)}`

    return new EventSource(events_url)
}
