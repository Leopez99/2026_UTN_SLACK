import { useEffect, useState } from 'react'
import Avatar from './Avatar'
import { IconClose, IconTrash } from './Icons'
import { removeWorkspaceMember } from '../../../services/workspacesService'

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

/*
Panel de miembros del espacio de trabajo. Cuando `can_remove_members` viene
activo (owner/admin), a la derecha de cada miembros elegible aparece el tacho
para expulsarlo, con las mismas reglas que valida el backend:

- el owner del espacio no se puede eliminar
- nadie se puede eliminar a si mismo
- un admin no puede eliminar a otro admin

Los eliminados se sacan de la lista en el momento y el padre recarga los
datos cuando corresponde (avisa con on_removed).
*/
function MembersPanel({
  members = [],
  workspace_id,
  current_user_id = null,
  can_remove_members = false,
  is_open = false,
  on_close,
  on_removed
}) {

  /* Miembros eliminados en esta sesion del panel: se quitan de la lista
     hasta que el padre recargue (con la respuesta nueva se resetea) */
  const [removed_member_ids, set_removed_member_ids] = useState([])
  const [member_to_remove, set_member_to_remove] = useState(null)
  const [removing_member_id, set_removing_member_id] = useState(null)
  const [members_error, set_members_error] = useState(null)

  /* Si el padre recarga y trae la lista nueva del backend, este estado se limpia */
  useEffect(() => {
    set_removed_member_ids([])
  }, [members])

  const visible_members = members.filter(
    (member) => !removed_member_ids.includes(String(member.member_id))
  )
  const members_count = visible_members.length

  /* Rol del usuario actual dentro de este espacio, para la regla admin/admin */
  const my_membership = members.find(
    (member) => String(member.usuario?.id) === String(current_user_id)
  )
  const my_role = my_membership?.member_rol ?? null

  function canRemoveMember(member) {
    if (!can_remove_members || !current_user_id) {
      return false
    }

    if (String(member.usuario?.id) === String(current_user_id)) {
      return false
    }

    if (member.member_rol === 'owner') {
      return false
    }

    if (my_role === 'admin' && member.member_rol === 'admin') {
      return false
    }

    return true
  }

  function requestRemoveMember(member) {
    set_members_error(null)
    set_member_to_remove(String(member.member_id))
  }

  function cancelRemoveMember() {
    if (removing_member_id) {
      return
    }

    set_member_to_remove(null)
  }

  async function confirmRemoveMember(member) {
    if (removing_member_id) {
      return
    }

    set_removing_member_id(String(member.member_id))
    set_members_error(null)

    try {
      await removeWorkspaceMember(workspace_id, member.member_id)

      set_removed_member_ids((prev_ids) => [...prev_ids, String(member.member_id)])
      set_member_to_remove(null)
      on_removed?.()
    }
    catch (error) {
      set_members_error(error.message)
    }
    finally {
      set_removing_member_id(null)
    }
  }

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

      <div className="ws-members-scroll">
        {members_count === 0 && (
          <p className="ws-members-empty">Todavía no hay miembros en este espacio.</p>
        )}

        {ROLE_GROUPS.map((group) => {
          const group_members = visible_members.filter(
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
                  const member_id_string = String(member.member_id)
                  const removable = canRemoveMember(member)
                  const confirming = member_to_remove === member_id_string
                  const removing = removing_member_id === member_id_string

                  return (
                    <li className="ws-member" key={member.member_id} title={member.usuario?.email}>
                      <Avatar name={member_name} size="sm" status={getMemberStatus(member)} />

                      <div className="ws-member-info">
                        <span className="ws-member-name">{member_name}</span>
                        <span className="ws-member-role">
                          {ROLE_LABELS[member.member_rol] || 'Miembro'}
                        </span>
                      </div>

                      {removable && (
                        confirming ? (
                          <div className="ws-member-confirm">
                            <span className="ws-member-confirm-text">¿Eliminar?</span>
                            <button
                              type="button"
                              className="ws-member-cancel"
                              onClick={cancelRemoveMember}
                              disabled={removing}
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              className="ws-member-remove"
                              onClick={() => confirmRemoveMember(member)}
                              disabled={removing}
                              autoFocus
                            >
                              {removing ? 'Eliminando...' : 'Eliminar'}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="ws-member-delete"
                            title={`Eliminar a ${member_name}`}
                            aria-label={`Eliminar a ${member_name} del espacio de trabajo`}
                            onClick={() => requestRemoveMember(member)}
                            disabled={Boolean(removing_member_id)}
                          >
                            <IconTrash size={15} />
                          </button>
                        )
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}

        {members_error && (
          <p className="ws-members-error" role="alert">{members_error}</p>
        )}
      </div>

    </aside>
  )
}

export default MembersPanel
