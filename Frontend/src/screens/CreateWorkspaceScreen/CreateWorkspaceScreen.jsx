import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import useForm from '../../hooks/useForm'
import useRequest from '../../hooks/useRequest'
import { createWorkspace } from '../../services/workspacesService'
import './CreateWorkspaceScreen.css'

/*
Pantalla para crear un espacio de trabajo.
El usuario que lo crea queda automaticamente como miembro 'owner' (lo hace el backend).
*/

function CreateWorkspaceScreen() {

  const initial_state = { name: '', description: '' }
  const { formState, handleChangeInput } = useForm(initial_state)
  const { loading, response, error, sendRequest } = useRequest()

  const [validation_error, setValidationError] = useState(null)

  const navigate = useNavigate()

  //Cuando el backend confirma la creacion, volvemos a la lista de espacios de trabajo
  useEffect(
    () => {
      if (!response) {
        return
      }
      const timeout = setTimeout(
        () => navigate('/', { replace: true }),
        1500
      )
      return () => clearTimeout(timeout)
    },
    [response, navigate]
  )

  //Limpiamos el error de validacion cuando el usuario vuelve a escribir
  function handleFieldChange(event) {
    if (validation_error) {
      setValidationError(null)
    }
    handleChangeInput(event)
  }

  async function handleSubmit(event) {
    event.preventDefault()

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

  if (response) {
    return (
      <div className="create-workspace-screen">
        <main className="create-workspace-card create-workspace-card-status">
          <span className="create-workspace-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="m7.5 12.2 3 3 6-6.2" />
            </svg>
          </span>
          <h1 className="create-workspace-title">Espacio de trabajo creado</h1>
          <p className="create-workspace-subtitle">
            {response.data.workspace_created.nombre} ya está listo. Te estamos redirigiendo a tus espacios...
          </p>
          <Link className="create-workspace-button" to='/'>
            Ir a mis espacios
          </Link>
        </main>
      </div>
    )
  }

  return (
    <div className="create-workspace-screen">

      <main className="create-workspace-card">

        <header className="create-workspace-header">
          <Link className="create-workspace-back" to='/'>
            ← Volver
          </Link>
          <h1 className="create-workspace-title">Crear un espacio de trabajo</h1>
          <p className="create-workspace-subtitle">
            Los espacios de trabajo son donde tu equipo se comunica.
            Al crearlo vas a quedar como owner.
          </p>
        </header>

        <form className="create-workspace-form" onSubmit={handleSubmit}>

          <label className="create-workspace-label" htmlFor="name">
            Nombre del espacio de trabajo
          </label>
          <input
            className="create-workspace-input"
            name='name'
            id='name'
            type='text'
            placeholder='Ej: UTN Test Slack'
            maxLength={30}
            value={formState.name}
            onChange={handleFieldChange}
            disabled={loading}
            autoComplete='off'
          />

          <label className="create-workspace-label" htmlFor="description">
            Descripción <span className="create-workspace-label-optional">(opcional)</span>
          </label>
          <textarea
            className="create-workspace-textarea"
            name='description'
            id='description'
            placeholder='De qué trata este espacio de trabajo'
            maxLength={1000}
            rows={3}
            value={formState.description}
            onChange={handleFieldChange}
            disabled={loading}
          />
          <span className="create-workspace-counter">{formState.description.length}/1000</span>

          {form_error && !loading && (
            <p className="create-workspace-message create-workspace-message-error">{form_error}</p>
          )}

          <div className="create-workspace-actions">
            <Link className="create-workspace-cancel" to='/'>
              Cancelar
            </Link>
            {loading ? (
              <button className="create-workspace-button" type='submit' disabled={true}>
                Creando...
              </button>
            ) : (
              <button className="create-workspace-button" type='submit'>
                Crear espacio de trabajo
              </button>
            )}
          </div>

        </form>

      </main>

    </div>
  )
}

export default CreateWorkspaceScreen
