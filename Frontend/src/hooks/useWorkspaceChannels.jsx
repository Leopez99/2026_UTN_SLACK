import { useEffect } from 'react'
import useRequest from './useRequest'
import { getWorkspaceChannels } from '../services/channelsService'

/*
Canales de un espacio de trabajo.
Se cargan aparte de useWorkspaceScreen para poder recargarlos (al crear o
borrar un canal) sin volver a mostrar la pantalla de carga completa.
*/

function useWorkspaceChannels(workspace_id) {
  const { loading, response, error, sendRequest } = useRequest()

  useEffect(
    () => {
      sendRequest(
        () => getWorkspaceChannels(workspace_id)
      )
    },
    [workspace_id]
  )

  function reloadChannels() {
    return sendRequest(
      () => getWorkspaceChannels(workspace_id)
    )
  }

  return {
    channels: response?.data?.channels ?? [],
    channels_loading: loading,
    channels_error: error,
    reloadChannels
  }
}

export default useWorkspaceChannels
