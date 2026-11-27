import { useState } from 'react'
import { useNavigate } from 'react-router'
import useForm from '../../hooks/useForm'
import { getAllWorkspaces } from '../../services/workspacesService'
import { deleteMe, updateMe } from '../../services/userService'
import { getSessionUser } from '../../utils/session.util'
import { disconnectSocket } from '../../services/socketService'
import './SettingsScreen.css'

/*
Pantalla de configuracion de la propia cuenta:

- Muestra los datos de la sesion (nombre y email) y permite cambiar el nombre.
  Al guardar, el backend devuelve un JWT re-firmado con el nombre nuevo y se
  reemplaza el token guardado (sin necesidad de volver a iniciar sesion)
- Zona de peligro: borrar la cuenta DEFINITIVAMENTE. Antes de confirmar se
  avisa que se eliminan tambien los espacios donde el usuario es unico owner
  (con sus canales y mensajes) y se los lista
*/

function SettingsScreen() {

  const session_user = getSessionUser()
  const navigate = useNavigate()

  /* El boton "Volver" regresa a la screen anterior (el workspace o el home,
     segun de donde se haya entrado a configuracion). Si se abrio /settings
     directo y no hay historial, se vuelve al home como referencia conocida */
  function handleGoBack() {
    const history_index = window.history.state?.idx

    if (typeof history_index === 'number' && history_index > 0) {
      navigate(-1)
    }
    else {
      navigate('/home')
    }
  }

  /* Formulario de nombre */
  const { formState, handleChangeInput } = useForm({
    name: session_user?.name ?? ''
  })

  const [name_error, setNameError] = useState(null)
  const [name_saving, setNameSaving] = useState(false)
  const [name_success, setNameSuccess] = useState(false)

  async function handleSaveName(event) {
    event.preventDefault()

    const name = formState.name.trim()

    if (!name) {
      setNameError('El nombre es obligatorio')
      return
    }
    if (name === session_user?.name) {
      setNameError('El nombre ingresado es igual al actual')
      return
    }

    setNameError(null)
    setNameSuccess(false)
    setNameSaving(true)

    try {
      const response = await updateMe(name)

      /* El backend re-emite el JWT con el nombre nuevo: se reemplaza la
         credencial guardada para que la UI refleje el cambio sin re-login */
      if (response.data?.auth_token) {
        localStorage.setItem('auth_token', response.data.auth_token)
      }

      setNameSuccess(true)
    }
    catch (error) {
      setNameError(error.message)
    }
    finally {
      setNameSaving(false)
    }
  }

  /* Modal de borrado de cuenta */
  const [delete_open, setDeleteOpen] = useState(false)
  const [owner_workspaces, setOwnerWorkspaces] = useState(null)
  const [owner_workspaces_loading, setOwnerWorkspacesLoading] = useState(false)
  const [delete_confirming, setDeleteConfirming] = useState(false)
  const [delete_error, setDeleteError] = useState(null)

  async function openDeleteModal() {
    setDeleteOpen(true)
    setDeleteConfirming(false)
    setDeleteError(null)
    setOwnerWorkspaces(null)

    /* Se traen los espacios propios para listar los que estan en riesgo
       (los que se eliminan si el usuario es su unico owner) */
    setOwnerWorkspacesLoading(true)
    try {
      const response = await getAllWorkspaces()
      const owned = (response.data?.workspaces ?? []).filter(
        (workspace) => workspace.member_rol === 'owner'
      )
      setOwnerWorkspaces(owned)
    }
    catch {
      /* Si la lista falla el modal sigue usable: el aviso es generico */
      setOwnerWorkspaces(null)
    }
    finally {
      setOwnerWorkspacesLoading(false)
    }
  }

  function closeDeleteModal() {
    if (delete_confirming) {
      return
    }
    setDeleteOpen(false)
    setDeleteError(null)
  }

  async function handleConfirmDelete() {
    if (delete_confirming) {
      return
    }

    setDeleteConfirming(true)
    setDeleteError(null)

    try {
      await deleteMe()

      /* Cuenta eliminada: se corta el realtime y se descarta la credencial.
         El guard de rutas manda a /login */
      disconnectSocket()
      localStorage.removeItem('auth_token')
      navigate('/login')
    }
    catch (error) {
      setDeleteError(error.message)
      setDeleteConfirming(false)
    }
  }

  return (
    <div className="settings-screen">

      <header className="settings-topbar">
        <button
          type="button"
          className="settings-back-button"
          onClick={handleGoBack}
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Volver
        </button>
      </header>

      <main className="settings-panel">
        <div className="settings-panel-inner">

          <h1 className="settings-title">Configuración</h1>
          <p className="settings-subtitle">Gestioná los datos de tu cuenta.</p>

          {/* Seccion de datos de la cuenta */}
          <section className="settings-card">
            <h2 className="settings-card-title">Tu cuenta</h2>

            <label className="settings-label" htmlFor="settings-email">
              Correo electrónico
            </label>
            <input
              className="settings-input settings-input-readonly"
              id="settings-email"
              type="email"
              value={session_user?.email ?? ''}
              readOnly
              disabled
            />
            <span className="settings-help">El correo no se puede cambiar.</span>

            <form className="settings-form" onSubmit={handleSaveName}>
              <label className="settings-label" htmlFor="settings-name">
                Nombre
              </label>
              <input
                className="settings-input"
                name="name"
                id="settings-name"
                type="text"
                placeholder="Tu nombre"
                maxLength={60}
                value={formState.name}
                onChange={(event) => {
                  setNameError(null)
                  setNameSuccess(false)
                  handleChangeInput(event)
                }}
                disabled={name_saving}
                autoComplete="off"
              />

              {name_error && (
                <p className="settings-message settings-message-error">{name_error}</p>
              )}
              {name_success && (
                <p className="settings-message settings-message-success">
                  Nombre actualizado correctamente.
                </p>
              )}

              <button
                className="settings-submit"
                type="submit"
                disabled={name_saving}
              >
                {name_saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </form>
          </section>

          {/* Zona de peligro */}
          <section className="settings-card settings-card-danger">
            <h2 className="settings-card-title">Zona de peligro</h2>
            <p className="settings-danger-text">
              Al borrar tu cuenta se eliminan <strong>todos los espacios de trabajo de los
              que sos propietario</strong> junto con sus canales y mensajes, y los mensajes
              que escribiste en espacios ajenos. Esta acción es irreversible.
            </p>

            <button
              className="settings-delete-button"
              type="button"
              onClick={openDeleteModal}
            >
              Borrar cuenta
            </button>
          </section>

        </div>
      </main>

      {/* Modal de confirmacion del borrado */}
      {delete_open && (
        <div
          className="settings-modal-backdrop"
          onClick={closeDeleteModal}
        >
          <div
            className="settings-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-delete-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="settings-modal-title" id="settings-delete-title">
              ¿Borrar tu cuenta?
            </h2>

            <p className="settings-modal-text">
              Esta acción es <strong>irreversible</strong>. Se eliminará tu cuenta y
              también <strong>los espacios de trabajo donde sos el único propietario</strong>,
              incluidos sus canales y todos sus mensajes. Los mensajes que escribiste en
              espacios de otras personas también se borrarán.
            </p>

            <div className="settings-modal-warning">
              {owner_workspaces_loading && (
                <span className="settings-modal-warning-loading">
                  Buscando espacios en riesgo...
                </span>
              )}

              {!owner_workspaces_loading && owner_workspaces && owner_workspaces.length === 0 && (
                <span>
                  Según nuestros registros, no tenés espacios de trabajo propios: solo se
                  borrarán tus mensajes en espacios ajenos.
                </span>
              )}

              {!owner_workspaces_loading && owner_workspaces && owner_workspaces.length > 0 && (
                <>
                  <span className="settings-modal-warning-title">
                    Se eliminarán estos espacios de trabajo:
                  </span>
                  <ul className="settings-modal-workspace-list">
                    {owner_workspaces.map((workspace) => (
                      <li key={workspace.workspace_id}>
                        {workspace.workspace_nombre || 'Espacio de trabajo'}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            {delete_error && (
              <p className="settings-message settings-message-error">{delete_error}</p>
            )}

            <div className="settings-modal-actions">
              <button
                type="button"
                className="settings-modal-cancel"
                onClick={() => setDeleteOpen(false)}
                disabled={delete_confirming}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="settings-modal-confirm"
                onClick={handleConfirmDelete}
                disabled={delete_confirming}
              >
                {delete_confirming ? 'Eliminando cuenta...' : 'Eliminar mi cuenta'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default SettingsScreen
