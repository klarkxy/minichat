import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { Settings, Users, MessageCircle } from 'lucide-react'
import SettingsDrawer from './SettingsDrawer'
import s from './Layout.module.css'

export default function Layout() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const nav = useNavigate()

  return (
    <div className={s.shell}>
      <header className={s.header}>
        <button className={s.brand} onClick={() => nav('/')} aria-label="minichat">
          <span className={s.logo}>💬</span>
          <span className={s.brandText}>minichat</span>
        </button>

        <nav className={s.nav}>
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              [s.navLink, isActive ? s.navActive : ''].join(' ')
            }
          >
            <Users size={16} />
            <span>人物</span>
          </NavLink>
          <NavLink
            to="/chat"
            className={({ isActive }) =>
              [s.navLink, isActive ? s.navActive : ''].join(' ')
            }
          >
            <MessageCircle size={16} />
            <span>对话</span>
          </NavLink>
        </nav>

        <button
          className={s.iconBtn}
          onClick={() => setSettingsOpen(true)}
          aria-label="设置"
          title="设置"
        >
          <Settings size={18} />
        </button>
      </header>

      <main className={s.main}>
        <Outlet />
      </main>

      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
