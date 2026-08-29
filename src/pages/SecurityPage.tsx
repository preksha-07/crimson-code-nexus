
import { useEffect, useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Activity,
  Search,
  Lock,
  Eye,
} from 'lucide-react';

import {
  getAuditLogs,
  runSecretSentinelScanner,
} from '../lib/api/security';

import type {
  AuditEvent,
  SecretSentinelWarning,
} from '../types/security';

export default function SecurityPage() {
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>([]);
  const [scanContent, setScanContent] = useState('');
  const [warnings, setWarnings] = useState<SecretSentinelWarning[]>([]);
  const [redactedContent, setRedactedContent] = useState('');
  const [hasSecrets, setHasSecrets] = useState(false);

  const [loadingLogs, setLoadingLogs] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  /*
   * Load security audit events from the backend.
   */
  useEffect(() => {
    const loadAuditLogs = async () => {
      try {
        setLoadingLogs(true);
        setError(null);

        const data = await getAuditLogs();

        setAuditLogs(
          Array.isArray(data) ? data : []
        );
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load security audit logs.'
        );

        setAuditLogs([]);
      } finally {
        setLoadingLogs(false);
      }
    };

    loadAuditLogs();
  }, []);

  /*
   * Run Secret Sentinel through the backend.
   */
  const handleSecretScan = async () => {
    if (!scanContent.trim()) {
      setScanError('Enter content to scan.');
      return;
    }

    try {
      setScanning(true);
      setScanError(null);

      const result = await runSecretSentinelScanner(
        scanContent
      );

      setHasSecrets(result.hasSecrets);
      setWarnings(
        Array.isArray(result.warnings)
          ? result.warnings
          : []
      );
      setRedactedContent(
        result.redactedContent ?? ''
      );
    } catch (err: unknown) {
      setScanError(
        err instanceof Error
          ? err.message
          : 'Secret Sentinel scan failed.'
      );

      setWarnings([]);
      setRedactedContent('');
      setHasSecrets(false);
    } finally {
      setScanning(false);
    }
  };

  const getAuditBadgeClass = (
    type: AuditEvent['type']
  ) => {
    switch (type) {
      case 'SECURITY_FINDING':
        return 'badge-ruby';

      case 'PERMISSION':
        return 'badge-indigo';

      case 'VISIBILITY':
        return 'badge-indigo';

      case 'AI_TRIAGE':
        return 'badge-cyan';

      case 'STATE_TRANSITION':
        return 'badge-amber';

      default:
        return 'badge-slate';
    }
  };

  return (
    <div
      className="fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-6)',
      }}
    >
      {/* Page Header */}
      <section className="nexus-card">
        <div className="card-header">
          <div className="card-title">
            <ShieldAlert
              size={18}
              style={{
                color: 'var(--color-cyan)',
              }}
            />
            Security Control Center
          </div>
        </div>

        <p
          style={{
            margin: 0,
            color: 'var(--text-secondary)',
            fontSize: '13px',
            lineHeight: '1.6',
          }}
        >
          Monitor security events, review access activity,
          and scan evidence for exposed secrets.
        </p>
      </section>

      {/* Security Overview */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 'var(--space-4)',
        }}
      >
        <div className="nexus-card">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Audit Events
              </div>

              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 700,
                  marginTop: '4px',
                  color: 'var(--text-primary)',
                }}
              >
                {auditLogs.length}
              </div>
            </div>

            <Activity
              size={32}
              style={{
                color: 'var(--color-cyan)',
                opacity: 0.35,
              }}
            />
          </div>
        </div>

        <div
          className="nexus-card"
          style={{
            borderLeft:
              '3px solid var(--color-ruby)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Security Findings
              </div>

              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 700,
                  marginTop: '4px',
                  color: 'var(--color-ruby)',
                }}
              >
                {
                  auditLogs.filter(
                    (log) =>
                      log.type ===
                      'SECURITY_FINDING'
                  ).length
                }
              </div>
            </div>

            <ShieldAlert
              size={32}
              style={{
                color: 'var(--color-ruby)',
                opacity: 0.35,
              }}
            />
          </div>
        </div>

        <div
          className="nexus-card"
          style={{
            borderLeft:
              '3px solid var(--color-emerald)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Secret Scan Status
              </div>

              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  marginTop: '6px',
                  color: hasSecrets
                    ? 'var(--color-ruby)'
                    : 'var(--color-emerald)',
                }}
              >
                {hasSecrets
                  ? 'SECRETS DETECTED'
                  : 'READY'}
              </div>
            </div>

            {hasSecrets ? (
              <AlertTriangle
                size={32}
                style={{
                  color: 'var(--color-ruby)',
                  opacity: 0.4,
                }}
              />
            ) : (
              <ShieldCheck
                size={32}
                style={{
                  color: 'var(--color-emerald)',
                  opacity: 0.4,
                }}
              />
            )}
          </div>
        </div>
      </section>

      {/* Secret Sentinel */}
      <section className="nexus-card">
        <div className="card-header">
          <div className="card-title">
            <Search
              size={16}
              style={{
                color: 'var(--color-cyan)',
              }}
            />
            Secret Sentinel
          </div>

          <span className="badge badge-cyan">
            SECURITY SCANNER
          </span>
        </div>

        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: '12px',
            lineHeight: '1.5',
            marginBottom: 'var(--space-4)',
          }}
        >
          Scan evidence or technical content for
          potentially exposed secrets. Detection and
          redaction are performed by the backend security
          service.
        </p>

        <textarea
          value={scanContent}
          onChange={(event) =>
            setScanContent(event.target.value)
          }
          placeholder="Paste content to scan..."
          disabled={scanning}
          style={{
            width: '100%',
            minHeight: '160px',
            resize: 'vertical',
            boxSizing: 'border-box',
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            borderRadius:
              'var(--border-radius-md)',
            padding: 'var(--space-3)',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            outline: 'none',
          }}
        />

        {scanError && (
          <div
            style={{
              marginTop: 'var(--space-3)',
              padding: 'var(--space-3)',
              backgroundColor:
                'rgba(244, 63, 94, 0.08)',
              border:
                '1px solid rgba(244, 63, 94, 0.2)',
              borderRadius:
                'var(--border-radius-md)',
              color: 'var(--text-primary)',
              fontSize: '12px',
            }}
          >
            <AlertTriangle
              size={14}
              style={{
                color: 'var(--color-ruby)',
                verticalAlign: 'middle',
                marginRight: '6px',
              }}
            />
            {scanError}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: 'var(--space-3)',
          }}
        >
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSecretScan}
            disabled={scanning}
          >
            <Search size={14} />

            {scanning
              ? 'Scanning...'
              : 'Run Secret Sentinel'}
          </button>
        </div>

        {/* Scan Results */}
        {(warnings.length > 0 ||
          redactedContent) && (
          <div
            style={{
              marginTop: 'var(--space-6)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-4)',
            }}
          >
            {/* Result Status */}
            <div
              style={{
                padding: 'var(--space-4)',
                backgroundColor: hasSecrets
                  ? 'rgba(244, 63, 94, 0.08)'
                  : 'rgba(16, 185, 129, 0.08)',
                border: hasSecrets
                  ? '1px solid rgba(244, 63, 94, 0.2)'
                  : '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius:
                  'var(--border-radius-md)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                }}
              >
                {hasSecrets ? (
                  <AlertTriangle
                    size={18}
                    style={{
                      color:
                        'var(--color-ruby)',
                    }}
                  />
                ) : (
                  <ShieldCheck
                    size={18}
                    style={{
                      color:
                        'var(--color-emerald)',
                    }}
                  />
                )}

                <strong
                  style={{
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                  }}
                >
                  {hasSecrets
                    ? `${warnings.length} potential secret${
                        warnings.length === 1
                          ? ''
                          : 's'
                      } detected`
                    : 'No secrets detected'}
                </strong>
              </div>
            </div>

            {/* Warnings */}
            {warnings.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    marginBottom:
                      'var(--space-2)',
                  }}
                >
                  Detected Findings
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-2)',
                  }}
                >
                  {warnings.map(
                    (warning, index) => (
                      <div
                        key={`${warning.lineIndex}-${warning.characterIndex}-${index}`}
                        style={{
                          padding:
                            'var(--space-3)',
                          backgroundColor:
                            'var(--bg-tertiary)',
                          border:
                            '1px solid var(--border-color)',
                          borderRadius:
                            'var(--border-radius-md)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent:
                              'space-between',
                            gap:
                              'var(--space-3)',
                            marginBottom:
                              '6px',
                          }}
                        >
                          <span className="badge badge-ruby">
                            {warning.typeOfSecret}
                          </span>

                          <span
                            style={{
                              fontSize: '10px',
                              color:
                                'var(--text-muted)',
                              fontFamily:
                                'var(--font-mono)',
                            }}
                          >
                            Line{' '}
                            {warning.lineIndex}
                            {' · '}
                            Character{' '}
                            {warning.characterIndex}
                          </span>
                        </div>

                        <div
                          style={{
                            fontSize: '11px',
                            color:
                              'var(--text-secondary)',
                            fontFamily:
                              'var(--font-mono)',
                            wordBreak:
                              'break-word',
                          }}
                        >
                          {warning.redactedSnippet}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Redacted Output */}
            {redactedContent && (
              <div>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color:
                      'var(--text-secondary)',
                    textTransform: 'uppercase',
                    marginBottom:
                      'var(--space-2)',
                  }}
                >
                  Redacted Content
                </div>

                <pre
                  style={{
                    margin: 0,
                    padding:
                      'var(--space-4)',
                    backgroundColor:
                      'var(--bg-tertiary)',
                    border:
                      '1px solid var(--border-color)',
                    borderRadius:
                      'var(--border-radius-md)',
                    color:
                      'var(--text-primary)',
                    fontFamily:
                      'var(--font-mono)',
                    fontSize: '11px',
                    lineHeight: '1.6',
                    whiteSpace:
                      'pre-wrap',
                    wordBreak:
                      'break-word',
                    overflowX: 'auto',
                  }}
                >
                  {redactedContent}
                </pre>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Audit Log */}
      <section className="nexus-card">
        <div className="card-header">
          <div className="card-title">
            <Lock
              size={16}
              style={{
                color: 'var(--color-cyan)',
              }}
            />
            Security Audit Trail
          </div>

          <span className="badge badge-slate">
            {auditLogs.length} EVENTS
          </span>
        </div>

        {loadingLogs ? (
          <div
            style={{
              padding: 'var(--space-6)',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '12px',
            }}
          >
            Loading security audit events...
          </div>
        ) : error ? (
          <div
            style={{
              padding: 'var(--space-4)',
              backgroundColor:
                'rgba(244, 63, 94, 0.08)',
              border:
                '1px solid rgba(244, 63, 94, 0.2)',
              borderRadius:
                'var(--border-radius-md)',
              color: 'var(--text-primary)',
              fontSize: '12px',
            }}
          >
            <AlertTriangle
              size={14}
              style={{
                color: 'var(--color-ruby)',
                verticalAlign: 'middle',
                marginRight: '6px',
              }}
            />
            {error}
          </div>
        ) : auditLogs.length === 0 ? (
          <div
            style={{
              padding: 'var(--space-6)',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '12px',
            }}
          >
            No security audit events available.
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
              maxHeight: '500px',
              overflowY: 'auto',
            }}
          >
            {auditLogs.map((log) => (
              <div
                key={log.id}
                style={{
                  padding:
                    'var(--space-3)',
                  backgroundColor:
                    'var(--bg-tertiary)',
                  border:
                    '1px solid var(--border-color)',
                  borderRadius:
                    'var(--border-radius-md)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    marginBottom: '6px',
                  }}
                >
                  <span
                    className={`badge ${getAuditBadgeClass(
                      log.type
                    )}`}
                  >
                    {log.type}
                  </span>

                  <span
                    style={{
                      fontSize: '10px',
                      color:
                        'var(--text-muted)',
                      fontFamily:
                        'var(--font-mono)',
                    }}
                  >
                    {new Date(
                      log.timestamp
                    ).toLocaleString()}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color:
                      'var(--text-primary)',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  <Eye size={13} />
                  {log.action}
                </div>

                <div
                  style={{
                    marginTop: '5px',
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '4px 12px',
                    fontSize: '10px',
                    color:
                      'var(--text-secondary)',
                  }}
                >
                  <span>
                    Actor: {log.actor}
                  </span>

                  <span>
                    Role: {log.actorRole}
                  </span>

                  <span>
                    Target: {log.target}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
