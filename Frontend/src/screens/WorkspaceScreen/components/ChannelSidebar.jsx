import Avatar from './Avatar'
import {
  IconChevronDown,
  IconHash,
  IconHeadphones,
  IconHome,
  IconMic,
  IconSettings,
  IconUsers
} from './Icons'

/*
Sidebar de canales del espacio de trabajo activo.
Por ahora los canales son mock y el canal activo es fijo; el nombre del
espacio y el usuario de la barra inferior sí salen de datos reales.
*/
function ChannelSidebar({
  workspace_name = 'Espacio de trabajo',
  current_user,
  channel_groups = [],
  active_channel_id
}) {
  const user_name = current_user?.name || 'Mi cuenta'

  return (
    <aside className="ws-sidebar" aria-label={`Canales de ${workspace_name}`}>

      <header className="ws-sidebar-header">
        <span className="ws-sidebar-title" title={workspace_name}>
          {workspace_name}
        </span>

        <IconChevronDown size={18} className="ws-sidebar-chevron" />

        <button
          type="button"
          className="ws-icon-button ws-sidebar-members-button"
          title="Miembros del espacio"
          aria-label="Miembros del espacio"
        >
          <IconUsers size={20} />
        </button>
      </header>

      <div className="ws-channel-scroll">

        <div className="ws-channel-shortcut">
          <IconHome size={18} className="ws-channel-shortcut-icon" />
          <span>Centro del espacio</span>
        </div>

        {channel_groups.map((group) => (
          <section className="ws-channel-group" key={group.grupo_id}>
            <h3 className="ws-channel-group-title">
              <IconChevronDown size={12} />
              <span>{group.grupo_nombre}</span>
            </h3>

            <ul className="ws-channel-list">
              {group.canales.map((channel) => {
                const is_active = channel.canal_id === active_channel_id

                return (
                  <li key={channel.canal_id}>
                    <div
                      className={
                        is_active
                          ? 'ws-channel ws-channel-active'
                          : 'ws-channel'
                      }
                      title={channel.canal_descripcion}
                      aria-current={is_active ? 'page' : undefined}
                    >
                      <IconHash size={18} className="ws-channel-hash" />
                      <span className="ws-channel-name">{channel.canal_nombre}</span>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}

      </div>

      <footer className="ws-user-bar">
        <Avatar name={user_name} size="sm" status="online" />

        <div className="ws-user-meta">
          <span className="ws-user-name" title={current_user?.email}>
            {user_name}
          </span>
          <span className="ws-user-status">En línea</span>
        </div>

        <div className="ws-user-actions">
          <button type="button" className="ws-icon-button" title="Silenciar micrófono" aria-label="Silenciar micrófono">
            <IconMic size={19} />
          </button>
          <button type="button" className="ws-icon-button" title="Auriculares" aria-label="Auriculares">
            <IconHeadphones size={19} />
          </button>
          <button type="button" className="ws-icon-button" title="Ajustes de usuario" aria-label="Ajustes de usuario">
            <IconSettings size={19} />
          </button>
        </div>
      </footer>

    </aside>
  )
}

export default ChannelSidebar
