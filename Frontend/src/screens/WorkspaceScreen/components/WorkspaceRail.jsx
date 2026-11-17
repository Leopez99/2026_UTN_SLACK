import { Link } from 'react-router'
import Avatar from './Avatar'
import { IconPlus } from './Icons'

/*
Rail izquierdo: espacios de trabajo del usuario, como los servidores de Discord.
El espacio activo se marca con la píldora blanca de la izquierda.
*/
function WorkspaceRail({ workspaces = [], active_workspace_id }) {
  return (
    <nav className="ws-rail" aria-label="Espacios de trabajo">

      <Link className="ws-rail-item ws-rail-home" to="/" title="Mis espacios de trabajo">
        <span className="ws-rail-home-mark" aria-hidden="true">S</span>
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
                  size="rail"
                />
                <span className="ws-rail-pill" aria-hidden="true" />
              </Link>
            </li>
          )
        })}
      </ul>

      <Link
        className="ws-rail-item ws-rail-add"
        to="/create-workspace"
        title="Crear un espacio de trabajo"
        aria-label="Crear un espacio de trabajo"
      >
        <IconPlus size={24} />
      </Link>

    </nav>
  )
}

export default WorkspaceRail
