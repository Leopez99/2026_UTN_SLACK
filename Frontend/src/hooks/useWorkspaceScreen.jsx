import { useEffect } from 'react'
import useRequest from './useRequest'
import { getAllWorkspaces, getWorkspaceById } from '../services/workspacesService'

/*
Datos de la pantalla de un espacio de trabajo:
- El espacio seleccionado con sus miembros reales
- La lista de espacios del usuario para el rail izquierdo
Ambas solicitudes se hacen en paralelo con un solo estado de carga/error.
*/

async function getScreenData(workspace_id) {
  const [workspace_response, workspaces_response] = await Promise.all([
    getWorkspaceById(workspace_id),
    getAllWorkspaces()
  ])

  return {
    workspace_response,
    workspaces_response
  }
}

function useWorkspaceScreen(workspace_id) {
  const { loading, response, error, sendRequest } = useRequest()

  useEffect(
    () => {
      sendRequest(
        () => getScreenData(workspace_id)
      )
    },
    [workspace_id]
  )

  function reloadScreen() {
    sendRequest(
      () => getScreenData(workspace_id)
    )
  }

  return {
    workspace_response: response?.workspace_response ?? null,
    workspaces_response: response?.workspaces_response ?? null,
    screen_loading: loading,
    screen_error: error,
    reloadScreen
  }
}

export default useWorkspaceScreen
