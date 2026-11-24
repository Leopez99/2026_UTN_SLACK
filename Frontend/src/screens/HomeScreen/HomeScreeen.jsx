import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import WorkspaceList from '../../Components/WorkspaceList/WorkspaceList'
import InviteUserModal from '../../Components/WorkspaceList/InviteUserModal'
import useWorkspaceList from '../../hooks/useWorkspaceList'
import logo_mark from '../../assets/Logos dislack/Logo dislack.png'
import logo_wordmark from '../../assets/Logos dislack/Titulo dislack.png'
import './HomeScreen.css'

function HomeScreeen() {

  const {
    workspaces_error,
    workspaces_loading,
    workspaces_response,
    reloadWorkspaces
  } = useWorkspaceList()

  const navigate = useNavigate()

  const workspaces = workspaces_response?.data?.workspaces ?? []

  /* Modal de invitacion abierto (lo dispara la tarjeta "Invita companeros de equipo") */
  const [invite_open, setInviteOpen] = useState(false)

  function requestInvite() {
    setInviteOpen(true)
  }

  function cancelInvite() {
    setInviteOpen(false)
  }

  return (
    <div className="home-screen">

      <header className="home-topbar">
        <div className="home-brand">
          <img
            className="home-brand-mark"
            src={logo_mark}
            alt="Ícono de Dislack"
          />
          <img
            className="home-brand-wordmark"
            src={logo_wordmark}
            alt="Dislack"
          />
        </div>

        <div className="home-topbar-actions">
          <button
            type="button"
            className="home-topbar-button home-topbar-button-outline"
            onClick={() => navigate('/login')}
          >
            Logearse con otro usuario
          </button>

          <Link
            className="home-topbar-button home-topbar-button-create"
            to="/create-workspace"
          >
            Crear un nuevo espacio de trabajo
          </Link>
        </div>
      </header>

      <section className="home-hero">
        <div className="home-hero-inner">
          <h1 className="home-title">
            ¡Hola de nuevo! <span role="img" aria-label="saludo">👋</span>
          </h1>
          <p className="home-subtitle">Elige un espacio de trabajo para comenzar.</p>
        </div>
      </section>

      <main className="home-content">
        <div className="home-columns">

          <section className="home-column">
            <div className="home-section-label">
              <svg
                className="home-section-icon"
                viewBox="0 0 16 16"
                width="15"
                height="15"
                aria-hidden="true"
              >
                <path
                  fill="currentColor"
                  d="M1 1h4.5v4.5H1zM10.5 1H15v4.5h-4.5zM1 10.5h4.5V15H1zM10.5 10.5H15V15h-4.5z"
                />
              </svg>
              Mis espacios de trabajo
            </div>

            <WorkspaceList
              workspaces_response={workspaces_response}
              workspaces_error={workspaces_error}
              workspaces_loading={workspaces_loading}
              onReload={reloadWorkspaces}
            />
          </section>

          <aside className="home-column">
            <div className="home-invite-card">
              <div className="home-invite-body">
                <h3 className="home-invite-title">¿Quieres invitar a otras personas?</h3>
                <p className="home-invite-text">Dislack es mejor en equipo.</p>
                <button
                  type="button"
                  className="home-invite-btn"
                  onClick={requestInvite}
                  disabled={workspaces_loading || !workspaces_response}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="17"
                    height="17"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <circle cx="9.5" cy="8" r="3.5" />
                    <path d="M3 20c0-3.6 2.9-6.5 6.5-6.5S16 16.4 16 20" />
                    <path d="M18.5 7.5v6M15.5 10.5h6" />
                  </svg>
                  Invita compañeros de equipo
                </button>
              </div>

              <div className="home-invite-art" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="42" height="42">
                  <path
                    fill="currentColor"
                    d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"
                  />
                </svg>
              </div>
            </div>
          </aside>

        </div>
      </main>

      {invite_open && (
        <InviteUserModal
          workspaces={workspaces}
          onClose={cancelInvite}
          onInvited={reloadWorkspaces}
        />
      )}

    </div>
  )
}

export default HomeScreeen
