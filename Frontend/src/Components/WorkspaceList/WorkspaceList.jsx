import { Link, useNavigate } from 'react-router'
import useWorkspaceList from '../../hooks/useWorkspaceList'
import workspace_logo from '../../assets/ava_0018-88.png'
import './WorkspaceList.css'

/* Colores estilo Slack para los avatares de iniciales */
const AVATAR_COLORS = ['#e8912d', '#2bac76', '#36c5f0', '#e01e5a', '#611f69', '#0b4c8c']

const MAX_VISIBLE_MEMBERS = 4

function getInitials(name = '') {
    const words = name.trim().split(/\s+/)
    if (words.length === 0) return ''
    if (words.length === 1) return words[0].charAt(0).toUpperCase()
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase()
}

function WorkspaceRow({ workspace }) {
    const members = workspace.members ?? []
    const members_count = members.length

    return (
        <Link
            className="workspace-row"
            to={`/workspace/${workspace.workspace_id}`}
        >
            <img
                className="workspace-row-logo"
                src={workspace_logo}
                alt=""
            />

            <div className="workspace-row-body">
                <h3 className="workspace-row-name">{workspace.workspace_nombre}</h3>

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
                        {members_count > 0 && (
                            <span className="workspace-row-active"> • Más activos</span>
                        )}
                    </span>
                </div>
            </div>

            <span className="workspace-row-arrow" aria-hidden="true">→</span>
        </Link>
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
                />
            ))}
        </div>
    }

    return (
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
    )
}
