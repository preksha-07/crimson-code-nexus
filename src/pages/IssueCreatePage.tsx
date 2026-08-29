import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusCircle,
  ShieldAlert,
  Loader2,
  Code,
} from 'lucide-react';

import { createIssue } from '../lib/api/issues';
import { runSecretSentinelScanner } from '../lib/api/security';

import type {
  Severity,
  Priority,
  IssueVisibility,
} from '../types/issue';

import type {
  SecretSentinelWarning,
} from '../types/security';

export default function IssueCreatePage() {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const [component, setComponent] = useState(
    'auth-middleware'
  );

  const [environment, setEnvironment] = useState(
    'Production / Docker Cluster'
  );

  const [severity, setSeverity] =
    useState<Severity>('HIGH');

  const [priority, setPriority] =
    useState<Priority>('P2');

  const [version, setVersion] =
    useState('v2.4.0');

  const [visibility, setVisibility] =
    useState<IssueVisibility>('RESTRICTED');

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  /*
   * Secret Sentinel state
   */
  const [sentinelWarnings, setSentinelWarnings] =
    useState<SecretSentinelWarning[]>([]);

  const [redactedPreview, setRedactedPreview] =
    useState('');

  const [hasSecrets, setHasSecrets] =
    useState(false);

  /*
   * Run Secret Sentinel whenever the description changes.
   * Debounced to avoid scanning on every keystroke.
   */
  useEffect(() => {
    let cancelled = false;

    const checkSecrets = async () => {
      if (!description.trim()) {
        setHasSecrets(false);
        setSentinelWarnings([]);
        setRedactedPreview('');
        return;
      }

      try {
        const scan =
          await runSecretSentinelScanner(
            description
          );

        if (cancelled) {
          return;
        }

        setHasSecrets(scan.hasSecrets);
        setSentinelWarnings(scan.warnings);
        setRedactedPreview(
          scan.redactedContent
        );
      } catch {
        if (cancelled) {
          return;
        }

        setHasSecrets(false);
        setSentinelWarnings([]);
        setRedactedPreview('');
      }
    };

    const timer = window.setTimeout(
      checkSecrets,
      200
    );

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [description]);

  /*
   * Submit issue
   */
  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      setError(
        'Title and description fields are mandatory.'
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      /*
       * Never persist detected secrets.
       * If Secret Sentinel detected credentials,
       * use the redacted version.
       */
      const finalDescription = hasSecrets
        ? redactedPreview
        : description;

      const created = await createIssue({
        title: title.trim(),
        description: finalDescription,
        component,
        environment: environment.trim(),
        severity,
        priority,
        version: version.trim(),
        visibility,
      });

      /*
       * Open the newly-created issue workspace.
       */
      navigate(
        `/issues/${encodeURIComponent(created.id)}`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to submit bug ticket.'
      );

      setIsSubmitting(false);
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
      <div>
        <h1
          style={{
            fontSize: '20px',
            fontWeight: 700,
          }}
        >
          Log Ingest Terminal
        </h1>

        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: '13px',
            marginTop: '2px',
          }}
        >
          Submit telemetry evidence to the NEXUS
          Intelligence Pipeline.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '7fr 5fr',
          gap: 'var(--space-6)',
        }}
      >
        {/* =========================================================
            LEFT SIDE ΓÇö ISSUE CREATION FORM
        ========================================================= */}
        <div className="nexus-card">
          <div className="card-header">
            <div className="card-title">
              <PlusCircle
                size={16}
                style={{
                  color: 'var(--color-cyan)',
                }}
              />

              Ingest Specification Form
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              className="nexus-card-ruby"
              style={{
                padding: 'var(--space-3)',
                marginBottom: 'var(--space-4)',
              }}
            >
              <strong
                style={{
                  fontSize: '12px',
                }}
              >
                Ingest Error: {error}
              </strong>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            id="nexus-ingest-form"
          >
            {/* Title */}
            <div className="form-group">
              <label
                className="form-label"
                htmlFor="issue-title"
              >
                Ticket Summary / Title
              </label>

              <input
                id="issue-title"
                type="text"
                className="input-field"
                placeholder="e.g. Unicode collation spoofing in authentication API"
                value={title}
                onChange={(e) =>
                  setTitle(e.target.value)
                }
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Component + Environment */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  '1fr 1fr',
                gap: 'var(--space-4)',
              }}
            >
              <div className="form-group">
                <label
                  className="form-label"
                  htmlFor="issue-comp"
                >
                  Component Module
                </label>

                <select
                  id="issue-comp"
                  className="input-field"
                  value={component}
                  onChange={(e) =>
                    setComponent(
                      e.target.value
                    )
                  }
                  disabled={isSubmitting}
                >
                  <option value="auth-middleware">
                    auth-middleware (User Auth
                    Routing)
                  </option>

                  <option value="query-processor">
                    query-processor (Data Fetch
                    Engine)
                  </option>

                  <option value="database-schema">
                    database-schema (Data
                    Collation Schema)
                  </option>

                  <option value="container-specs">
                    container-specs (Docker
                    Configs)
                  </option>
                </select>
              </div>

              <div className="form-group">
                <label
                  className="form-label"
                  htmlFor="issue-env"
                >
                  Environment
                </label>

                <input
                  id="issue-env"
                  type="text"
                  className="input-field"
                  placeholder="e.g. Production / Cluster-1"
                  value={environment}
                  onChange={(e) =>
                    setEnvironment(
                      e.target.value
                    )
                  }
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Severity / Priority / Version / Visibility */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(4, 1fr)',
                gap: 'var(--space-2)',
              }}
            >
              {/* Severity */}
              <div className="form-group">
                <label
                  className="form-label"
                  htmlFor="issue-severity"
                >
                  Severity
                </label>

                <select
                  id="issue-severity"
                  className="input-field"
                  value={severity}
                  onChange={(e) =>
                    setSeverity(
                      e.target.value as Severity
                    )
                  }
                  disabled={isSubmitting}
                >
                  <option value="LOW">
                    LOW
                  </option>

                  <option value="MEDIUM">
                    MEDIUM
                  </option>

                  <option value="HIGH">
                    HIGH
                  </option>

                  <option value="CRITICAL">
                    CRITICAL
                  </option>
                </select>
              </div>

              {/* Priority */}
              <div className="form-group">
                <label
                  className="form-label"
                  htmlFor="issue-priority"
                >
                  Priority
                </label>

                <select
                  id="issue-priority"
                  className="input-field"
                  value={priority}
                  onChange={(e) =>
                    setPriority(
                      e.target.value as Priority
                    )
                  }
                  disabled={isSubmitting}
                >
                  <option value="P4">
                    P4
                  </option>

                  <option value="P3">
                    P3
                  </option>

                  <option value="P2">
                    P2
                  </option>

                  <option value="P1">
                    P1
                  </option>
                </select>
              </div>

              {/* Version */}
              <div className="form-group">
                <label
                  className="form-label"
                  htmlFor="issue-version"
                >
                  Version
                </label>

                <input
                  id="issue-version"
                  type="text"
                  className="input-field"
                  value={version}
                  onChange={(e) =>
                    setVersion(
                      e.target.value
                    )
                  }
                  required
                  disabled={isSubmitting}
                />
              </div>

              {/* Visibility */}
              <div className="form-group">
                <label
                  className="form-label"
                  htmlFor="issue-visibility"
                >
                  Visibility
                </label>

                <select
                  id="issue-visibility"
                  className="input-field"
                  value={visibility}
                  onChange={(e) =>
                    setVisibility(
                      e.target.value as IssueVisibility
                    )
                  }
                  disabled={isSubmitting}
                >
                  <option value="PUBLIC">
                    PUBLIC
                  </option>

                  <option value="RESTRICTED">
                    RESTRICTED (Security Only)
                  </option>

                  <option value="CONFIDENTIAL">
                    CONFIDENTIAL (Cryptographic Lock)
                  </option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div className="form-group">
              <label
                className="form-label"
                htmlFor="issue-desc"
              >
                Description & Telemetry Evidence
                Logs
              </label>

              <textarea
                id="issue-desc"
                className="input-field input-field-mono"
                style={{
                  minHeight: '180px',
                  resize: 'vertical',
                }}
                placeholder="Describe the failure mode, inputs, and stack trace logs. Paste code or secrets to test Secret Sentinel redaction..."
                value={description}
                onChange={(e) =>
                  setDescription(
                    e.target.value
                  )
                }
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Buttons */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 'var(--space-2)',
                marginTop: 'var(--space-4)',
              }}
            >
              <button
                type="button"
                onClick={() => navigate('/')}
                className="btn btn-secondary"
                disabled={isSubmitting}
              >
                Cancel Ingest
              </button>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2
                      size={14}
                      style={{
                        animation:
                          'spin 1s linear infinite',
                      }}
                    />

                    Publishing Telemetry...
                  </>
                ) : (
                  'Commit Ingest Record'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* =========================================================
            RIGHT SIDE ΓÇö SECURITY INTELLIGENCE
        ========================================================= */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-6)',
          }}
        >
          {/* Secret Sentinel */}
          <div
            className="nexus-card"
            style={{
              borderColor: hasSecrets
                ? 'var(--color-ruby)'
                : 'var(--border-color)',

              boxShadow: hasSecrets
                ? 'var(--shadow-cyber-ruby)'
                : 'var(--shadow-md)',
            }}
          >
            <div className="card-header">
              <div
                className="card-title"
                style={{
                  color: hasSecrets
                    ? 'var(--color-ruby)'
                    : 'var(--text-primary)',
                }}
              >
                <ShieldAlert size={16} />

                Secret Sentinel Real-Time Scanner
              </div>
            </div>

            {!hasSecrets ? (
              <div
                style={{
                  padding: 'var(--space-4)',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                }}
              >
                No high-entropy keys or credentials
                detected in description. Try
                typing/pasting a Slack token or
                password assignment.
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-3)',
                }}
              >
                <div
                  className="nexus-card-ruby"
                  style={{
                    backgroundColor:
                      'rgba(244, 63, 94, 0.08)',
                    padding: 'var(--space-3)',
                    fontSize: '12px',
                    borderRadius:
                      'var(--border-radius-md)',
                  }}
                >
                  <strong
                    style={{
                      color:
                        'var(--color-ruby)',
                    }}
                  >
                    WARNING:
                  </strong>{' '}
                  {sentinelWarnings.length}{' '}
                  credential leak
                  {sentinelWarnings.length ===
                  1
                    ? ''
                    : 's'} intercepted. NEXUS
                  will overwrite plaintext values
                  with secure redacted values
                  before committing log data.
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-2)',
                  }}
                >
                  {sentinelWarnings.map(
                    (warn, idx) => (
                      <div
                        key={`${warn.lineIndex}-${warn.characterIndex}-${idx}`}
                        style={{
                          backgroundColor:
                            'var(--bg-tertiary)',
                          border:
                            '1px solid var(--border-color)',
                          padding:
                            '6px var(--space-3)',
                          borderRadius:
                            'var(--border-radius-md)',
                          fontSize: '11px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent:
                              'space-between',
                            color:
                              'var(--color-ruby)',
                            fontWeight: 600,
                          }}
                        >
                          <span>
                            {warn.typeOfSecret}
                          </span>

                          <span>
                            Line{' '}
                            {warn.lineIndex + 1}
                          </span>
                        </div>

                        <div
                          style={{
                            marginTop: '4px',
                            display: 'flex',
                            flexDirection:
                              'column',
                            gap: '2px',
                          }}
                        >
                          <span
                            style={{
                              color:
                                'var(--text-muted)',
                            }}
                          >
                            Intercepted:{' '}
                            <code
                              style={{
                                textDecoration:
                                  'line-through',
                              }}
                            >
                              {warn.snippet.substring(
                                0,
                                8
                              )}
                              ...
                            </code>
                          </span>

                          <span
                            style={{
                              color:
                                'var(--color-emerald)',
                            }}
                          >
                            Redacted Output:{' '}
                            <code>
                              {
                                warn.redactedSnippet
                              }
                            </code>
                          </span>
                        </div>
                      </div>
                    )
                  )}
                </div>

                <div>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color:
                        'var(--text-secondary)',
                      marginBottom: '4px',
                    }}
                  >
                    REDACTED TELEMETRY LEDGER
                    PREVIEW:
                  </div>

                  <pre
                    className="log-box"
                    style={{
                      fontSize: '11px',
                      maxHeight: '150px',
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {redactedPreview}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* XSS Sanitization Preview */}
          <div className="nexus-card">
            <div className="card-header">
              <div className="card-title">
                <Code
                  size={16}
                  style={{
                    color:
                      'var(--color-cyan)',
                  }}
                />

                XSS Anti-Injection Sanitization
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-3)',
              }}
            >
              <p
                style={{
                  fontSize: '11px',
                  color:
                    'var(--text-secondary)',
                  lineHeight: '1.4',
                }}
              >
                Description outputs render input
                parameters as literal textual
                records inside standard React DOM
                nodes. HTML tags, script loaders,
                and attribute triggers are
                escaped by React's normal JSX
                rendering.
              </p>

              <div
                style={{
                  border:
                    '1px solid var(--border-color)',
                  borderRadius:
                    'var(--border-radius-md)',
                  overflow: 'hidden',
                }}
              >
                {/* Browser Render Output */}
                <div
                  style={{
                    padding:
                      'var(--space-3)',
                    backgroundColor:
                      'var(--bg-primary)',
                    fontSize: '12px',
                    borderBottom:
                      '1px solid var(--border-color)',
                  }}
                >
                  <div
                    style={{
                      fontSize: '10px',
                      color:
                        'var(--text-muted)',
                      textTransform:
                        'uppercase',
                      marginBottom: '4px',
                    }}
                  >
                    Browser Render Output
                    (Safe Escaping):
                  </div>

                  <div
                    style={{
                      padding:
                        'var(--space-2)',
                      backgroundColor:
                        'var(--bg-tertiary)',
                      borderRadius:
                        'var(--border-radius-sm)',
                      fontFamily:
                        'var(--font-mono)',
                      color:
                        'var(--text-primary)',
                      minHeight: '40px',
                      wordBreak:
                        'break-all',
                      whiteSpace:
                        'pre-wrap',
                    }}
                  >
                    {description || (
                      <span
                        style={{
                          color:
                            'var(--text-muted)',
                        }}
                      >
                        Type script payloads
                        here to verify
                        escaping...
                      </span>
                    )}
                  </div>
                </div>

                {/* JSX representation */}
                <div
                  style={{
                    padding:
                      'var(--space-3)',
                    backgroundColor:
                      'var(--bg-secondary)',
                    fontSize: '11px',
                  }}
                >
                  <span
                    style={{
                      color:
                        'var(--text-muted)',
                    }}
                  >
                    Compiled JSX Output:
                  </span>

                  <pre
                    style={{
                      color:
                        'var(--color-cyan)',
                      marginTop: '4px',
                      fontFamily:
                        'var(--font-mono)',
                      whiteSpace:
                        'pre-wrap',
                    }}
                  >
                    {'<div>{issue.description}</div>'}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
