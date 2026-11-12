import WorkspaceList from '../../Components/WorkspaceList/WorkspaceList'
import './HomeScreen.css'

function HomeScreeen() {

  return (
    <div className="home-screen">

      <header className="home-topbar">
        <div className="home-brand">
          <span className="home-brand-mark">S</span>
          <span className="home-brand-name">Slack</span>
        </div>
      </header>

      <main className="home-content">

        <div className="home-hero">
          <h1 className="home-title">Tus espacios de trabajo</h1>
          <p className="home-subtitle">
            Elegí un espacio para empezar a conversar con tu equipo.
          </p>
        </div>

        <WorkspaceList />

      </main>
    </div>
  )
}

export default HomeScreeen
