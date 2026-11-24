import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { deleteWorkspace } from '../../services/workspacesService'
import { getInitials } from '../../utils/avatar.util'
import workspace_logo from '../../assets/Logos dislack/Logo dislack.png'
import arrow_icon from '../../assets/Arrow.png'
import './WorkspaceList.css'

/* Colores estilo Slack para los avatares de iniciales */
const AVATAR_COLORS = ['#e8912d', '#2bac76', '#36c5f0', '#e01e5a', '#611f69', '#0b4c8c']

const MAX_VISIBLE_MEMBERS = 4

/* Fila de un espacio de trabajo dentro de la tarjeta */
function WorkspaceRow({ workspace, onRequestDelete }) {
    const members = workspace.members ?? []
    const members_count = members.length

    /* Solo el owner puede eliminar el espacio de trabajo (lo valida el backend) */
    const is_owner = workspace.member_rol === 'owner'

    return (
        <div className="workspace-row">

            {/* Franja con el tacho: a la izquierda del enlace, se revela al hover (solo owner) */}
            {is_owner && (
                <div className="workspace-row-actions">
                    <button
                        type="button"
                        className="workspace-row-delete"
                        aria-label={`Eliminar ${workspace.workspace_nombre}`}
                        title="Eliminar espacio de trabajo"
                        onClick={() => onRequestDelete(workspace)}
                    >
                        <svg
                            viewBox="0 0 24 24"
                            width="20"
                            height="20"
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
                </div>
            )}

            <Link
                className="workspace-row-link"
                to={`/workspace/${workspace.workspace_id}`}
            >
                <img
                    className="workspace-row-logo"
                    src={workspace.workspace_logo ?? workspace_logo}
                    alt=""
                />

                <div className="workspace-row-body">
                    <h3 className="workspace-row-name">{workspace.workspace_nombre}</h3>

                    {workspace.workspace_descripcion && (
                        <p
                            className="workspace-row-description"
                            title={workspace.workspace_descripcion}
                        >
                            {workspace.workspace_descripcion}
                        </p>
                    )}

                    <div className="workspace-row-meta">
                        <div className="workspace-row-avatars">
                            {members.slice(0, MAX_VISIBLE_MEMBERS).map((member, index) => (
                                <span
                                    key={member.member_id}
                                    className="workspace-row-avatar"
                                    style={{ backgroundColor: AVATAR_COLORS[index % AVATAR_COLORS.length] }}
                                    title={member.usuario?.nombre}
                                >
                                    {getInitials(member.usuario?.nombre)}
                                </span>
                            ))}
                        </div>

                        <span className="workspace-row-count">
                            {members_count} {members_count === 1 ? 'miembro' : 'miembros'}
                        </span>
                    </div>
                </div>

                <img
                    className="workspace-row-arrow"
                    src={arrow_icon}
                    alt=""
                    aria-hidden="true"
                />
            </Link>

        </div>
    )
}

