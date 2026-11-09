import { useEffect } from "react"
import useRequest from "./useRequest"
import { getAllWorkspaces } from "../services/workspacesService.js"

function useWorkspaceList (){
    const { response, error, loading, sendRequest } = useRequest()

    useEffect(
        () => {
            sendRequest(
                () => getAllWorkspaces()
            )
        },
        []
    )
    
    function reloadWorkspaces() {
        sendRequest(
            () => getAllWorkspaces()
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