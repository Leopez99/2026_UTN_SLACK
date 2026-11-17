import { useEffect } from 'react'
import { Link, useParams } from 'react-router'
import useRequest from '../../hooks/useRequest'
import { getWorkspaceById } from '../../services/workspacesService'

/*
Pantalla de un espacio de trabajo.
Se abre al presionar una fila del listado de espacios de trabajo (/workspace/:workspace_id).
*/

function WorkspaceScreen() {

    const { workspace_id } = useParams()

    const { loading, response, error, sendRequest } = useRequest()

    useEffect(
        () => {
            sendRequest(
                () => getWorkspaceById(workspace_id)
            )
        },
        [workspace_id]
    )

    function reloadWorkspace() {
        sendRequest(
            () => getWorkspaceById(workspace_id)
        )
    }

    if (loading || (!response && !error)) {
        return <p>Cargando espacio de trabajo...</p>
    }

    if (error) {
        return (
            <div>
                <p>Error: {error}</p>
                <button type='button' onClick={reloadWorkspace}>Recargar</button>
                <br />
                <Link to='/'>← Mis espacios</Link>
            </div>
        )
    }

    const workspace_selected = response.data.workspace_selected

    return (
        <div>
            <Link to='/'>← Mis espacios</Link>
            <h1>Hola {workspace_selected.nombre}</h1>
        </div>
    )
}

export default WorkspaceScreen
