import { useState } from 'react'
import Avatar from './Avatar'
import workspace_default_logo from '../../../assets/Logos dislack/Logo dislack.png'
import {
  IconChevronDown,
  IconClose,
  IconHash,
  IconPlus,
  IconSettings,
  IconTrash
} from './Icons'

/*
Sidebar de canales del espacio de trabajo activo.
Los canales salen de la API; el nombre del espacio y el usuario de la barra
inferior tambien son datos reales.

En pantallas chicas se muestra como drawer, por eso recibe is_open/on_close.
Crear y borrar canales solo esta disponible para owner/admin (el backend
tambien lo valida).
*/
function ChannelSidebar({
  workspace_name = 'Espacio de trabajo',
  workspace_logo = null,
  current_user,
  channel_groups = [],
  active_channel_id,
  channels_loading = false,
  channels_error = null,
  can_manage_channels = false,
  is_open = false,
  on_close,
  on_select_channel,
  on_reload_channels,
  on_create_channel,
  on_request_delete_channel
}) {
  const user_name = current_user?.name || 'Mi cuenta'

  const [create_form_open, set_create_form_open] = useState(false)
  const [form_state, set_form_state] = useState({ name: '', description: '' })
  const [form_error, set_form_error] = useState(null)
  const [creating, set_creating] = useState(false)

  const has_channels = channel_groups.some((group) => group.canales.length > 0)

  function handleFormChange(event) {
    const { name, value } = event.target

    set_form_state((current_state) => ({
      ...current_state,
      [name]: value
    }))
  }

  function openCreateForm() {
    set_form_state({ name: '', description: '' })
    set_form_error(null)
    set_create_form_open(true)
  }

  function closeCreateForm() {
    if (creating) {
      return
    }

    set_form_state({ name: '', description: '' })
    set_form_error(null)
    set_create_form_open(false)
  }

  function handleCloseSidebar() {
    closeCreateForm()
    on_close?.()
  }

  async function handleCreateChannel(event) {
    event.preventDefault()

    const channel_name = form_state.name.trim()

    if (!channel_name) {
      set_form_error('El nombre del canal es obligatorio')
      return
    }

    set_creating(true)
    set_form_error(null)

    try {
      await on_create_channel({
        name: channel_name,
        description: form_state.description.trim()
      })

      set_form_state({ name: '', description: '' })
      set_create_form_open(false)
    }
    catch (error) {
      set_form_error(error.message)
    }
    finally {
      set_creating(false)
    }
  }

  return (
    <aside
      id="ws-channel-sidebar"
      className={is_open ? 'ws-sidebar ws-sidebar-open' : 'ws-sidebar'}
      aria-label={`Canales de ${workspace_name}`}
    >

      <header className="ws-sidebar-header">
        <img
          className="ws-sidebar-logo"
          src={workspace_logo || workspace_default_logo}
          alt=""
          aria-hidden="true"
          title={workspace_name}
        />

        <span className="ws-sidebar-title" title={workspace_name}>
          {workspace_name}
        </span>

        <IconChevronDown size={18} className="ws-sidebar-chevron" />

        <div className="ws-sidebar-actions">
          {can_manage_channels && (
            <button
              type="button"
              className="ws-icon-button ws-sidebar-add"
              title="Crear canal"
              aria-label="Crear canal"
              aria-expanded={create_form_open}
              onClick={create_form_open ? closeCreateForm : openCreateForm}
            >
              <IconPlus size={20} />
            </button>
          )}

          <button
            type="button"
            className="ws-icon-button ws-sidebar-close"
            title="Cerrar canales"
            aria-label="Cerrar canales"
            onClick={handleCloseSidebar}
          >
            <IconClose size={20} />
          </button>
        </div>
      </header>

      <div className="ws-channel-scroll">

        {create_form_open && (
          <form className="ws-channel-form" onSubmit={handleCreateChannel}>
            <label className="ws-channel-form-label" htmlFor="ws-channel-name">
              Nuevo canal
            </label>

            <input
              className="ws-channel-form-input"
              id="ws-channel-name"
              name="name"
              type="text"
              placeholder="nombre-del-canal"
              maxLength={60}
              value={form_state.name}
              onChange={handleFormChange}
              disabled={creating}
              autoComplete="off"
              autoFocus
            />

            <input
              className="ws-channel-form-input"
              name="description"
              type="text"
              placeholder="Descripción (opcional)"
              maxLength={1000}
              value={form_state.description}
              onChange={handleFormChange}
              disabled={creating}
            />

            {form_error && (
              <p className="ws-channel-form-error" role="alert">{form_error}</p>
            )}

            <div className="ws-channel-form-actions">
              <button
                type="button"
                className="ws-channel-form-button ws-channel-form-cancel"
                onClick={closeCreateForm}
                disabled={creating}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="ws-channel-form-button ws-channel-form-submit"
                disabled={creating}
              >
                {creating ? 'Creando...' : 'Crear canal'}
              </button>
            </div>
          </form>
        )}

        {channels_loading && !has_channels && (
          <p className="ws-channel-empty">Cargando canales...</p>
        )}

        {!channels_loading && channels_error && (
          <div className="ws-channel-empty">
            <p className="ws-channel-empty-text">{channels_error}</p>
            <button
              type="button"
              className="ws-channel-retry"
              onClick={on_reload_channels}
            >
              Reintentar
            </button>
          </div>
        )}

        {!channels_loading && !channels_error && !has_channels && (
          <p className="ws-channel-empty">Este espacio todavía no tiene canales.</p>
        )}

        {channel_groups.map((group) => (
          group.canales.length > 0 && (
            <section className="ws-channel-group" key={group.grupo_id}>
              {group.grupo_nombre && (
                <h3 className="ws-channel-group-title">
                  <IconChevronDown size={12} />
                  <span>{group.grupo_nombre}</span>
                </h3>
              )}

              <ul className="ws-channel-list">
                {group.canales.map((channel) => {
                  const is_active = String(channel.canal_id) === String(active_channel_id)
                  const can_delete = can_manage_channels && channel.canal_nombre !== 'General'

                  return (
                    <li
                      className={
                        is_active
                          ? 'ws-channel-item ws-channel-item-active'
                          : 'ws-channel-item'
                      }
                      key={channel.canal_id}
                    >
                      <button
                        type="button"
                        className="ws-channel"
                        title={channel.canal_descripcion || channel.canal_nombre}
                        aria-current={is_active ? 'page' : undefined}
                        onClick={() => on_select_channel(channel.canal_id)}
                      >
                        <IconHash size={18} className="ws-channel-hash" />
                        <span className="ws-channel-name">{channel.canal_nombre}</span>
                      </button>

                      {can_delete && (
                        <button
                          type="button"
                          className="ws-channel-delete"
                          title={`Eliminar #${channel.canal_nombre}`}
                          aria-label={`Eliminar canal ${channel.canal_nombre}`}
                          onClick={() => on_request_delete_channel(channel)}
                        >
                          <IconTrash size={16} />
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          )
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
          <button type="button" className="ws-icon-button" title="Ajustes de usuario" aria-label="Ajustes de usuario">
            <IconSettings size={19} />
          </button>
        </div>
      </footer>

    </aside>
  )
}

export default ChannelSidebar
