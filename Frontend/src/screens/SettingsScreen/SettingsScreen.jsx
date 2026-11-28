import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import useForm from '../../hooks/useForm'
import { getAllWorkspaces } from '../../services/workspacesService'
import { deleteMe, getMe, updateMe } from '../../services/userService'
import { getSessionUser } from '../../utils/session.util'
import { getInitials, getColorForSeed, AVATAR_COLORS } from '../../utils/avatar.util'
import { readImageAsAvatarDataUrl } from '../../utils/logo.util'
import './SettingsScreen.css'

/*
Pantalla de configuracion de la propia cuenta:

- Muestra los datos de la sesion (nombre y email). Al montar trae el perfil
  completo con GET /api/users/me, porque la foto de perfil y la descripcion
  NO viajan dentro del JWT
- Permite cambiar el nombre, la descripcion (bio, max 160) y la foto de
  perfil. Al guardar, el backend devuelve un JWT re-firmado con el nombre
  nuevo y se reemplaza el token guardado (sin volver a iniciar sesion)
  - La foto usa la misma semantica de 3 estados que el logo de un workspace:
    omitida conserva la actual, null la quita y data URL la reemplaza
- Zona de peligro: borrar la cuenta DEFINITIVAMENTE. Antes de confirmar se
  avisa que se eliminan tambien los espacios donde el usuario es unico owner
  (con sus canales y mensajes) y se los lista
*/

