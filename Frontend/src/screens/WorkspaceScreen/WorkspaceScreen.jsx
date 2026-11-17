import { Link, useParams } from 'react-router'
import useWorkspaceScreen from '../../hooks/useWorkspaceScreen'
import { getSessionUser } from '../../utils/session.util'
import WorkspaceRail from './components/WorkspaceRail'
import ChannelSidebar from './components/ChannelSidebar'
import ChatArea from './components/ChatArea'
import MembersPanel from './components/MembersPanel'
import {
  MOCK_CHANNEL_GROUPS,
  MOCK_MESSAGES,
  getActiveChannel
} from './data/workspaceMockData'
import './WorkspaceScreen.css'

/*
Pantalla de un espacio de trabajo con el layout de un servidor de Discord:
rail de espacios | canales | chat | miembros.

Datos reales: espacio seleccionado, listado de espacios y miembros.
Datos mock: canales y mensajes (ver data/workspaceMockData.js).
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

  const workspace_selected = workspace_response?.data?.workspace_selected
  const members = workspace_response?.data?.members ?? []
  const workspaces = workspaces_response?.data?.workspaces ?? []

  const current_user = getSessionUser()
  const active_channel = getActiveChannel()

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
      />

      <ChannelSidebar
        workspace_name={workspace_selected.nombre}
        current_user={current_user}
        channel_groups={MOCK_CHANNEL_GROUPS}
        active_channel_id={active_channel.canal_id}
      />

      <ChatArea
        channel={active_channel}
        messages={MOCK_MESSAGES}
        members_count={members.length}
      />

      <MembersPanel members={members} />

    </div>
  )
}

export default WorkspaceScreen
