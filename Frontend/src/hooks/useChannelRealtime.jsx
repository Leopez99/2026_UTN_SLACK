import { useEffect, useRef } from 'react'
import { createChannelEventSource } from '../services/channelEventsService'

/*
Tiempo real del canal abierto (Server-Sent Events).

- Abre un EventSource del canal activo y lo cierra al cambiar de canal.
- Entrega los mensajes de otros miembros en on_new_message (WorkspaceScreen
  decide mostrar el aviso de "Hay nuevos mensajes").
- EventSource se reconecta solo (Vercel cierra las conexiones al llegar a la
  duracion maxima de la Function): on_reconnect avisa para resincronizar.

El hook no guarda estado: solo conecta los eventos SSE con los callbacks.
Los callbacks se leen desde un ref para no re-suscribir en cada render.
*/

const CHANNEL_MESSAGE_EVENT = 'mensaje-nuevo'

function useChannelRealtime({ workspace_id, channel_id, on_new_message, on_reconnect }) {
  const callbacks_ref = useRef({ on_new_message, on_reconnect })

  callbacks_ref.current = { on_new_message, on_reconnect }

  useEffect(() => {
    if (!workspace_id || !channel_id) {
      return undefined
    }

    const event_source = createChannelEventSource(workspace_id, channel_id)

    if (!event_source) {
      return undefined
    }

    let had_connected = event_source.readyState === EventSource.OPEN

    function handleConnect() {
      if (had_connected) {
        callbacks_ref.current.on_reconnect?.()
      }

      had_connected = true
    }

    function handleNewMessage(event) {
      let event_payload = null

      try {
        event_payload = JSON.parse(event.data)
      }
      catch {
        return
      }

      if (String(event_payload?.canal_id) !== String(channel_id)) {
        return
      }

      callbacks_ref.current.on_new_message?.(event_payload?.mensaje ?? null)
    }

    event_source.addEventListener('open', handleConnect)
    event_source.addEventListener(CHANNEL_MESSAGE_EVENT, handleNewMessage)

    return () => {
      event_source.removeEventListener('open', handleConnect)
      event_source.removeEventListener(CHANNEL_MESSAGE_EVENT, handleNewMessage)
      event_source.close()
    }
  }, [workspace_id, channel_id])
}

export default useChannelRealtime
