import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import useWorkspaceScreen from '../../hooks/useWorkspaceScreen'
import useWorkspaceChannels from '../../hooks/useWorkspaceChannels'
import useChannelRealtime from '../../hooks/useChannelRealtime'
import { getSessionUser } from '../../utils/session.util'
import { findDefaultChannel, groupChannelsByCategory } from '../../utils/channel.util'
import { createChannel, createChannelMessage, deleteChannel, getChannelMessages } from '../../services/channelsService'
import { isSocketConnected, sendChannelMessage } from '../../services/socketService'
import WorkspaceRail from './components/WorkspaceRail'
import ChannelSidebar from './components/ChannelSidebar'
import ChatArea from './components/ChatArea'
import MembersPanel from './components/MembersPanel'
import CreateWorkspaceModal from '../../Components/WorkspaceList/CreateWorkspaceModal'
import './WorkspaceScreen.css'

/*
Pantalla de un espacio de trabajo con el layout de un servidor de Discord:
rail de espacios | canales | chat | miembros.

Datos reales: espacio seleccionado, listado de espacios, miembros y canales.

En pantallas chicas los paneles de canales y miembros se abren como drawers.
*/

function WorkspaceScreen() {
  const { workspace_id } = useParams()

  const {
    workspace_response,
    workspaces_response,
    screen_loading,
    screen_error,
    reloadScreen
  } = useWorkspaceScreen(workspace_id)

  const {
    channels,
    channels_loading,
    channels_error,
    reloadChannels
  } = useWorkspaceChannels(workspace_id)

  // Panel lateral abierto en mobile/tablet: 'canales' | 'miembros' | null
  const [open_panel, set_open_panel] = useState(null)
  const [viewport_width, set_viewport_width] = useState(0)

  // Canal seleccionado en el sidebar (null = usar el canal General o el primero)
  const [selected_channel_id, set_selected_channel_id] = useState(null)

  // Canal pendiente de confirmar para borrar
  const [channel_to_delete, set_channel_to_delete] = useState(null)
  const [delete_loading, set_delete_loading] = useState(false)
  const [delete_error, set_delete_error] = useState(null)

  // Mensajes del canal activo
  const [messages, set_messages] = useState([])
  const [messages_loading, set_messages_loading] = useState(false)
  const [messages_error, set_messages_error] = useState(null)
  const [messages_reload_key, set_messages_reload_key] = useState(0)

  // Aviso de mensajes nuevos de otros miembros (no se insertan solos: el
  // usuario decide cuando recargar con el boton de ChatArea)
  const [new_messages_notice, set_new_messages_notice] = useState(null)

  // Modal de creacion de espacio de trabajo (lo dispara el "+" del rail)
  const [create_workspace_open, set_create_workspace_open] = useState(false)

  // La pantalla ocupa todo el viewport: el documento no debe scrollear.
  useEffect(() => {
    document.body.classList.add('ws-scroll-locked')

    return () => {
      document.body.classList.remove('ws-scroll-locked')
    }
  }, [])

  // Sigue el ancho de la ventana para cerrar drawers que dejan de existir.
  useEffect(() => {
    const sync_viewport_width = () => set_viewport_width(window.innerWidth)

    sync_viewport_width()
    window.addEventListener('resize', sync_viewport_width)

    return () => window.removeEventListener('resize', sync_viewport_width)
  }, [])

  useEffect(() => {
    if (open_panel === 'canales' && viewport_width > 900) {
      set_open_panel(null)
    }

    if (open_panel === 'miembros' && viewport_width > 1200) {
      set_open_panel(null)
    }
  }, [open_panel, viewport_width])

  useEffect(() => {
    if (!open_panel) {
      return undefined
    }

    const handle_key_down = (event) => {
      if (event.key === 'Escape') {
        set_open_panel(null)
      }
    }

    window.addEventListener('keydown', handle_key_down)

    return () => window.removeEventListener('keydown', handle_key_down)
  }, [open_panel])

  useEffect(() => {
    if (!channel_to_delete) {
      return undefined
    }

    const handle_key_down = (event) => {
      if (event.key === 'Escape' && !delete_loading) {
        set_channel_to_delete(null)
      }
    }

    window.addEventListener('keydown', handle_key_down)

    return () => window.removeEventListener('keydown', handle_key_down)
  }, [channel_to_delete, delete_loading])

  const workspace_selected = workspace_response?.data?.workspace_selected
  const members = workspace_response?.data?.members ?? []
  const workspaces = workspaces_response?.data?.workspaces ?? []

  const current_user = getSessionUser()
  const current_membership = workspaces.find(
    (workspace) => String(workspace.workspace_id) === String(workspace_id)
  )
  const current_role = current_membership?.member_rol ?? null
  const can_manage_channels = current_role === 'owner' || current_role === 'admin'

  const channel_groups = groupChannelsByCategory(channels)
  const default_channel = findDefaultChannel(channels)
  const active_channel =
    channels.find((channel) => String(channel.canal_id) === String(selected_channel_id))
    ?? default_channel
  const active_channel_id = active_channel?.canal_id ?? null

  // Tiempo real del canal activo: los mensajes de otros miembros se avisan
  // con el boton "Hay nuevos mensajes"; el usuario recarga cuando quiere.
  useChannelRealtime({
    channel_id: active_channel_id,
    on_new_message: handleNewChannelMessage,
    on_reconnect: reloadMessages
  })

  // Al cambiar de canal el aviso pendiente deja de tener sentido.
  useEffect(() => {
    set_new_messages_notice(null)
  }, [active_channel_id])

  // Carga los mensajes del canal activo. Se limpia la lista al cambiar de canal
  // para no mostrar mensajes de otro canal mientras llega la respuesta.
  useEffect(() => {
    if (!active_channel_id) {
      set_messages([])
      set_messages_loading(false)
      set_messages_error(null)
      return undefined
    }

    let ignore = false

    async function loadMessages() {
      set_messages([])
      set_messages_loading(true)
      set_messages_error(null)

      try {
        const response_body = await getChannelMessages(workspace_id, active_channel_id)

        if (!ignore) {
          set_messages(response_body?.data?.messages ?? [])
        }
      }
      catch (error) {
        if (!ignore) {
          set_messages_error(error.message)
        }
      }
      finally {
        if (!ignore) {
          set_messages_loading(false)
        }
      }
    }

    loadMessages()

    return () => {
      ignore = true
    }
  }, [workspace_id, active_channel_id, messages_reload_key])

  const toggle_panel = (panel_name) => {
    set_open_panel((current_panel) => (current_panel === panel_name ? null : panel_name))
  }

  const close_panel = () => set_open_panel(null)

  function reloadMessages() {
    set_new_messages_notice(null)
    set_messages_reload_key((current_key) => current_key + 1)
  }

  function handleNewChannelMessage(message) {
    set_new_messages_notice((current_notice) => ({
      count: (current_notice?.count ?? 0) + 1,
      author_name: message?.autor?.nombre ?? 'Un miembro'
    }))
  }

  function handleShowNewMessages() {
    reloadMessages()
  }

  async function handleSendMessage(content) {
    if (!active_channel_id) {
      return null
    }

    let message_created = null

    if (isSocketConnected()) {
      // Con WebSocket abierto el mensaje viaja por el socket: la misma
      // instancia que lo persiste avisa a los demas miembros del canal.
      message_created = await sendChannelMessage(active_channel_id, content)
    }
    else {
      // Sin socket disponible se usa el endpoint REST de siempre.
      const response_body = await createChannelMessage(
        workspace_id,
        active_channel_id,
        content
      )

      message_created = response_body?.data?.message_created ?? null
    }

    if (message_created) {
      set_messages((current_messages) => [...current_messages, message_created])
    }

    set_new_messages_notice(null)

    return message_created
  }

  async function handleCreateChannel(channel_data) {
    const response_body = await createChannel(workspace_id, channel_data)
    const channel_created = response_body?.data?.channel_created

    set_selected_channel_id(channel_created?.canal_id ?? null)
    await reloadChannels()

    return channel_created
  }

  function handleRequestDeleteChannel(channel) {
    set_delete_error(null)
    set_channel_to_delete(channel)
  }

  function handleCancelDeleteChannel() {
    if (delete_loading) {
      return
    }

    set_delete_error(null)
    set_channel_to_delete(null)
  }

  async function handleConfirmDeleteChannel() {
    if (!channel_to_delete) {
      return
    }

    set_delete_loading(true)
    set_delete_error(null)

    try {
      await deleteChannel(workspace_id, channel_to_delete.canal_id)

      if (String(selected_channel_id) === String(channel_to_delete.canal_id)) {
        set_selected_channel_id(null)
      }

      set_channel_to_delete(null)
      await reloadChannels()
    }
    catch (error) {
      set_delete_error(error.message)
    }
    finally {
      set_delete_loading(false)
    }
  }

  if (screen_loading || (!workspace_response && !screen_error)) {
    return (
      <div className="ws-state-screen">
        <div className="ws-state-card" role="status" aria-live="polite">
          <span className="ws-state-mark" aria-hidden="true">S</span>
          <h1 className="ws-state-title">Cargando espacio de trabajo</h1>
          <p className="ws-state-text">Estamos trayendo el espacio y sus miembros...</p>
          <span className="ws-state-spinner" aria-hidden="true" />
        </div>
      </div>
    )
  }

  if (screen_error || !workspace_selected) {
    return (
      <div className="ws-state-screen">
        <div className="ws-state-card">
          <span className="ws-state-mark" aria-hidden="true">S</span>
          <h1 className="ws-state-title">No pudimos abrir el espacio</h1>
          <p className="ws-state-text">
            {screen_error || 'La respuesta del servidor no incluyó el espacio de trabajo.'}
          </p>

          <div className="ws-state-actions">
            <button type="button" className="ws-state-button" onClick={reloadScreen}>
              Recargar
            </button>
            <Link className="ws-state-link" to="/">
              ← Mis espacios
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="workspace-screen">

      <WorkspaceRail
        workspaces={workspaces}
        active_workspace_id={workspace_id}
        onCreateWorkspace={() => set_create_workspace_open(true)}
      />

      <ChannelSidebar
        workspace_name={workspace_selected.nombre}
        workspace_logo={workspace_selected.logo ?? null}
        current_user={current_user}
        channel_groups={channel_groups}
        active_channel_id={active_channel?.canal_id ?? null}
        channels_loading={channels_loading}
        channels_error={channels_error}
        can_manage_channels={can_manage_channels}
        is_open={open_panel === 'canales'}
        on_close={close_panel}
        on_select_channel={set_selected_channel_id}
        on_reload_channels={reloadChannels}
        on_create_channel={handleCreateChannel}
        on_request_delete_channel={handleRequestDeleteChannel}
      />

      <ChatArea
        channel={active_channel}
        messages={messages}
        messages_loading={messages_loading}
        messages_error={messages_error}
        new_messages_notice={new_messages_notice}
        members_count={members.length}
        channels_open={open_panel === 'canales'}
        members_open={open_panel === 'miembros'}
        on_toggle_channels={() => toggle_panel('canales')}
        on_toggle_members={() => toggle_panel('miembros')}
        on_reload_messages={reloadMessages}
        on_show_new_messages={handleShowNewMessages}
        on_send_message={handleSendMessage}
      />

      <MembersPanel
        members={members}
        is_open={open_panel === 'miembros'}
        on_close={close_panel}
      />

      {open_panel && (
        <div
          className="ws-overlay"
          onClick={close_panel}
          aria-hidden="true"
        />
      )}

      {channel_to_delete && (
        <div
          className="ws-confirm-overlay"
          onClick={handleCancelDeleteChannel}
        >
          <div
            className="ws-confirm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ws-confirm-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="ws-confirm-title" id="ws-confirm-title">Eliminar canal</h2>
            <p className="ws-confirm-text">
              ¿Querés eliminar <strong>#{channel_to_delete.canal_nombre}</strong>?
              Se van a borrar también sus mensajes.
            </p>

            {delete_error && (
              <p className="ws-confirm-error" role="alert">{delete_error}</p>
            )}

            <div className="ws-confirm-actions">
              <button
                type="button"
                className="ws-confirm-button ws-confirm-cancel"
                onClick={handleCancelDeleteChannel}
                disabled={delete_loading}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="ws-confirm-button ws-confirm-delete"
                onClick={handleConfirmDeleteChannel}
                disabled={delete_loading}
              >
                {delete_loading ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {create_workspace_open && (
        <CreateWorkspaceModal
          onClose={() => set_create_workspace_open(false)}
          onCreated={reloadScreen}
        />
      )}

    </div>
  )
}

export default WorkspaceScreen