/*
Tarjeta con la lista de espacios de trabajo. Recibe los datos por props
(los trae el HomeScreen con useWorkspaceList) y maneja la eliminacion
(solo el owner) con su modal de confirmacion.
*/
export default function WorkspaceList({
    workspaces_response,
    workspaces_error,
    workspaces_loading,
    onReload,
    onCreateWorkspace
}) {

    /* Workspace pendiente de confirmar para eliminar */
    const [workspace_to_delete, setWorkspaceToDelete] = useState(null)
    const [delete_loading, setDeleteLoading] = useState(false)
    const [delete_error, setDeleteError] = useState(null)

    function requestDelete(workspace) {
        setDeleteError(null)
        setWorkspaceToDelete(workspace)
    }

    function cancelDelete() {
        if (delete_loading) {
            return
        }
        setWorkspaceToDelete(null)
        setDeleteError(null)
    }

    async function confirmDelete() {
        if (!workspace_to_delete || delete_loading) {
            return
        }

        setDeleteLoading(true)
        setDeleteError(null)

        try {
            await deleteWorkspace(workspace_to_delete.workspace_id)
            setWorkspaceToDelete(null)
            onReload()
        }
        catch (error) {
            setDeleteError(error.message)
        }
        finally {
            setDeleteLoading(false)
        }
    }

    /* Escape cierra el modal de confirmacion */
    useEffect(
        () => {
            if (!workspace_to_delete) {
                return
            }

            function handleDocumentKeyDown(event) {
                if (event.key === 'Escape' && !delete_loading) {
                    setWorkspaceToDelete(null)
                    setDeleteError(null)
                }
            }

            document.addEventListener('keydown', handleDocumentKeyDown)

            return () => document.removeEventListener('keydown', handleDocumentKeyDown)
        },
        [workspace_to_delete, delete_loading]
    )

    function renderContent() {
        if (workspaces_loading) {
            return <span className="workspace-card-state">Cargando...</span>
        }

        if (workspaces_error) {
            return <div className="workspace-card-state">
                <span className="error-text">Error: {workspaces_error}</span>
                <button className="workspace-card-retry" onClick={onReload}> Recargar </button>
            </div>
        }

        if (!workspaces_response) {
            return <div className="workspace-card-state">
                <span className="error-text">Error: Ocurrio un problema al obtener la lista de espacios de trabajo</span>
                <button className="workspace-card-retry" onClick={onReload}> Recargar </button>
            </div>
        }

        if (workspaces_response.data.workspaces.length === 0) {
            return <p className="workspace-card-state">Aún no creaste ningún espacio de trabajo</p>
        }

        return <div className="workspace-row-list">
            {workspaces_response.data.workspaces.map((workspace) => (
                <WorkspaceRow
                    key={workspace.workspace_id}
                    workspace={workspace}
                    onRequestDelete={requestDelete}
                />
            ))}
        </div>
    }

    return (
        <>
            <section className="workspace-card">

                <header className="workspace-card-tabs">
                    <span className="workspace-card-tab">Espacios de trabajo</span>
                </header>

                <div className="workspace-card-body">
                    <p className="workspace-card-eyebrow">Listos para iniciar</p>
                    {renderContent()}
                </div>

                <footer className="workspace-card-footer">
                    <button
                        type="button"
                        className="workspace-card-footer-link"
                        onClick={onCreateWorkspace}
                    >
                        Crear un nuevo espacio de trabajo
                    </button>

                    <p className="workspace-card-footer-help">
                        ¿No encuentras tu espacio de trabajo?{' '}
                        <Link
                            className="workspace-card-footer-link"
                            to="/login"
                        >
                            Prueba con otro correo electrónico
                        </Link>
                    </p>
                </footer>

            </section>

            {workspace_to_delete && (
                <div
                    className="workspace-confirm-backdrop"
                    onClick={cancelDelete}
                >
                    <div
                        className="workspace-confirm-card"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="workspace-confirm-title"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <h2 className="workspace-confirm-title" id="workspace-confirm-title">
                            Eliminar espacio de trabajo
                        </h2>

                        <p className="workspace-confirm-text">
                            ¿Seguro que querés eliminar <strong>{workspace_to_delete.workspace_nombre}</strong>?
                            {' '}También se borran todas las membresías asociadas. Esta acción no se puede deshacer.
                        </p>

                        {delete_error && !delete_loading && (
                            <p className="workspace-confirm-error">{delete_error}</p>
                        )}

                        <div className="workspace-confirm-actions">
                            <button
                                type="button"
                                className="workspace-confirm-cancel"
                                onClick={cancelDelete}
                                disabled={delete_loading}
                                autoFocus
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                className="workspace-confirm-delete"
                                onClick={confirmDelete}
                                disabled={delete_loading}
                            >
                                {delete_loading ? 'Eliminando...' : 'Eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
