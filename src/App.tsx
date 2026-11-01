import React from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  NavLink,
  Link,
  useLocation,
} from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth.tsx'
import { Landing } from './pages/Landing.tsx'
import { Login } from './pages/Login.tsx'
import { Onboarding } from './pages/Onboarding.tsx'
import { Today } from './pages/Today.tsx'
import { SetPlayer } from './pages/SetPlayer.tsx'
import { Daily } from './pages/Daily.tsx'
import { Progress } from './pages/Progress.tsx'
import { Playbook } from './pages/Playbook.tsx'
import { Leaderboard } from './pages/Leaderboard.tsx'
import { Profile } from './pages/Profile.tsx'
import { Settings } from './pages/Settings.tsx'
import { Admin } from './pages/Admin.tsx'
import { Terms } from './pages/Terms.tsx'
import { Privacy } from './pages/Privacy.tsx'
import { Legal } from './pages/Legal.tsx'
import { Icon } from './components/Icon.tsx'
import { SoundToggle } from './components/SoundToggle.tsx'

function TopBar() {
  const { session, profile, signOut } = useAuth()
  const location = useLocation()

  // During onboarding, simplify top bar to avoid navigation interruptions
  const isOnboarding = location.pathname === '/onboarding'

  return (
    <header className="top-bar">
      <div className="top-bar-left">
        <Link
          to={session && profile ? '/today' : '/'}
          className="logo-text"
          aria-label="Eleanor Home"
        >
          <span className="brand-mark"><Icon name="compass" size={28} /></span>
          <span>Eleanor<span className="brand-descriptor">THE THINKING GYM</span></span>
        </Link>

        {session && profile && !isOnboarding && (
          <nav aria-label="Main Navigation">
            <ul className="nav-links">
              <li>
                <NavLink
                  to="/today"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  <Icon name="compass" size={17} /> Today
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/daily"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  <Icon name="calendar" size={17} /> Daily
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/progress"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  <Icon name="chart" size={17} /> Progress
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/leaderboard"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  <Icon name="trophy" size={17} /> Leaderboard
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/settings"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  <Icon name="settings" size={17} /> Settings
                </NavLink>
              </li>
              {session.user.app_metadata.role === 'admin' && <li>
                <NavLink to="/admin" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  <Icon name="shield" size={17} /> Admin
                </NavLink>
              </li>}
            </ul>
          </nav>
        )}
      </div>

      <div className="top-bar-right">
        <SoundToggle />
        {session ? (
          <div className="account-actions">
            {profile && (
              <>
                <Link
                  to={`/u/${profile.handle}`}
                  className="profile-link"
                >
                  @{profile.handle}
                </Link>
              </>
            )}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={signOut}
              aria-label="Sign out"
              data-testid="sign-out-btn"
            >
              <Icon name="logout" size={17} /><span className="desktop-label">Sign out</span>
            </button>
          </div>
        ) : (
          <Link to="/login" className="btn btn-primary btn-sm">
            Sign in <Icon name="arrow" size={16} />
          </Link>
        )}
      </div>
    </header>
  )
}

function RouteGuard({ children }: { children: React.ReactNode }) {
  const { session, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '50vh',
        }}
        role="status"
        aria-live="polite"
      >
        <span style={{ color: 'var(--text-muted)' }}>Loading Eleanor...</span>
      </div>
    )
  }

  const path = location.pathname

  const isPublicRoute =
    path === '/' ||
    path === '/terms' ||
    path === '/privacy' ||
    path === '/legal' ||
    path.startsWith('/u/') ||
    path.startsWith('/leaderboard')

  // 1. No session -> redirect to /login for protected routes
  if (!session) {
    if (path === '/login' || isPublicRoute) {
      return <>{children}</>
    }
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  // 2. Session with NO profile -> redirect to /onboarding
  if (!profile) {
    if (path === '/onboarding' || isPublicRoute) {
      return <>{children}</>
    }
    return <Navigate to="/onboarding" replace />
  }

  // 3. Session with profile -> redirect away from /login and /onboarding to /today
  if (path === '/login' || path === '/onboarding') {
    return <Navigate to="/today" replace />
  }

  return <>{children}</>
}

export function AppContent() {
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <TopBar />
      <main id="main-content" className="main-content" tabIndex={-1}>
        <RouteGuard>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/today" element={<Today />} />
            <Route path="/train/:setId" element={<SetPlayer />} />
            <Route path="/daily" element={<Daily />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/playbook" element={<Playbook />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/leaderboard/:track" element={<Leaderboard />} />
            <Route path="/u/:handle" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/legal" element={<Legal />} />
            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </RouteGuard>
      </main>
    </div>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