const DESCRIPCION_MAX = 160

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

  /* Perfil completo cargado desde GET /api/users/me (foto + descripcion).
     Mientras llega se usa lo que se puede deducir del token (nombre) */
  const [profile, setProfile] = useState({ foto_perfil: null, descripcion: '' })
  const [profile_loading, setProfileLoading] = useState(true)

  /* Formulario de nombre y descripcion */
  const { formState, handleChangeInput } = useForm({
    name: session_user?.name ?? ''
  })

  const [descripcion, setDescripcion] = useState('')

  /* Cuando llegan los datos reales del perfil se sincroniza la descripcion */
  useEffect(() => {
    (
      async () => {
        try {
          const response = await getMe()
          const user = response.data?.user

          setProfile({
            foto_perfil: user?.foto_perfil ?? null,
            descripcion: user?.descripcion ?? ''
          })
          setDescripcion(user?.descripcion ?? '')
        }
        catch {
          /* Si getMe falla la pantalla sigue usable: se edita sobre valores vacios */
        }
        finally {
          setProfileLoading(false)
        }
      }
    )()
  }, [])

  /* Foto de perfil con 3 estados:
     - foto_changed false   -> no se toco (no se envia el campo)
     - foto_changed + null  -> se quita la foto (se envia null)
     - foto_changed + url   -> nueva foto (se envia data URL) */
  const [foto_perfil, setFotoPerfil] = useState(null)
  const [foto_changed, setFotoChanged] = useState(false)
  const [foto_error, setFotoError] = useState(null)
  const foto_input_ref = useRef(null)

  async function handleFotoChange(event) {
    const file = event.target.files?.[0]

    /* Se resetea el input para poder reelegir el mismo archivo despues */
    event.target.value = ''

    if (!file || name_saving) {
      return
    }

    setFotoError(null)

    try {
      const data_url = await readImageAsAvatarDataUrl(file)
      setFotoPerfil(data_url)
      setFotoChanged(true)
    }
    catch (error) {
      setFotoError(error.message)
    }
  }

  function openFotoPicker() {
    if (!name_saving) {
      foto_input_ref.current?.click()
    }
  }

  function removeFoto() {
    setFotoPerfil(null)
    setFotoChanged(true)
    setFotoError(null)

    if (foto_input_ref.current) {
      foto_input_ref.current.value = ''
    }
  }

  const [name_error, setNameError] = useState(null)
  const [name_saving, setNameSaving] = useState(false)
  const [name_success, setNameSuccess] = useState(false)

  async function handleSaveProfile(event) {
    event.preventDefault()

    const name = formState.name.trim()

    if (!name) {
      setNameError('El nombre es obligatorio')
      return
    }

    const descripcion_guardada = descripcion.trim()

    if (descripcion_guardada.length > DESCRIPCION_MAX) {
      setNameError(`La descripción no puede superar los ${DESCRIPCION_MAX} caracteres`)
      return
    }

    const nombre_actual = session_user?.name ?? name
    const descripcion_actual = profile.descripcion ?? ''
    const foto_actual = profile.foto_perfil ?? null

    const sin_cambios =
      name === nombre_actual &&
      descripcion_guardada === descripcion_actual &&
      !foto_changed

    if (sin_cambios) {
      setNameError('No hay cambios para guardar')
      return
    }

    setNameError(null)
    setNameSuccess(false)
    setNameSaving(true)

    try {
      const response = await updateMe(
        name,
        descripcion_guardada,
        /* 3 estados: undefined conserva, null quita, data URL reemplaza */
        foto_changed ? foto_perfil : undefined
      )

      /* El backend re-emite el JWT con el nombre nuevo: se reemplaza la
         credencial guardada para que la UI refleje el cambio sin re-login */
      if (response.data?.auth_token) {
        localStorage.setItem('auth_token', response.data.auth_token)
      }

      /* Los valores guardados pasan a ser la referencia de "actual" */
      setProfile({
        foto_perfil: response.data?.user_updated?.foto_perfil ?? null,
        descripcion: response.data?.user_updated?.descripcion ?? ''
      })
      setFotoChanged(false)

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

      /* Cuenta eliminada: se descarta la credencial y el guard de rutas
         manda a /login */
      localStorage.removeItem('auth_token')
      navigate('/login')
    }
    catch (error) {
      setDeleteError(error.message)
      setDeleteConfirming(false)
    }
  }

  /* Foto a mostrar: la nueva elegida (o quitada) mientras no se guarde,
     y la actual de DB si todavía no se toco */
  const foto_mostrada = foto_changed ? foto_perfil : profile.foto_perfil

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

            {/* Foto de perfil */}
            <div className="settings-profile">
              <button
                type="button"
                className="settings-avatar"
                onClick={openFotoPicker}
                title={foto_mostrada ? 'Cambiar foto de perfil' : 'Elegir foto de perfil'}
                aria-label={foto_mostrada ? 'Cambiar foto de perfil' : 'Elegir foto de perfil'}
                disabled={name_saving}
                style={foto_mostrada ? undefined : { backgroundColor: getColorForSeed(session_user?.name || '?', AVATAR_COLORS) }}
              >
                {foto_mostrada ? (
                  <img src={foto_mostrada} alt="" aria-hidden="true" />
                ) : (
                  <span aria-hidden="true">{getInitials(session_user?.name)}</span>
                )}
              </button>

              <div className="settings-profile-actions">
                <button
                  type="button"
                  className="settings-profile-action"
                  onClick={openFotoPicker}
                  disabled={name_saving}
                >
                  {foto_mostrada ? 'Cambiar foto' : 'Agregar foto'}
                </button>
                {foto_mostrada && (
                  <button
                    type="button"
                    className="settings-profile-action settings-profile-action--remove"
                    onClick={removeFoto}
                    disabled={name_saving}
                  >
                    Quitar
                  </button>
                )}
                <input
                  ref={foto_input_ref}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFotoChange}
                  hidden
                />
              </div>
            </div>

            {foto_error && (
              <p className="settings-message settings-message-error">{foto_error}</p>
            )}
            {profile_loading && (
              <p className="settings-help">Cargando tu foto y descripción...</p>
            )}

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

            <form className="settings-form" onSubmit={handleSaveProfile}>
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

              <label className="settings-label" htmlFor="settings-descripcion">
                Descripción
              </label>
              <textarea
                className="settings-input settings-textarea"
                name="descripcion"
                id="settings-descripcion"
                placeholder="Contale al equipo quién sos (opcional)"
                maxLength={DESCRIPCION_MAX}
                rows={2}
                value={descripcion}
                onChange={(event) => {
                  setNameError(null)
                  setNameSuccess(false)
                  setDescripcion(event.target.value)
                }}
                disabled={name_saving}
              />
              <span className="settings-char-count">
                {descripcion.length}/{DESCRIPCION_MAX}
              </span>

              {name_error && (
                <p className="settings-message settings-message-error">{name_error}</p>
              )}
              {name_success && (
                <p className="settings-message settings-message-success">
                  Perfil actualizado correctamente.
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
