import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import useWorkspaceList from '../../hooks/useWorkspaceList'
import { deleteWorkspace } from '../../services/workspacesService'
import { getInitials } from '../../utils/avatar.util'
import workspace_logo from '../../assets/ava_0018-88.png'
import './WorkspaceList.css'

/* Colores estilo Slack para los avatares de iniciales */
const AVATAR_COLORS = ['#e8912d', '#2bac76', '#36c5f0', '#e01e5a', '#611f69', '#0b4c8c']

const MAX_VISIBLE_MEMBERS = 4

function WorkspaceRow({ workspace, onRequestDelete }) {
    const members = workspace.members ?? []
    const members_count = members.length

    /* Solo el owner puede eliminar el espacio de trabajo (lo valida el backend) */
    const is_owner = workspace.member_rol === 'owner'

    const [menu_open, setMenuOpen] = useState(false)
    const menu_container_ref = useRef(null)

    /* Cerramos el menu al hacer clic afuera o al presionar Escape */
    useEffect(
        () => {
            if (!menu_open) {
                return
            }

            function handleDocumentClick(event) {
                if (menu_container_ref.current && !menu_container_ref.current.contains(event.target)) {
                    setMenuOpen(false)
                }
            }

            function handleDocumentKeyDown(event) {
                if (event.key === 'Escape') {
                    setMenuOpen(false)
                }
            }

            document.addEventListener('mousedown', handleDocumentClick)
            document.addEventListener('keydown', handleDocumentKeyDown)

            return () => {
                document.removeEventListener('mousedown', handleDocumentClick)
                document.removeEventListener('keydown', handleDocumentKeyDown)
            }
        },
        [menu_open]
    )

    return (
        <div className="workspace-row">

            <Link
                className="workspace-row-link"
                to={`/workspace/${workspace.workspace_id}`}
            >
                <img
                    className="workspace-row-logo"
                    src={workspace_logo}
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

                <span className="workspace-row-arrow" aria-hidden="true">→</span>
            </Link>

            {is_owner && (
                <div className="workspace-row-menu" ref={menu_container_ref}>
                    <button
                        type="button"
                        className={
                            menu_open
                                ? 'workspace-row-menu-trigger workspace-row-menu-trigger-open'
                                : 'workspace-row-menu-trigger'
                        }
                        aria-haspopup="menu"
                        aria-expanded={menu_open}
                        aria-label={`Acciones de ${workspace.workspace_nombre}`}
                        onClick={() => setMenuOpen((open) => !open)}
                    >
                        ⋯
                    </button>

                    {menu_open && (
                        <div className="workspace-row-dropdown" role="menu">
                            <button
                                type="button"
                                className="workspace-row-dropdown-item workspace-row-dropdown-item-danger"
                                role="menuitem"
                                onClick={() => {
                                    setMenuOpen(false)
                                    onRequestDelete(workspace)
                                }}
                            >
                                Eliminar
                            </button>
                        </div>
                    )}
                </div>
            )}

        </div>
    )
}

export default function WorkspaceList() {

    const {
        workspaces_error, 
        workspaces_loading, 
        workspaces_response, 
        reloadWorkspaces
    } = useWorkspaceList()

    const navigate = useNavigate()

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
            reloadWorkspaces()
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
                <button className="workspace-card-retry" onClick={reloadWorkspaces}> Recargar </button>
            </div>
        }

        if (!workspaces_response) {
            return <div className="workspace-card-state">
                <span className="error-text">Error: Ocurrio un problema al obtener la lista de espacios de trabajo</span>
                <button className="workspace-card-retry" onClick={reloadWorkspaces}> Recargar </button>
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
                    <Link className="workspace-card-create" to="/create-workspace">
                        Crear un nuevo espacio de trabajo
                    </Link>
                    <button
                        className="workspace-card-logout"
                        type='button'
                        onClick={() => navigate('/login')}
                    >
                        Logearse con otro usuario
                    </button>
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
