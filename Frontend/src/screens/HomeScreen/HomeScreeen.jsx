import React, { useEffect, useState } from 'react'
import useRequest from '../../hooks/useRequest'
import { getAllWorkspaces } from '../../services/workspacesService'

function HomeScreeen() {

  const { response, error, loading, sendRequest } = useRequest()

  useEffect(
    () => {
      sendRequest(() => getAllWorkspaces())
    },
    []
  )

  function obtenerWorkspaces() {
    if (response && response.data && response.data.workspaces) {
      return response.data.workspaces
    }
    return []
  }

    const workspaces = obtenerWorkspaces()

  return (
    <div>
      <h1>Bienvenido a slack!</h1>

      {loading && <p>Cargando...</p>}

      {!loading && error && <p>Error: {error}</p>}

      {!loading && !error && workspaces.length === 0 && (
        <p>Aun no creaste ningun espacio de trabajo</p>
      )}

      <ul>
        {workspaces.map(workspace => (
          <li key={workspace.member_id}>
            <strong>{workspace.workspace_nombre}</strong> — {workspace.member_rol}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default HomeScreeen