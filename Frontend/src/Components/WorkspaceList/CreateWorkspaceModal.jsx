import { useEffect, useRef, useState } from 'react'
import useForm from '../../hooks/useForm'
import useRequest from '../../hooks/useRequest'
import { createWorkspace } from '../../services/workspacesService'
import './CreateWorkspaceModal.css'

/*
Modal para crear un espacio de trabajo, con el mismo patron que InviteUserModal:

- Nombre (obligatorio) y descripcion (opcional)
- El usuario que lo crea queda automaticamente como miembro 'owner' (lo hace el backend)
- Muestra el exito dentro del propio modal y avisa al padre con onCreated
  para que recargue la lista de espacios de trabajo
*/
function CreateWorkspaceModal({ onClose, onCreated }) {

    const initial_state = { name: '', description: '' }
    const { formState, handleChangeInput } = useForm(initial_state)
    const { loading, response, error, sendRequest } = useRequest()

    const [validation_error, setValidationError] = useState(null)

    const backdrop_ref = useRef(null)
    const name_input_ref = useRef(null)

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
       recargue la lista de espacios de trabajo (queda visible detras del modal) */
    useEffect(
        () => {
            if (response) {
                onCreated?.()
            }
        },
        [response, onCreated]
    )

    //Limpiamos el error de validacion cuando el usuario vuelve a escribir
    function handleFieldChange(event) {
        if (validation_error) {
            setValidationError(null)
        }
        handleChangeInput(event)
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
            () => createWorkspace(formState.name.trim(), formState.description.trim())
        )
    }

    const form_error = validation_error || error
    const workspace_created = response?.data?.workspace_created

    return (
        <div
            className="create-workspace-backdrop"
            ref={backdrop_ref}
            onClick={closeOnBackdropClick}
        >
            <div
                className={
                    workspace_created
                        ? 'create-workspace-card create-workspace-card-success'
                        : 'create-workspace-card'
                }
                role="dialog"
                aria-modal="true"
                aria-labelledby="create-workspace-title"
            >
                {workspace_created ? (
                    <>
                        <span className="create-workspace-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <path d="m7.5 12.2 3 3 6-6.2" />
                            </svg>
                        </span>

                        <h2 className="create-workspace-title" id="create-workspace-title">
                            Espacio de trabajo creado
                        </h2>

                        <p className="create-workspace-text">
                            <strong>{workspace_created.nombre}</strong> ya está listo y quedaste como owner.
                        </p>

                        <div className="create-workspace-actions">
                            <button
                                type="button"
                                className="create-workspace-submit"
                                onClick={onClose}
                                autoFocus
                            >
                                Listo
                            </button>
                        </div>
                    </>
                ) : (
                    <>
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
                    </>
                )}
            </div>
        </div>
    )
}

export default CreateWorkspaceModal
