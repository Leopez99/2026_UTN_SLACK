import { useEffect } from "react"
import useRequest from "./useRequest"
import { getAllWorkspaces, getWorkspaceMembers } from "../services/workspacesService.js"

/* 
Trae la lista de espacios de trabajo del usuario y, para cada uno,
la lista de miembros. El backend no incluye los miembros en el listado,
asi que se pide el detalle de miembros de cada workspace en paralelo.
*/
async function getAllWorkspacesWithMembers(){
    const response = await getAllWorkspaces()
    const workspaces = response.data.workspaces

    const workspaces_with_members = await Promise.all(
        workspaces.map(
            async (workspace) => {
                const members_response = await getWorkspaceMembers(workspace.workspace_id)
                return {
                    ...workspace,
                    members: members_response.data.members
                }
            }
        )
    )

    return {
        ...response,
        data: {
            workspaces: workspaces_with_members
        }
    }
}

function useWorkspaceList (){
    const { response, error, loading, sendRequest } = useRequest()

    useEffect(
        () => {
            sendRequest(
                () => getAllWorkspacesWithMembers()
            )
        },
        []
    )
    
    function reloadWorkspaces() {
        sendRequest(
            () => getAllWorkspacesWithMembers()
        )
    }


    return {
        workspaces_response: response,
        workspaces_error: error,
        workspaces_loading: loading,
        reloadWorkspaces
    }
}

export default useWorkspaceList
