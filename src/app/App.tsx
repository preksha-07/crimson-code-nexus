import { HashRouter, Link, useLocation } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  PlusCircle,
  ShieldAlert,
} from 'lucide-react';
import AppRoutes from './routes';

function AppLayout() {
  const location = useLocation();

  const isLoginPage = location.pathname === '/login';

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {!isLoginPage && (
        <header
          style={{
            height: 'var(--header-height)',
            backgroundColor: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 var(--space-6)',
            zIndex: 100,
          }}
        >
          {/* NEXUS Logo */}
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              textDecoration: 'none',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--border-radius-sm)',
                backgroundColor: 'var(--color-cyan-glow)',
                color: 'var(--color-cyan)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Shield size={18} />
            </div>

            <span
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.025em',
                fontFamily: 'var(--font-mono)',
              }}
            >
              NEXUS
            </span>
          </Link>

          {/* Main Navigation */}
          <nav
            aria-label="Main navigation"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
            }}
          >
            <Link
              to="/"
              className="btn"
              aria-current={
                location.pathname === '/' ? 'page' : undefined
              }
              style={{
                border: 'none',
                backgroundColor:
                  location.pathname === '/'
                    ? 'var(--bg-active)'
                    : 'transparent',
                color:
                  location.pathname === '/'
                    ? 'var(--text-primary)'
                    : 'var(--text-secondary)',
              }}
            >
              <LayoutDashboard size={14} />
              Control Room
            </Link>

            <Link
              to="/projects"
              className="btn"
              aria-current={
                location.pathname.startsWith('/projects')
                  ? 'page'
                  : undefined
              }
              style={{
                border: 'none',
                backgroundColor: location.pathname.startsWith('/projects')
                  ? 'var(--bg-active)'
                  : 'transparent',
                color: location.pathname.startsWith('/projects')
                  ? 'var(--text-primary)'
                  : 'var(--text-secondary)',
              }}
            >
              Projects
            </Link>

            <Link
              to="/issues/create"
              className="btn"
              aria-current={
                location.pathname === '/issues/create'
                  ? 'page'
                  : undefined
              }
              style={{
                border: 'none',
                backgroundColor:
                  location.pathname === '/issues/create'
                    ? 'var(--bg-active)'
                    : 'transparent',
                color:
                  location.pathname === '/issues/create'
                    ? 'var(--text-primary)'
                    : 'var(--text-secondary)',
              }}
            >
              <PlusCircle size={14} />
              Create Issue
            </Link>

            <Link
              to="/security"
              className="btn"
              aria-current={
                location.pathname === '/security'
                  ? 'page'
                  : undefined
              }
              style={{
                border: 'none',
                backgroundColor:
                  location.pathname === '/security'
                    ? 'var(--bg-active)'
                    : 'transparent',
                color:
                  location.pathname === '/security'
                    ? 'var(--text-primary)'
                    : 'var(--text-secondary)',
              }}
            >
              <ShieldAlert size={14} />
              Security
            </Link>
          </nav>
        </header>
      )}

      {/* Main Application Content */}
      <main
        style={{
          flex: 1,
          padding: isLoginPage ? '0' : 'var(--space-6)',
          backgroundColor: 'var(--bg-primary)',
        }}
      >
        <AppRoutes />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppLayout />
    </HashRouter>
  );
}
