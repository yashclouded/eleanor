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
import { TitleBadge } from './components/TitleBadge.tsx'
import { Landing } from './pages/Landing.tsx'
import { Login } from './pages/Login.tsx'
import { Onboarding } from './pages/Onboarding.tsx'
import { Today } from './pages/Today.tsx'
import { SetPlayer } from './pages/SetPlayer.tsx'
import { Daily } from './pages/Daily.tsx'
import { Progress } from './pages/Progress.tsx'
import { Playbook } from './pages/Playbook.tsx'
import { Leaderboard } from './pages/Leaderboard.tsx'
import { PublicProfile } from './pages/PublicProfile.tsx'
import { Settings } from './pages/Settings.tsx'
import { Admin } from './pages/Admin.tsx'
import { Terms } from './pages/Terms.tsx'
import { Privacy } from './pages/Privacy.tsx'

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
          Eleanor
        </Link>

        {session && profile && !isOnboarding && (
          <nav aria-label="Main Navigation">
            <ul className="nav-links">
              <li>
                <NavLink
                  to="/today"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  Today
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/daily"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  Daily
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/progress"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  Progress
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/leaderboard"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  Leaderboard
                </NavLink>
              </li>
            </ul>
          </nav>
        )}
      </div>

      <div className="top-bar-right">
        {session ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            {profile && (
              <>
                <Link
                  to={`/u/${profile.handle}`}
                  style={{ textDecoration: 'none', color: 'var(--text)', fontWeight: 600, fontSize: '0.875rem' }}
                >
                  @{profile.handle}
                </Link>
                <TitleBadge title="Novice" />
              </>
            )}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={signOut}
              data-testid="sign-out-btn"
            >
              Sign out
            </button>
          </div>
        ) : (
          <Link to="/login" className="btn btn-primary btn-sm">
            Sign in
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
            <Route path="/u/:handle" element={<PublicProfile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
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
