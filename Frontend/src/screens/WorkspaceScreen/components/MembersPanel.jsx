import Avatar from './Avatar'
import { IconClose, IconSearch } from './Icons'

const ROLE_GROUPS = [
  { rol: 'owner', label: 'Dueño' },
  { rol: 'admin', label: 'Administradores' },
  { rol: 'user', label: 'Miembros' }
]

const ROLE_LABELS = {
  owner: 'Dueño del espacio',
  admin: 'Administrador',
  user: 'Miembro'
}

/* Simula presencia hasta que el backend exponga el estado de cada miembro */
function getMemberStatus(member) {
  const seed = member.usuario?.nombre || String(member.member_id || '')
  let hash = 0

  for (let index = 0; index < seed.length; index++) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 1000
  }

  return ['online', 'online', 'idle', 'offline'][hash % 4]
}

function MembersPanel({ members = [], is_open = false, on_close }) {
  const members_count = members.length

  return (
    <aside
      id="ws-members-panel"
      className={is_open ? 'ws-members ws-members-open' : 'ws-members'}
      aria-label="Miembros del espacio de trabajo"
    >

      <header className="ws-members-header">
        <span className="ws-members-title">
          Miembros — {members_count}
        </span>

        <button
          type="button"
          className="ws-icon-button ws-members-close"
          title="Cerrar miembros"
          aria-label="Cerrar miembros"
          onClick={on_close}
        >
          <IconClose size={20} />
        </button>
      </header>

      <div className="ws-members-search">
        <IconSearch size={16} className="ws-members-search-icon" />
        <input
          type="search"
          placeholder="Buscar miembros"
          aria-label="Buscar miembros"
        />
      </div>

      <div className="ws-members-scroll">
        {members_count === 0 && (
          <p className="ws-members-empty">Todavía no hay miembros en este espacio.</p>
        )}

        {ROLE_GROUPS.map((group) => {
          const group_members = members.filter(
            (member) => member.member_rol === group.rol
          )

          if (group_members.length === 0) {
            return null
          }

          return (
            <section className="ws-members-group" key={group.rol}>
              <h3 className="ws-members-group-title">
                {group.label} — {group_members.length}
              </h3>

              <ul className="ws-members-list">
                {group_members.map((member) => {
                  const member_name = member.usuario?.nombre || 'Usuario'

                  return (
                    <li className="ws-member" key={member.member_id} title={member.usuario?.email}>
                      <Avatar name={member_name} size="sm" status={getMemberStatus(member)} />

                      <div className="ws-member-info">
                        <span className="ws-member-name">{member_name}</span>
                        <span className="ws-member-role">
                          {ROLE_LABELS[member.member_rol] || 'Miembro'}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>

    </aside>
  )
}

export default MembersPanel
