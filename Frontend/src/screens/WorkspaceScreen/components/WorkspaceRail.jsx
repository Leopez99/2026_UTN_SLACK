import { Link } from 'react-router'
import Avatar from './Avatar'
import { IconPlus } from './Icons'
import workspace_default_logo from '../../../assets/Logos dislack/Logo dislack.png'
import workspace_full_logo from '../../../assets/Logos dislack/Dislack logo completo.png'

/*
Rail izquierdo: espacios de trabajo del usuario, como los servidores de Discord.
El espacio activo se marca con la píldora blanca de la izquierda.
*/
function WorkspaceRail({ workspaces = [], active_workspace_id, onCreateWorkspace }) {
  return (
    <nav className="ws-rail" aria-label="Espacios de trabajo">

      <Link className="ws-rail-item ws-rail-home" to="/" title="Mis espacios de trabajo">
        <img
          className="ws-rail-home-logo"
          src={workspace_full_logo}
          alt="Dislack"
          aria-hidden="true"
        />
      </Link>

      <div className="ws-rail-separator" aria-hidden="true" />

      <ul className="ws-rail-list">
        {workspaces.map((workspace) => {
          const is_active = String(workspace.workspace_id) === String(active_workspace_id)

          return (
            <li key={workspace.workspace_id}>
              <Link
                className={
                  is_active
                    ? 'ws-rail-item ws-rail-item-active'
                    : 'ws-rail-item'
                }
                to={`/workspace/${workspace.workspace_id}`}
                title={workspace.workspace_nombre}
                aria-current={is_active ? 'page' : undefined}
              >
                <Avatar
                  className="ws-guild-avatar"
                  name={workspace.workspace_nombre}
                  src={workspace.workspace_logo || workspace_default_logo}
                  size="rail"
                />
                <span className="ws-rail-pill" aria-hidden="true" />
              </Link>
            </li>
          )
        })}
      </ul>

      <button
        type="button"
        className="ws-rail-item ws-rail-add"
        title="Crear un espacio de trabajo"
        aria-label="Crear un espacio de trabajo"
        onClick={onCreateWorkspace}
      >
        <IconPlus size={24} />
      </button>

    </nav>
  )
}

export default WorkspaceRail
