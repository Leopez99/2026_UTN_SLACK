import { useEffect, useRef, useState } from 'react'
import { createInvitation } from '../../services/workspacesService'
import workspace_logo from '../../assets/Logos dislack/Logo dislack.png'
import './InviteUserModal.css'

/* Simple validacion de formato (la validez de que sea un usuario registrado la valida el backend) */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/* Etiquetas legibles para los roles de la invitacion */
const ROL_LABELS = { admin: 'admin', user: 'usuario' }

/*
Modal para invitar a un usuario a un espacio de trabajo:
- Lista de espacios con su logo (opcionalmente preseleccionado con
  initial_workspace_id, lo usa el WorkspaceScreen)
- Input de email (tiene que ser de un usuario registrado)
- Rol del invitado: solo el owner del workspace elegido ve el selector
  y puede dar admin; un admin o user siempre invita como usuario.
Cualquier miembro puede invitar.
*/
function InviteUserModal({ workspaces, onClose, onInvited, initial_workspace_id = '' }) {

    const [workspace_id, setWorkspaceId] = useState(initial_workspace_id)
    const [invite_rol, setInviteRol] = useState('user')

    const [email, setEmail] = useState('')
    const [email_error, setEmailError] = useState(null)

    const [invite_loading, setInviteLoading] = useState(false)
    const [invite_error, setInviteError] = useState(null)
    const [invited_user, setInvitedUser] = useState(null)

    const backdrop_ref = useRef(null)
    const email_input_ref = useRef(null)

    const workspace_selected = workspaces.find(
        (workspace) => String(workspace.workspace_id) === workspace_id
    )

    /* Solo un owner del espacio elegido puede invitar con rol admin */
    const can_invite_admin = workspace_selected?.member_rol === 'owner'

    /* Foco en el input de email al abrir */
    useEffect(
        () => {
            email_input_ref.current?.focus()
        },
        []
    )

    /* Escape cierra el modal (salvo mientras se envia la invitacion) */
    useEffect(
        () => {
            function handleDocumentKeyDown(event) {
                if (event.key === 'Escape' && !invite_loading) {
                    onClose()
                }
            }

            document.addEventListener('keydown', handleDocumentKeyDown)

            return () => {
                document.removeEventListener('keydown', handleDocumentKeyDown)
            }
        },
        [invite_loading, onClose]
    )

    function closeOnBackdropClick(event) {
        if (event.target === backdrop_ref.current && !invite_loading) {
            onClose()
        }
    }

    function selectWorkspace(workspace) {
        if (String(workspace.workspace_id) === workspace_id) {
            return
        }

        setWorkspaceId(String(workspace.workspace_id))
        setInviteRol('user')

        if (invite_error) {
            setInviteError(null)
        }
    }

    function handleEmailChange(event) {
        setEmail(event.target.value)

        if (email_error) {
            setEmailError(null)
        }
    }

    function validateEmail() {
        const email_value = email.trim()

        if (!email_value) {
            return 'Escribí el email del usuario a invitar'
        }

        if (!EMAIL_REGEX.test(email_value)) {
            return 'El formato del email no es válido'
        }

        return null
    }

    function canSubmit() {
        return Boolean(workspace_id && email.trim())
    }

    async function handleSubmit(event) {
        event.preventDefault()

        if (invite_loading || !canSubmit()) {
            return
        }

        const validation_error = validateEmail()
        if (validation_error) {
            setEmailError(validation_error)
            return
        }

        setInviteLoading(true)
        setInviteError(null)

        try {
            const response = await createInvitation(workspace_id, {
                email: email.trim(),
                rol: can_invite_admin ? invite_rol : 'user'
            })

            setInvitedUser(response.data.invitation_created)
            onInvited?.()
        }
        catch (error) {
            setInviteError(error.message)
        }
        finally {
            setInviteLoading(false)
        }
    }

    const form_disabled = invite_loading || workspaces.length === 0

    return (
        <div
            className="invite-backdrop"
            ref={backdrop_ref}
            onClick={closeOnBackdropClick}
        >
            <div
                className="invite-card"
                role="dialog"
                aria-modal="true"
                aria-labelledby="invite-title"
            >
                {invited_user ? (
                    <>
                        <h2 className="invite-title" id="invite-title">
                            Invitación enviada
                        </h2>

                        <p className="invite-text">
                            <strong>{invited_user.usuario.nombre}</strong> ({invited_user.usuario.email}) ahora
                            es miembro de <strong>{workspace_selected?.workspace_nombre ?? 'el espacio de trabajo'}</strong>{' '}
                            con rol <strong>{ROL_LABELS[invited_user.member_rol] ?? invited_user.member_rol}</strong>.
                        </p>

                        <div className="invite-actions">
                            <button
                                type="button"
                                className="invite-submit"
                                onClick={onClose}
                                autoFocus
                            >
                                Listo
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <h2 className="invite-title" id="invite-title">
                            Invitar a un usuario
                        </h2>

                        {workspaces.length === 0 ? (
                            <>
                                <p className="invite-text">
                                    Todavía no tenés ningún espacio de trabajo para invitar a alguien.
                                </p>

                                <div className="invite-actions">
                                    <button
                                        type="button"
                                        className="invite-cancel"
                                        onClick={onClose}
                                        autoFocus
                                    >
                                        Cerrar
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="invite-text">
                                    Elegí el espacio y escribí el email de un usuario registrado.
                                </p>

                                <form className="invite-form" onSubmit={handleSubmit}>

                                    <span className="invite-label">
                                        Espacio de trabajo
                                    </span>
                                    <div
                                        className="invite-workspace-list"
                                        role="radiogroup"
                                        aria-label="Espacio de trabajo"
                                    >
                                        {workspaces.map((workspace) => {
                                            const option_selected =
                                                String(workspace.workspace_id) === workspace_id

                                            return (
                                                <button
                                                    key={workspace.workspace_id}
                                                    type="button"
                                                    className={`invite-workspace-option${option_selected ? ' selected' : ''}`}
                                                    role="radio"
                                                    aria-checked={option_selected}
                                                    disabled={form_disabled}
                                                    onClick={() => selectWorkspace(workspace)}
                                                >
                                                    <img
                                                        className="invite-workspace-logo"
                                                        src={workspace.workspace_logo ?? workspace_logo}
                                                        alt=""
                                                    />
                                                    <span className="invite-workspace-name">
                                                        {workspace.workspace_nombre}
                                                    </span>
                                                </button>
                                            )
                                        })}
                                    </div>

                                    <label className="invite-label" htmlFor="invite-email">
                                        Email del usuario
                                    </label>
                                    <input
                                        id="invite-email"
                                        className="invite-input"
                                        type="email"
                                        placeholder="usuario@ejemplo.com"
                                        value={email}
                                        onChange={handleEmailChange}
                                        disabled={form_disabled}
                                        ref={email_input_ref}
                                    />
                                    {email_error && (
                                        <p className="invite-error">{email_error}</p>
                                    )}

                                    {/* Solo el owner del espacio elegido elige el rol del invitado */}
                                    {can_invite_admin && (
                                        <>
                                            <label className="invite-label" htmlFor="invite-rol">
                                                Rol del invitado
                                            </label>
                                            <select
                                                id="invite-rol"
                                                className="invite-select"
                                                value={invite_rol}
                                                onChange={(event) => setInviteRol(event.target.value)}
                                                disabled={form_disabled}
                                            >
                                                <option value="user">Usuario</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </>
                                    )}

                                    {invite_error && (
                                        <p className="invite-error">{invite_error}</p>
                                    )}

                                    <div className="invite-actions">
                                        <button
                                            type="button"
                                            className="invite-cancel"
                                            onClick={onClose}
                                            disabled={invite_loading}
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            className="invite-submit"
                                            disabled={form_disabled || !canSubmit()}
                                        >
                                            {invite_loading ? 'Enviando...' : 'Enviar invitación'}
                                        </button>
                                    </div>
                                </form>
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}

export default InviteUserModal
