import { useEffect, useRef, useState } from 'react'
import useForm from '../../hooks/useForm'
import useRequest from '../../hooks/useRequest'
import { removeWorkspaceMember, updateWorkspace } from '../../services/workspacesService'
import { getColorForSeed, getInitials } from '../../utils/avatar.util'
import { getSessionUser } from '../../utils/session.util'
import { readImageAsLogoDataUrl } from '../../utils/logo.util'
import './EditWorkspaceModal.css'

/*
Modal para editar un espacio de trabajo desde el HomeScreen:

- Nombre (obligatorio) y descripcion (opcional, se guarda vacia si no se escribe)
- Logo opcional: se muestra el actual y solo se manda al backend si el usuario lo
  cambia (data URL base64 recortada a 256x256) o lo quita (null)
- Lista de miembros con la opcion de eliminar algunos, respetando las reglas del
  backend: el owner no se elimina, nadie se elimina a si mismo y un admin solo
  puede eliminar usuarios comunes
*/

const ROLE_LABELS = {
    owner: 'owner',
    admin: 'admin',
    user: 'miembro'
}

function EditWorkspaceModal({ workspace, onClose, onSaved }) {

    const initial_state = {
        name: workspace.workspace_nombre ?? '',
        description: workspace.workspace_descripcion ?? ''
    }

    const { formState, handleChangeInput } = useForm(initial_state)
    const { loading, response, error, sendRequest } = useRequest()

    const [validation_error, setValidationError] = useState(null)

    /*
    Logo: arranca con el actual. `logo_changed` distingue "no lo toco" (no se
    envia el campo) de "lo quite" (se envia null).
    */
    const [logo_data_url, setLogoDataUrl] = useState(workspace.workspace_logo ?? null)
    const [logo_changed, setLogoChanged] = useState(false)

    /* Miembros precargados por useWorkspaceList */
    const [members, setMembers] = useState(workspace.members ?? [])
    const [member_to_remove, setMemberToRemove] = useState(null)
    const [removing_member_id, setRemovingMemberId] = useState(null)
    const [members_error, setMembersError] = useState(null)

    const current_user = getSessionUser()

    const backdrop_ref = useRef(null)
    const name_input_ref = useRef(null)
    const logo_input_ref = useRef(null)

    /* Refs a los callbacks mas recientes, para no depender de su identidad en los efectos */
    const onSavedRef = useRef(onSaved)
    const onCloseRef = useRef(onClose)

    useEffect(
        () => {
            onSavedRef.current = onSaved
            onCloseRef.current = onClose
        }
    )

    /* Foco en el input de nombre al abrir */
    useEffect(
        () => {
            name_input_ref.current?.focus()
        },
        []
    )

    const busy = loading || Boolean(removing_member_id)

    /* Escape cierra el modal (salvo mientras se guarda o elimina un miembro) */
    useEffect(
        () => {
            function handleDocumentKeyDown(event) {
                if (event.key === 'Escape' && !busy) {
                    onCloseRef.current?.()
                }
            }

            document.addEventListener('keydown', handleDocumentKeyDown)

            return () => {
                document.removeEventListener('keydown', handleDocumentKeyDown)
            }
        },
        [busy]
    )

    function closeOnBackdropClick(event) {
        if (event.target === backdrop_ref.current && !busy) {
            onCloseRef.current?.()
        }
    }

    /* Cuando el backend confirma la actualizacion avisamos al padre y cerramos */
    useEffect(
        () => {
            if (response) {
                onSavedRef.current?.()
                onCloseRef.current?.()
            }
        },
        [response]
    )

    function handleFieldChange(event) {
        if (validation_error) {
            setValidationError(null)
        }
        handleChangeInput(event)
    }

    /* Eleccion del logo: tipo valido, recorte a 256x256 y conversion a data URL */
    async function handleLogoChange(event) {
        const file = event.target.files?.[0]

        /* Se resetea el input para poder reelegir el mismo archivo despues */
        event.target.value = ''

        if (!file || busy) {
            return
        }

        if (validation_error) {
            setValidationError(null)
        }

        try {
            const data_url = await readImageAsLogoDataUrl(file)
            setLogoDataUrl(data_url)
            setLogoChanged(true)
        }
        catch (error) {
            setValidationError(error.message)
        }
    }

    function openLogoPicker() {
        if (!busy) {
            logo_input_ref.current?.click()
        }
    }

    function removeLogo() {
        setLogoDataUrl(null)
        setLogoChanged(true)

        if (logo_input_ref.current) {
            logo_input_ref.current.value = ''
        }
    }

    /* Vuelve al logo original del workspace (o a "sin logo") */
    function restoreLogo() {
        setLogoDataUrl(workspace.workspace_logo ?? null)
        setLogoChanged(false)

        if (logo_input_ref.current) {
            logo_input_ref.current.value = ''
        }
    }

    /*
    Reglas de eliminacion de miembros, espejadas del backend:
    - No se puede eliminar al owner del workspace
    - No se puede eliminar la propia membresia
    - Un admin solo puede eliminar usuarios comunes (rol 'user')
    */
    function canRemoveMember(member) {
        if (!current_user?.id) {
            return false
        }

        if (String(member.usuario?.id) === String(current_user.id)) {
            return false
        }

        if (member.member_rol === 'owner') {
            return false
        }

        if (workspace.member_rol === 'admin' && member.member_rol === 'admin') {
            return false
        }

        return true
    }

    function requestRemoveMember(member) {
        setMembersError(null)
        setMemberToRemove(String(member.member_id))
    }

    function cancelRemoveMember() {
        if (removing_member_id) {
            return
        }
        setMemberToRemove(null)
    }

    async function confirmRemoveMember(member) {
        if (removing_member_id) {
            return
        }

        setRemovingMemberId(String(member.member_id))
        setMembersError(null)

        try {
            await removeWorkspaceMember(workspace.workspace_id, member.member_id)
            setMembers(
                (prev_members) => prev_members.filter(
                    (prev_member) => String(prev_member.member_id) !== String(member.member_id)
                )
            )
            setMemberToRemove(null)
            onSavedRef.current?.()
        }
        catch (error) {
            setMembersError(error.message)
        }
        finally {
            setRemovingMemberId(null)
        }
    }

    function handleSubmit(event) {
        event.preventDefault()

        if (busy) {
            return
        }

        const name = formState.name.trim()
        if (!name) {
            setValidationError('El nombre del espacio de trabajo es obligatorio')
            return
        }

        /* La descripcion es opcional: si queda vacia se guarda como cadena vacia */
        const description = formState.description.trim()

        setValidationError(null)
        sendRequest(
            () => updateWorkspace(
                workspace.workspace_id,
                name,
                description,
                logo_changed ? logo_data_url : undefined
            )
        )
    }

    const form_error = validation_error || error

    return (
        <div
            className="edit-workspace-backdrop"
            ref={backdrop_ref}
            onClick={closeOnBackdropClick}
        >
            <div
                className="edit-workspace-card"
                role="dialog"
                aria-modal="true"
                aria-labelledby="edit-workspace-title"
            >
                <h2 className="edit-workspace-title" id="edit-workspace-title">
                    Editar espacio de trabajo
                </h2>

                <p className="edit-workspace-text">
                    Cambiá los datos de <strong>{workspace.workspace_nombre}</strong> o administrá sus miembros.
                </p>

                <form className="edit-workspace-form" onSubmit={handleSubmit}>

                    <label className="edit-workspace-label" htmlFor="edit-workspace-name">
                        Nombre del espacio de trabajo
                    </label>
                    <input
                        className="edit-workspace-input"
                        name='name'
                        id='edit-workspace-name'
                        type='text'
                        placeholder='Ej: UTN Test Slack'
                        maxLength={30}
                        value={formState.name}
                        onChange={handleFieldChange}
                        disabled={busy}
                        autoComplete='off'
                        ref={name_input_ref}
                    />

                    <label className="edit-workspace-label" htmlFor="edit-workspace-logo-hidden">
                        Logo <span className="edit-workspace-label-optional">(opcional)</span>
                    </label>
                    <div className="edit-workspace-logo-row">
                        <input
                            name='logo'
                            id='edit-workspace-logo-hidden'
                            type='file'
                            accept='image/png,image/jpeg,image/webp'
                            className="edit-workspace-logo-input"
                            onChange={handleLogoChange}
                            disabled={busy}
                            ref={logo_input_ref}
                        />
                        <button
                            type="button"
                            className="edit-workspace-logo-button"
                            onClick={openLogoPicker}
                            disabled={busy}
                            title={logo_data_url ? 'Cambiar logo' : 'Elegir un logo'}
                            aria-label={logo_data_url ? 'Cambiar el logo del espacio de trabajo' : 'Elegir un logo para el espacio de trabajo'}
                        >
                            {logo_data_url ? (
                                <img
                                    className="edit-workspace-logo-preview"
                                    src={logo_data_url}
                                    alt=""
                                />
                            ) : (
                                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M21 15V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10" />
                                    <path d="M9 8a1.5 1.5 0 1 0 0-.01" />
                                    <path d="m21 16-4.5-4.5L6 21" />
                                </svg>
                            )}
                        </button>
                        <span className="edit-workspace-logo-help">
                            {logo_data_url
                                ? 'Se recorta a un cuadrado de 256×256'
                                : logo_changed
                                    ? 'El logo actual se va a quitar al guardar'
                                    : 'Elegí una imagen (PNG, JPG o WebP)'}
                        </span>
                        {logo_data_url && (
                            <button
                                type="button"
                                className="edit-workspace-logo-remove"
                                onClick={removeLogo}
                                disabled={busy}
                            >
                                Quitar
                            </button>
                        )}
                        {logo_changed && (
                            <button
                                type="button"
                                className="edit-workspace-logo-restore"
                                onClick={restoreLogo}
                                disabled={busy}
                            >
                                Deshacer
                            </button>
                        )}
                    </div>

                    <label className="edit-workspace-label" htmlFor="edit-workspace-description">
                        Descripción <span className="edit-workspace-label-optional">(opcional)</span>
                    </label>
                    <textarea
                        className="edit-workspace-textarea"
                        name='description'
                        id='edit-workspace-description'
                        placeholder='De qué trata este espacio de trabajo'
                        maxLength={1000}
                        rows={3}
                        value={formState.description}
                        onChange={handleFieldChange}
                        disabled={busy}
                    />
                    <span className="edit-workspace-counter">{formState.description.length}/1000</span>

                    <section className="edit-workspace-members-section">
                        <h3 className="edit-workspace-section-title">Miembros</h3>
                        <p className="edit-workspace-section-text">
                            Podés eliminar miembros del espacio. El owner no se puede eliminar, tampoco tu propia
                            membresía, y un admin no puede eliminar a otro admin.
                        </p>

                        {members.length === 0 ? (
                            <p className="edit-workspace-empty">
                                Este espacio de trabajo todavía no tiene miembros.
                            </p>
                        ) : (
                            <ul className="edit-workspace-member-list">
                                {members.map((member) => {
                                    const removable = canRemoveMember(member)
                                    const confirming = member_to_remove === String(member.member_id)
                                    const removing = removing_member_id === String(member.member_id)
                                    const member_name = member.usuario?.nombre ?? 'Usuario'

                                    return (
                                        <li className="edit-workspace-member" key={member.member_id}>
                                            <span
                                                className="edit-workspace-member-avatar"
                                                style={{ backgroundColor: getColorForSeed(member_name) }}
                                                aria-hidden="true"
                                            >
                                                {getInitials(member_name)}
                                            </span>

                                            <div className="edit-workspace-member-info">
                                                <span className="edit-workspace-member-name">{member_name}</span>
                                                <span className="edit-workspace-member-email">{member.usuario?.email}</span>
                                            </div>

                                            <span className={`edit-workspace-role edit-workspace-role-${member.member_rol}`}>
                                                {ROLE_LABELS[member.member_rol] ?? member.member_rol}
                                            </span>

                                            {removable && (
                                                confirming ? (
                                                    <div className="edit-workspace-member-confirm">
                                                        <span className="edit-workspace-member-confirm-text">
                                                            ¿Eliminar?
                                                        </span>
                                                        <button
                                                            type="button"
                                                            className="edit-workspace-member-cancel"
                                                            onClick={cancelRemoveMember}
                                                            disabled={removing}
                                                        >
                                                            Cancelar
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="edit-workspace-member-remove"
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
                                                        className="edit-workspace-member-delete"
                                                        title={`Eliminar a ${member_name}`}
                                                        aria-label={`Eliminar a ${member_name} del espacio de trabajo`}
                                                        onClick={() => requestRemoveMember(member)}
                                                        disabled={busy}
                                                    >
                                                        <svg
                                                            viewBox="0 0 24 24"
                                                            width="18"
                                                            height="18"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="1.8"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            aria-hidden="true"
                                                        >
                                                            <path d="M3 6h18" />
                                                            <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                                                            <path d="M10 11v6" />
                                                            <path d="M14 11v6" />
                                                        </svg>
                                                    </button>
                                                )
                                            )}
                                        </li>
                                    )
                                })}
                            </ul>
                        )}

                        {members_error && (
                            <p className="edit-workspace-error">{members_error}</p>
                        )}
                    </section>

                    {form_error && !loading && (
                        <p className="edit-workspace-error">{form_error}</p>
                    )}

                    <div className="edit-workspace-actions">
                        <button
                            type="button"
                            className="edit-workspace-cancel"
                            onClick={onClose}
                            disabled={busy}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="edit-workspace-submit"
                            disabled={busy}
                        >
                            {loading ? 'Guardando...' : 'Guardar cambios'}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    )
}

export default EditWorkspaceModal
