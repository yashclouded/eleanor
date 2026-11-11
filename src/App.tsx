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
import { BrandMark, Icon } from './components/Icon.tsx'
import { Avatar } from './components/Avatar.tsx'
import { ExperienceProvider } from './components/Experience.tsx'
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
import { Terms } from './pages/Terms.tsx'
import { Privacy } from './pages/Privacy.tsx'
import { Legal } from './pages/Legal.tsx'

const Admin = React.lazy(() => import('./pages/Admin.tsx').then((module) => ({ default: module.Admin })))

function TopBar() {
  const { session, profile, signOut } = useAuth()
  const location = useLocation()

  const isOnboarding = location.pathname === '/onboarding'

  return (
    <header className="top-bar">
      <div className="top-bar-left">
        <Link
          to={session && profile ? '/today' : '/'}
          className="logo-text"
          aria-label="Eleanor Home"
        >
          <BrandMark />
          <span>eleanor<span className="brand-period">.</span></span>
        </Link>

        {session && profile && !isOnboarding && (
          <nav aria-label="Main Navigation">
            <ul className="nav-links">
              <li>
                <NavLink
                  to="/today"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  <Icon name="today" /><span>Today</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/daily"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  <Icon name="daily" /><span>Daily</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/progress"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  <Icon name="progress" /><span>Progress</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/leaderboard"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  <Icon name="leaderboard" /><span>Leaderboard</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/settings"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  <Icon name="settings" /><span>Settings</span>
                </NavLink>
              </li>
            </ul>
          </nav>
        )}
      </div>

      <div className="top-bar-right">
        {session ? (
          <div className="profile-controls">
            {profile && (
              <>
                <Link
                  to={`/u/${profile.handle}`}
                  className="profile-link"
                  aria-label={`View @${profile.handle}'s profile`}
                >
                  <Avatar name={profile.display_name || profile.handle} photo={profile.avatar_data_url} />
                  <span className="profile-handle">{profile.display_name || `@${profile.handle}`}</span>
                </Link>
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
          <><nav className="public-nav" aria-label="Explore Eleanor"><a href="/#sample">The practice</a><Link to="/leaderboard">Leaderboard</Link></nav><Link to="/login" className="btn btn-primary btn-sm">Sign in <Icon name="arrow" /></Link></>
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
            <Route path="/admin" element={<React.Suspense fallback={<p role="status">Loading admin…</p>}><Admin /></React.Suspense>} />
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
        <ExperienceProvider><AppContent /></ExperienceProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
