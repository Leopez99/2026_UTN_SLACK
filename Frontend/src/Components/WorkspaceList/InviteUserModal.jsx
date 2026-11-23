import { useEffect, useRef, useState } from 'react'
import { getWorkspaceChannels } from '../../services/channelsService'
import { createInvitation } from '../../services/workspacesService'
import './InviteUserModal.css'

/* Simple validacion de formato (la validez de que sea un usuario registrado la valida el backend) */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/*
Modal para invitar a un usuario a un espacio de trabajo desde el HomeScreen:
- Select del espacio de trabajo al que invitar
- Input de email (tiene que ser de un usuario registrado)
- Select del canal al que se invita (los canales cargan al elegir el espacio)
Cualquier miembro puede invitar, sin importar su rol.
*/
function InviteUserModal({ workspaces, onClose, onInvited }) {

    const [workspace_id, setWorkspaceId] = useState('')

    const [email, setEmail] = useState('')
    const [email_error, setEmailError] = useState(null)

    const [channels, setChannels] = useState([])
    const [channels_loading, setChannelsLoading] = useState(false)
    const [channels_error, setChannelsError] = useState(null)
    const [channel_id, setChannelId] = useState('')

    const [invite_loading, setInviteLoading] = useState(false)
    const [invite_error, setInviteError] = useState(null)
    const [invited_user, setInvitedUser] = useState(null)

    const backdrop_ref = useRef(null)
    const email_input_ref = useRef(null)

    const workspace_selected = workspaces.find(
        (workspace) => String(workspace.workspace_id) === workspace_id
    )

    /* Al elegir un espacio de trabajo cargamos sus canales */
    useEffect(
        () => {
            setChannelId('')
            setChannels([])
            setChannelsError(null)

            if (!workspace_id) {
                return
            }

            let cancelled = false

            async function loadChannels() {
                setChannelsLoading(true)
                setChannelsError(null)

                try {
                    const response = await getWorkspaceChannels(workspace_id)
                    if (cancelled) {
                        return
                    }
                    setChannels(response.data.channels)
                    setChannelsLoading(false)
                }
                catch (error) {
                    if (cancelled) {
                        return
                    }
                    setChannelsError(error.message)
                    setChannelsLoading(false)
                }
            }

            loadChannels()

            return () => {
                cancelled = true
            }
        },
        [workspace_id]
    )

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
        return Boolean(workspace_id && email.trim() && !channels_loading)
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
                channel_id
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
                            es miembro de <strong>{workspace_selected?.workspace_nombre ?? 'el espacio de trabajo'}</strong>
                            {invited_user.canal ? (
                                <> y fue invitado al canal <strong>#{invited_user.canal.canal_nombre}</strong></>
                            ) : (
                                ' sin canal de referencia'
                            )}.
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
                                    Elegí el espacio, escribí el email de un usuario registrado y el canal al que invitarlo.
                                </p>

                                <form className="invite-form" onSubmit={handleSubmit}>

                                    <label className="invite-label" htmlFor="invite-workspace">
                                        Espacio de trabajo
                                    </label>
                                    <select
                                        id="invite-workspace"
                                        className="invite-select"
                                        value={workspace_id}
                                        onChange={(event) => setWorkspaceId(event.target.value)}
                                        disabled={form_disabled}
                                    >
                                        <option value="">Seleccionar espacio de trabajo</option>
                                        {workspaces.map((workspace) => (
                                            <option
                                                key={workspace.workspace_id}
                                                value={workspace.workspace_id}
                                            >
                                                {workspace.workspace_nombre} ({workspace.member_rol})
                                            </option>
                                        ))}
                                    </select>

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

                                    <label className="invite-label" htmlFor="invite-channel">
                                        Canal al que invitar
                                    </label>
                                    <select
                                        id="invite-channel"
                                        className="invite-select"
                                        value={channel_id}
                                        onChange={(event) => setChannelId(event.target.value)}
                                        disabled={form_disabled || !workspace_id || Boolean(channels_error)}
                                    >
                                        <option value="">
                                            {!workspace_id
                                                ? 'Primero elegí un espacio de trabajo'
                                                : channels_loading
                                                    ? 'Cargando canales...'
                                                    : 'Seleccionar canal (opcional)'}
                                        </option>
                                        {channels.map((channel) => (
                                            <option
                                                key={channel.canal_id}
                                                value={channel.canal_id}
                                            >
                                                #{channel.canal_nombre}
                                            </option>
                                        ))}
                                    </select>
                                    {channels_error && (
                                        <p className="invite-error">
                                            No se pudieron cargar los canales: {channels_error}
                                        </p>
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
