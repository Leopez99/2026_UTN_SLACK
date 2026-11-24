import { useEffect, useRef, useState } from 'react'
import useForm from '../../hooks/useForm'
import useRequest from '../../hooks/useRequest'
import { createWorkspace } from '../../services/workspacesService'
import { readImageAsLogoDataUrl } from '../../utils/logo.util'
import './CreateWorkspaceModal.css'

/*
Modal para crear un espacio de trabajo, con el mismo patron que InviteUserModal:

- Nombre (obligatorio) y descripcion (opcional)
- Logo (opcional): imagen PNG/JPG/WebP que se recorta a 256x256 y viaja
  como data URL base64 en el body
- El usuario que lo crea queda automaticamente como miembro 'owner' (lo hace el backend)
- Cuando el backend confirma la creacion cierra el modal y avisa al padre con
  onCreated para que recargue la lista de espacios de trabajo
*/
function CreateWorkspaceModal({ onClose, onCreated }) {

    const initial_state = { name: '', description: '' }
    const { formState, handleChangeInput } = useForm(initial_state)
    const { loading, response, error, sendRequest } = useRequest()

    const [validation_error, setValidationError] = useState(null)
    const [logo_data_url, setLogoDataUrl] = useState(null)

    const backdrop_ref = useRef(null)
    const name_input_ref = useRef(null)
    const logo_input_ref = useRef(null)

    /* Ref al callback mas reciente, para no depender de su identidad en el efecto */
    const onCreatedRef = useRef(onCreated)
    const onCloseRef = useRef(onClose)

    useEffect(
        () => {
            onCreatedRef.current = onCreated
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

    /* Escape cierra el modal (salvo mientras se crea el espacio de trabajo) */
    useEffect(
        () => {
            function handleDocumentKeyDown(event) {
                if (event.key === 'Escape' && !loading) {
                    onClose()
                }
            }

            document.addEventListener('keydown', handleDocumentKeyDown)

            return () => {
                document.removeEventListener('keydown', handleDocumentKeyDown)
            }
        },
        [loading, onClose]
    )

    function closeOnBackdropClick(event) {
        if (event.target === backdrop_ref.current && !loading) {
            onClose()
        }
    }

    /* Cuando el backend confirma la creacion avisamos al padre para que
       recargue la lista de espacios de trabajo y cerramos el modal */
    useEffect(
        () => {
            if (response) {
                onCreatedRef.current?.()
                onCloseRef.current?.()
            }
        },
        [response]
    )

    //Limpiamos el error de validacion cuando el usuario vuelve a escribir
    function handleFieldChange(event) {
        if (validation_error) {
            setValidationError(null)
        }
        handleChangeInput(event)
    }

    /*
    Eleccion del logo: procesamos la imagen (tipo valido, recorte a 256x256,
    conversion a data URL base64) en el momento del cambio del input, para
    que el submit siga siendo sincronico.
    */
    async function handleLogoChange(event) {
        const file = event.target.files?.[0]

        /* Se resetea el input para poder reelegir el mismo archivo despues */
        event.target.value = ''

        if (!file || loading) {
            return
        }

        if (validation_error) {
            setValidationError(null)
        }

        try {
            const data_url = await readImageAsLogoDataUrl(file)
            setLogoDataUrl(data_url)
        }
        catch (error) {
            setValidationError(error.message)
        }
    }

    function openLogoPicker() {
        if (!loading) {
            logo_input_ref.current?.click()
        }
    }

    function removeLogo() {
        setLogoDataUrl(null)
        if (logo_input_ref.current) {
            logo_input_ref.current.value = ''
        }
    }

    function handleSubmit(event) {
        event.preventDefault()

        if (loading) {
            return
        }

        if (!formState.name.trim()) {
            setValidationError('El nombre del espacio de trabajo es obligatorio')
            return
        }

        setValidationError(null)
        sendRequest(
            () => createWorkspace(formState.name.trim(), formState.description.trim(), logo_data_url)
        )
    }

    const form_error = validation_error || error

    return (
        <div
            className="create-workspace-backdrop"
            ref={backdrop_ref}
            onClick={closeOnBackdropClick}
        >
            <div
                className="create-workspace-card"
                role="dialog"
                aria-modal="true"
                aria-labelledby="create-workspace-title"
            >
                <h2 className="create-workspace-title" id="create-workspace-title">
                    Crear un espacio de trabajo
                </h2>

                <p className="create-workspace-text">
                    Los espacios de trabajo son donde tu equipo se comunica.
                    Al crearlo vas a quedar como owner.
                </p>

                <form className="create-workspace-form" onSubmit={handleSubmit}>

                    <label className="create-workspace-label" htmlFor="create-workspace-name">
                        Nombre del espacio de trabajo
                    </label>
                    <input
                        className="create-workspace-input"
                        name='name'
                        id='create-workspace-name'
                        type='text'
                        placeholder='Ej: UTN Test Slack'
                        maxLength={30}
                        value={formState.name}
                        onChange={handleFieldChange}
                        disabled={loading}
                        autoComplete='off'
                        ref={name_input_ref}
                    />

                    <label className="create-workspace-label" htmlFor="create-workspace-logo-hidden">
                        Logo <span className="create-workspace-label-optional">(opcional)</span>
                    </label>
                    <div className="create-workspace-logo-row">
                        <input
                            name='logo'
                            id='create-workspace-logo-hidden'
                            type='file'
                            accept='image/png,image/jpeg,image/webp'
                            className="create-workspace-logo-input"
                            onChange={handleLogoChange}
                            disabled={loading}
                            ref={logo_input_ref}
                        />
                        <button
                            type="button"
                            className="create-workspace-logo-button"
                            onClick={openLogoPicker}
                            disabled={loading}
                            title={logo_data_url ? 'Cambiar logo' : 'Elegir un logo'}
                            aria-label={logo_data_url ? 'Cambiar el logo del espacio de trabajo' : 'Elegir un logo para el espacio de trabajo'}
                        >
                            {logo_data_url ? (
                                <img
                                    className="create-workspace-logo-preview"
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
                        <span className="create-workspace-logo-help">
                            {logo_data_url
                                ? 'Se recorta a un cuadrado de 256×256'
                                : 'Elegí una imagen (PNG, JPG o WebP)'}
                        </span>
                        {logo_data_url && (
                            <button
                                type="button"
                                className="create-workspace-logo-remove"
                                onClick={removeLogo}
                                disabled={loading}
                            >
                                Quitar
                            </button>
                        )}
                    </div>

                    <label className="create-workspace-label" htmlFor="create-workspace-description">
                        Descripción <span className="create-workspace-label-optional">(opcional)</span>
                    </label>
                    <textarea
                        className="create-workspace-textarea"
                        name='description'
                        id='create-workspace-description'
                        placeholder='De qué trata este espacio de trabajo'
                        maxLength={1000}
                        rows={3}
                        value={formState.description}
                        onChange={handleFieldChange}
                        disabled={loading}
                    />
                    <span className="create-workspace-counter">{formState.description.length}/1000</span>

                    {form_error && !loading && (
                        <p className="create-workspace-error">{form_error}</p>
                    )}

                    <div className="create-workspace-actions">
                        <button
                            type="button"
                            className="create-workspace-cancel"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="create-workspace-submit"
                            disabled={loading}
                        >
                            {loading ? 'Creando...' : 'Crear espacio de trabajo'}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    )
}

export default CreateWorkspaceModal
