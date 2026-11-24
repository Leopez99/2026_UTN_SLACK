import { useEffect, useRef } from 'react'
import { connectSocket } from '../services/socketService'

/*
Tiempo real del canal abierto.

- Se suscribe al room del canal cuando cambia `channel_id`.
- Entrega los mensajes de otros miembros en on_new_message (WorkspaceScreen
  decide mostrar el aviso de "Hay nuevos mensajes").
- Si el socket reconecta (Vercel cierra las conexiones al llegar a la duracion
  maxima de la Function) avisa con on_reconnect para resincronizar los datos.

El hook no guarda estado: solo conecta eventos del socket con los callbacks.
Los callbacks se leen desde un ref para no re-suscribir en cada render.
*/

function useChannelRealtime({ channel_id, on_new_message, on_reconnect }) {
  const callbacks_ref = useRef({ on_new_message, on_reconnect })

  callbacks_ref.current = { on_new_message, on_reconnect }

  useEffect(() => {
    if (!channel_id) {
      return undefined
    }

    const socket = connectSocket()

    if (!socket) {
      return undefined
    }

    let had_connected = socket.connected

    function joinChannel() {
      socket.emit('join_channel', { channel_id })
    }

    function handleConnect() {
      joinChannel()

      if (had_connected) {
        callbacks_ref.current.on_reconnect?.()
      }

      had_connected = true
    }

    function handleNewMessage(event_payload) {
      if (String(event_payload?.canal_id) !== String(channel_id)) {
        return
      }

      callbacks_ref.current.on_new_message?.(event_payload?.mensaje ?? null)
    }

    if (socket.connected) {
      joinChannel()
    }

    socket.on('connect', handleConnect)
    socket.on('mensaje-nuevo', handleNewMessage)

    return () => {
      socket.off('connect', handleConnect)
      socket.off('mensaje-nuevo', handleNewMessage)
      socket.emit('leave_channel', { channel_id })
    }
  }, [channel_id])
}

export default useChannelRealtime
