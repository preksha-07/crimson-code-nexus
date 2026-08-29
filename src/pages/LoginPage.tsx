import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Key,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { apiClient } from '../lib/api/client';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] =
    useState<string | null>(null);

  const navigate = useNavigate();

  const handleLogin = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setError(null);

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
      setError(
        'Both username/email and security key are mandatory.'
      );
      return;
    }

    setIsLoading(true);

    try {
      const res = await apiClient.post<{ data: { user: { id: string; role: string; displayName: string } } }>(
        '/auth/login',
        { username: cleanUsername, password: cleanPassword }
      );

      const user = res.data.user;

      localStorage.setItem(
        'nexus_current_user',
        JSON.stringify({
          name: user.displayName,
          role: user.role,
          token: 'nexus-session-token-abc123xyz',
        })
      );

      window.dispatchEvent(
        new Event('nexus_db_updated')
      );

      navigate('/');
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Authentication failed. Please verify your credentials.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-4)',
      }}
    >
      <div
        className="nexus-card pulse-glow"
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: 'var(--space-8)',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <Shield size={10} />
          TLS 1.3 SIGNED
        </div>

        <div
          style={{
            textAlign: 'center',
            marginBottom: 'var(--space-8)',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px',
              height: '48px',
              borderRadius:
                'var(--border-radius-md)',
              backgroundColor:
                'var(--color-cyan-glow)',
              color: 'var(--color-cyan)',
              border:
                '1px solid rgba(6, 182, 212, 0.3)',
              marginBottom: 'var(--space-4)',
            }}
          >
            <Shield size={24} />
          </div>

          <h1
            style={{
              fontSize: '24px',
              fontWeight: 700,
              marginBottom: '4px',
            }}
          >
            NEXUS
          </h1>

          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: '13px',
            }}
          >
            Evidence-Driven Bug Intelligence Platform
          </p>
        </div>

        {error && (
          <div
            className="nexus-card-ruby"
            role="alert"
            style={{
              marginBottom: 'var(--space-4)',
              padding: 'var(--space-3)',
              display: 'flex',
              gap: 'var(--space-2)',
              alignItems: 'flex-start',
            }}
          >
            <AlertTriangle
              size={16}
              style={{
                color: 'var(--color-ruby)',
                flexShrink: 0,
              }}
            />

            <div
              style={{
                fontSize: '12px',
              }}
            >
              <strong>
                Authentication Failure:
              </strong>{' '}
              {error}

              <div
                style={{
                  marginTop: '6px',
                  color: 'var(--text-secondary)',
                }}
              >
                Demo users:
                <br />
                <code
                  style={{
                    color: 'var(--color-cyan)',
                  }}
                >
                  sarah
                </code>{' '}
                or{' '}
                <code
                  style={{
                    color: 'var(--color-cyan)',
                  }}
                >
                  sconnor
                </code>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label
              className="form-label"
              htmlFor="username"
            >
              Operator Username / Email
            </label>

            <input
              id="username"
              type="text"
              className="input-field"
              placeholder="e.g. sconnor@nexus.security"
              value={username}
              onChange={(e) =>
                setUsername(e.target.value)
              }
              disabled={isLoading}
              autoComplete="username"
            />
          </div>

          <div
            className="form-group"
            style={{
              marginBottom: 'var(--space-6)',
            }}
          >
            <label
              className="form-label"
              htmlFor="password"
            >
              Security Key / Password
            </label>

            <div
              style={{
                position: 'relative',
              }}
            >
              <input
                id="password"
                type="password"
                className="input-field"
                placeholder="ΓÇóΓÇóΓÇóΓÇóΓÇóΓÇóΓÇóΓÇóΓÇóΓÇóΓÇóΓÇó"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                disabled={isLoading}
                autoComplete="current-password"
                style={{
                  paddingRight: '2.5rem',
                }}
              />

              <Key
                size={16}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform:
                    'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
            style={{
              width: '100%',
              height: '40px',
            }}
          >
            {isLoading ? (
              <>
                <Loader2
                  size={16}
                  style={{
                    animation:
                      'spin 1s linear infinite',
                  }}
                />
                Authenticating Session...
              </>
            ) : (
              'Establish Secure Session'
            )}
          </button>
        </form>

        <div
          style={{
            marginTop: 'var(--space-6)',
            textAlign: 'center',
            fontSize: '11px',
            color: 'var(--text-muted)',
            lineHeight: '1.5',
          }}
        >
          NEXUS Vixen Node v2.4.0.
          <br />
          Authorized engineering access only.
          <br />
          All actions are logged under audit-trail protocol.
        </div>
      </div>
    </div>
  );
}
