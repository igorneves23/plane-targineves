import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, LogOut, Moon, Sun, Users, ChevronRight } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useBoardStore } from '../../store/boardStore'
import { useTheme } from '../../context/ThemeContext'
import { Avatar } from '../ui/Avatar'
import clsx from 'clsx'

export function Sidebar() {
  const { user, logout } = useAuthStore()
  const { boards } = useBoardStore()
  const { theme, toggle } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <aside className="w-64 shrink-0 h-screen flex flex-col bg-gray-950 border-r border-white/5">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">P</span>
          </div>
          <span className="font-semibold text-white text-lg">Plane</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <Link
          to="/dashboard"
          className={clsx(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
            location.pathname === '/dashboard'
              ? 'bg-brand-500/20 text-brand-400'
              : 'text-gray-400 hover:bg-white/5 hover:text-white'
          )}
        >
          <LayoutDashboard className="w-4 h-4" />
          Dashboard
        </Link>

        {user?.role === 'ADMIN' && (
          <Link
            to="/users"
            className={clsx(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              location.pathname === '/users'
                ? 'bg-brand-500/20 text-brand-400'
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
            )}
          >
            <Users className="w-4 h-4" />
            Usuários
          </Link>
        )}

        {boards.length > 0 && (
          <div className="mt-4">
            <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Quadros</p>
            {boards.map((board) => (
              <Link
                key={board.id}
                to={`/board/${board.id}`}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                  location.pathname === `/board/${board.id}`
                    ? 'bg-white/10 text-white'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                )}
              >
                <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: board.color }} />
                <span className="truncate">{board.title}</span>
                <ChevronRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100" />
              </Link>
            ))}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-white/5 space-y-1">
        <button
          onClick={toggle}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
        {user && (
          <div className="flex items-center gap-3 px-3 py-2 mt-2">
            <Avatar name={user.name} src={user.avatar} size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.role}</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
