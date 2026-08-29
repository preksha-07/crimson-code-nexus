
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  AlertOctagon,
  CheckCircle2,
  Activity,
  ArrowRight,
  Cpu,
  Flame,
  Layers,
  Compass,
  Gauge,
  PlusCircle,
} from 'lucide-react';

import { getIssues } from '../lib/api/issues';
import { getAuditLogs } from '../lib/api/security';
import { getReleaseRisk } from '../lib/api/releases';

import type { Issue } from '../types/issue';
import type { AuditEvent } from '../types/security';
import type { ReleaseRisk } from '../types/release';

export default function DashboardPage() {
  const navigate = useNavigate();

  const [issues, setIssues] = useState<Issue[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>([]);
  const [activeRelease, setActiveRelease] =
    useState<ReleaseRisk | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError(null);

        const results = await Promise.allSettled([
          getIssues(),
          getAuditLogs(),
          getReleaseRisk('v2.4.0'),
        ]);

        if (!mounted) return;

        const issuesResult = results[0];
        const auditResult = results[1];
        const releaseResult = results[2];

        if (issuesResult.status === 'fulfilled') {
          setIssues(
            Array.isArray(issuesResult.value)
              ? issuesResult.value
              : []
          );
        } else {
          setIssues([]);
        }

        if (auditResult.status === 'fulfilled') {
          setAuditLogs(
            Array.isArray(auditResult.value)
              ? auditResult.value
              : []
          );
        } else {
          setAuditLogs([]);
        }

        if (releaseResult.status === 'fulfilled') {
          setActiveRelease(
            releaseResult.value ?? null
          );
        } else {
          setActiveRelease(null);
        }
      } catch (err) {
        if (!mounted) return;

        setIssues([]);
        setAuditLogs([]);
        setActiveRelease(null);

        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load dashboard data.'
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * IMPORTANT:
   * Always work with arrays.
   * This prevents "Cannot read properties of null (reading filter)".
   */
  const safeIssues = Array.isArray(issues)
    ? issues
    : [];

  const safeAuditLogs = Array.isArray(auditLogs)
    ? auditLogs
    : [];

  const openIssues = safeIssues.filter(
    (issue) => issue.status !== 'CLOSED'
  );

  const criticalIssues = openIssues.filter(
    (issue) => issue.severity === 'CRITICAL'
  );

  const securityIssues = openIssues.filter(
    (issue) => issue.visibility !== 'PUBLIC'
  );

  const statusCounts = safeIssues.reduce<
    Record<string, number>
  >((counts, issue) => {
    counts[issue.status] =
      (counts[issue.status] || 0) + 1;

    return counts;
  }, {});

  const handleOpenWorkspace = (issueId: string) => {
    navigate(
      `/issues/${encodeURIComponent(issueId)}`
    );
  };

  const getAuditBadgeClass = (
    type: AuditEvent['type']
  ) => {
    switch (type) {
      case 'VISIBILITY':
        return 'badge-indigo';

      case 'SECURITY_FINDING':
        return 'badge-ruby';

      case 'AI_TRIAGE':
        return 'badge-cyan';

      case 'STATE_TRANSITION':
        return 'badge-amber';

      case 'PERMISSION':
        return 'badge-indigo';

      default:
        return 'badge-slate';
    }
  };

  const getSeverityBadgeClass = (
    severity: Issue['severity']
  ) => {
    switch (severity) {
      case 'CRITICAL':
      case 'HIGH':
        return 'badge-ruby';

      case 'MEDIUM':
        return 'badge-amber';

      case 'LOW':
      default:
        return 'badge-cyan';
    }
  };

  const getStatusBadgeClass = (
    status: Issue['status']
  ) => {
    switch (status) {
      case 'VERIFIED':
        return 'badge-emerald';

      case 'CLOSED':
        return 'badge-slate';

      case 'REPORTED':
        return 'badge-cyan';

      case 'TRIAGED':
        return 'badge-indigo';

      default:
        return 'badge-amber';
    }
  };

  const getRiskColor = (
    riskLevel: ReleaseRisk['riskLevel']
  ) => {
    switch (riskLevel) {
      case 'CRITICAL':
      case 'HIGH':
        return 'var(--color-ruby)';

      case 'MEDIUM':
        return 'var(--color-amber)';

      case 'LOW':
      default:
        return 'var(--color-emerald)';
    }
  };

  if (loading) {
    return (
      <div
        className="fade-in"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}
      >
        <div
          className="nexus-card"
          style={{
            width: '100%',
            maxWidth: '500px',
            textAlign: 'center',
          }}
        >
          <Activity
            size={32}
            style={{
              color: 'var(--color-cyan)',
              marginBottom: 'var(--space-4)',
            }}
          />

          <div className="card-title">
            Loading NEXUS Control Room...
          </div>

          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: '13px',
              marginTop: '8px',
            }}
          >
            Initializing evidence and security data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-6)',
      }}
    >
      {/* API warning */}
      {error && (
        <div
          className="nexus-card"
          style={{
            borderLeft:
              '3px solid var(--color-amber)',
            backgroundColor:
              'rgba(245, 158, 11, 0.06)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
            }}
          >
            <AlertOctagon
              size={20}
              style={{
                color: 'var(--color-amber)',
              }}
            />

            <div>
              <div
                style={{
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                }}
              >
                Backend data unavailable
              </div>

              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  marginTop: '3px',
                }}
              >
                The dashboard is running safely with
                empty data. You can continue using the
                interface.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Critical alert */}
      {criticalIssues.length > 0 && (
        <div
          className="nexus-card-ruby"
          style={{
            backgroundColor:
              'rgba(244, 63, 94, 0.06)',
            border:
              '1px solid rgba(244, 63, 94, 0.2)',
            padding: 'var(--space-4)',
            borderRadius:
              'var(--border-radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-4)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor:
                  'var(--color-ruby-glow)',
                color: 'var(--color-ruby)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertOctagon size={20} />
            </div>

            <div>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: '14px',
                  color: 'var(--text-primary)',
                }}
              >
                Critical vulnerability alert
              </div>

              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  marginTop: '2px',
                }}
              >
                {criticalIssues.length} critical issue
                {criticalIssues.length === 1
                  ? ''
                  : 's'} require attention.
              </div>
            </div>
          </div>

          <button
            onClick={() =>
              handleOpenWorkspace(
                criticalIssues[0].id
              )
            }
            className="btn btn-ruby"
            style={{
              fontSize: '12px',
              padding: '6px 12px',
            }}
          >
            Investigate
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Stats */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 'var(--space-4)',
        }}
      >
        <div
          className="nexus-card nexus-card-cyber"
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
              }}
            >
              Active Ingests
            </div>

            <div
              style={{
                fontSize: '28px',
                fontWeight: 700,
                margin: '4px 0',
              }}
            >
              {openIssues.length}
            </div>

            <div
              style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
              }}
            >
              Open tickets requiring triage
            </div>
          </div>

          <Layers
            size={36}
            style={{
              color: 'var(--color-cyan)',
              opacity: 0.3,
            }}
          />
        </div>

        <div
          className="nexus-card"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderLeft:
              '3px solid var(--color-ruby)',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '11px',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
              }}
            >
              Critical Severity
            </div>

            <div
              style={{
                fontSize: '28px',
                fontWeight: 700,
                margin: '4px 0',
                color: 'var(--color-ruby)',
              }}
            >
              {criticalIssues.length}
            </div>

            <div
              style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
              }}
            >
              Critical open issues
            </div>
          </div>

          <Flame
            size={36}
            style={{
              color: 'var(--color-ruby)',
              opacity: 0.3,
            }}
          />
        </div>

        <div
          className="nexus-card"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderLeft:
              '3px solid var(--color-indigo)',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '11px',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
              }}
            >
              Security Warnings
            </div>

            <div
              style={{
                fontSize: '28px',
                fontWeight: 700,
                margin: '4px 0',
                color: 'var(--color-indigo)',
              }}
            >
              {securityIssues.length}
            </div>

            <div
              style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
              }}
            >
              Restricted & confidential issues
            </div>
          </div>

          <ShieldAlert
            size={36}
            style={{
              color: 'var(--color-indigo)',
              opacity: 0.3,
            }}
          />
        </div>

        <div
          className="nexus-card"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderLeft:
              '3px solid var(--color-emerald)',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '11px',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
              }}
            >
              Verified Fixes
            </div>

            <div
              style={{
                fontSize: '28px',
                fontWeight: 700,
                margin: '4px 0',
                color: 'var(--color-emerald)',
              }}
            >
              {statusCounts.VERIFIED || 0}
            </div>

            <div
              style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
              }}
            >
              Evidential validation complete
            </div>
          </div>

          <CheckCircle2
            size={36}
            style={{
              color: 'var(--color-emerald)',
              opacity: 0.3,
            }}
          />
        </div>
      </section>

      {/* Main content */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'minmax(0, 3fr) minmax(280px, 2fr)',
          gap: 'var(--space-6)',
        }}
      >
        {/* LEFT */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-6)',
          }}
        >
          <div className="nexus-card">
            <div className="card-header">
              <div className="card-title">
                <Compass
                  size={16}
                  style={{
                    color: 'var(--color-cyan)',
                  }}
                />
                Intel-Driven Bug Ledger
              </div>

              <Link
                to="/issues/create"
                className="btn btn-primary"
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                }}
              >
                <PlusCircle size={12} />
                Log New Bug
              </Link>
            </div>

            <div
              className="nexus-table-wrapper"
              style={{
                overflowX: 'auto',
              }}
            >
              <table className="nexus-table">
                <thead>
                  <tr>
                    <th>Bug ID</th>
                    <th>Vulnerability Title</th>
                    <th>Component</th>
                    <th>Environment</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Workspace</th>
                  </tr>
                </thead>

                <tbody>
                  {safeIssues.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        style={{
                          textAlign: 'center',
                          padding:
                            'var(--space-8)',
                          color:
                            'var(--text-muted)',
                        }}
                      >
                        No issues available.
                      </td>
                    </tr>
                  ) : (
                    safeIssues.map((issue) => (
                      <tr key={issue.id}>
                        <td
                          style={{
                            fontFamily:
                              'var(--font-mono)',
                            fontWeight: 600,
                            fontSize: '12px',
                          }}
                        >
                          <span
                            style={{
                              color:
                                issue.severity ===
                                'CRITICAL'
                                  ? 'var(--color-ruby)'
                                  : 'var(--color-cyan)',
                            }}
                          >
                            {issue.id}
                          </span>
                        </td>

                        <td>
                          <div
                            style={{
                              display: 'flex',
                              flexDirection:
                                'column',
                            }}
                          >
                            <span
                              style={{
                                fontWeight: 500,
                              }}
                            >
                              {issue.title}
                            </span>

                            <span
                              style={{
                                fontSize: '10px',
                                color:
                                  'var(--text-muted)',
                                marginTop: '2px',
                              }}
                            >
                              Reporter: {issue.reporter}{' '}
                              ΓÇó Version:{' '}
                              {issue.version}
                            </span>
                          </div>
                        </td>

                        <td>
                          <span className="badge badge-slate">
                            {issue.component}
                          </span>
                        </td>

                        <td
                          style={{
                            fontSize: '12px',
                            color:
                              'var(--text-secondary)',
                          }}
                        >
                          {issue.environment}
                        </td>

                        <td>
                          <span
                            className={`badge ${getSeverityBadgeClass(
                              issue.severity
                            )}`}
                          >
                            {issue.severity}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`badge ${getStatusBadgeClass(
                              issue.status
                            )}`}
                          >
                            {issue.status}
                          </span>
                        </td>

                        <td>
                          <button
                            onClick={() =>
                              handleOpenWorkspace(
                                issue.id
                              )
                            }
                            className="btn btn-secondary"
                            style={{
                              padding: '4px 8px',
                              fontSize: '11px',
                            }}
                          >
                            Analyze
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Workflow */}
          <div className="nexus-card">
            <div className="card-header">
              <div className="card-title">
                <Activity
                  size={16}
                  style={{
                    color: 'var(--color-cyan)',
                  }}
                />
                NEXUS Evidence Workflow Track
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(3, 1fr)',
                gap: 'var(--space-4)',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  padding: 'var(--space-4)',
                  backgroundColor:
                    'var(--bg-tertiary)',
                  borderRadius:
                    'var(--border-radius-md)',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    color:
                      'var(--text-secondary)',
                  }}
                >
                  Ingestion & Triage
                </div>

                <div
                  style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    color:
                      'var(--color-cyan)',
                    marginTop: '4px',
                  }}
                >
                  {(statusCounts.REPORTED || 0) +
                    (statusCounts.TRIAGED || 0)}
                </div>

                <div
                  style={{
                    fontSize: '10px',
                    color:
                      'var(--text-muted)',
                  }}
                >
                  REPORTED / TRIAGED
                </div>
              </div>

              <div
                style={{
                  padding: 'var(--space-4)',
                  backgroundColor:
                    'var(--bg-tertiary)',
                  borderRadius:
                    'var(--border-radius-md)',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    color:
                      'var(--text-secondary)',
                  }}
                >
                  Fix & Integration
                </div>

                <div
                  style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    color:
                      'var(--color-amber)',
                    marginTop: '4px',
                  }}
                >
                  {(statusCounts.ASSIGNED || 0) +
                    (statusCounts.IN_PROGRESS || 0) +
                    (statusCounts.CODE_REVIEW || 0) +
                    (statusCounts.TESTING || 0)}
                </div>

                <div
                  style={{
                    fontSize: '10px',
                    color:
                      'var(--text-muted)',
                  }}
                >
                  ASSIGNED / PROGRESS / TESTING
                </div>
              </div>

              <div
                style={{
                  padding: 'var(--space-4)',
                  backgroundColor:
                    'var(--bg-tertiary)',
                  borderRadius:
                    'var(--border-radius-md)',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    color:
                      'var(--text-secondary)',
                  }}
                >
                  Verification & Closure
                </div>

                <div
                  style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    color:
                      'var(--color-emerald)',
                    marginTop: '4px',
                  }}
                >
                  {(statusCounts.RESOLVED || 0) +
                    (statusCounts.VERIFIED || 0) +
                    (statusCounts.CLOSED || 0)}
                </div>

                <div
                  style={{
                    fontSize: '10px',
                    color:
                      'var(--text-muted)',
                  }}
                >
                  RESOLVED / VERIFIED / CLOSED
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-6)',
          }}
        >
          {/* Release Risk */}
          {activeRelease && (
            <div className="nexus-card">
              <div className="card-header">
                <div className="card-title">
                  <Gauge
                    size={16}
                    style={{
                      color: getRiskColor(
                        activeRelease.riskLevel
                      ),
                    }}
                  />
                  Release Risk Radar:{' '}
                  {activeRelease.version}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-4)',
                }}
              >
                <div
                  style={{
                    width: '90px',
                    height: '90px',
                    borderRadius: '50%',
                    border:
                      '8px solid var(--bg-tertiary)',
                    display: 'flex',
                    flexDirection:
                      'column',
                    alignItems: 'center',
                    justifyContent:
                      'center',
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: '20px',
                      fontWeight: 700,
                      color: getRiskColor(
                        activeRelease.riskLevel
                      ),
                    }}
                  >
                    {activeRelease.score}%
                  </span>

                  <span
                    style={{
                      fontSize: '8px',
                      color:
                        'var(--text-muted)',
                      textTransform:
                        'uppercase',
                    }}
                  >
                    Risk index
                  </span>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  >
                    Status:{' '}
                    <span
                      style={{
                        color: getRiskColor(
                          activeRelease.riskLevel
                        ),
                      }}
                    >
                      {activeRelease.riskLevel}{' '}
                      RISK
                    </span>
                  </div>

                  <p
                    style={{
                      fontSize: '11px',
                      color:
                        'var(--text-secondary)',
                      marginTop: '4px',
                    }}
                  >
                    {activeRelease.description}
                  </p>
                </div>
              </div>

              {Array.isArray(
                activeRelease.factorContributions
              ) &&
                activeRelease
                  .factorContributions.length >
                  0 && (
                  <div
                    style={{
                      marginTop:
                        'var(--space-4)',
                      display: 'flex',
                      flexDirection:
                        'column',
                      gap: 'var(--space-2)',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color:
                          'var(--text-secondary)',
                      }}
                    >
                      RISK CONTRIBUTION FACTORS
                    </div>

                    {activeRelease.factorContributions.map(
                      (factor) => (
                        <div
                          key={factor.id}
                          style={{
                            padding:
                              '8px var(--space-3)',
                            backgroundColor:
                              'var(--bg-tertiary)',
                            borderRadius:
                              'var(--border-radius-md)',
                            display: 'flex',
                            justifyContent:
                              'space-between',
                            gap: '8px',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '11px',
                            }}
                          >
                            {factor.label}
                          </span>

                          <span className="badge badge-amber">
                            +{factor.riskWeight} pts
                          </span>
                        </div>
                      )
                    )}
                  </div>
                )}
            </div>
          )}

          {/* Audit */}
          <div className="nexus-card">
            <div className="card-header">
              <div className="card-title">
                <Cpu
                  size={16}
                  style={{
                    color: 'var(--color-cyan)',
                  }}
                />
                AI Triage & Security Audit Log
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-3)',
                maxHeight: '300px',
                overflowY: 'auto',
              }}
            >
              {safeAuditLogs.length === 0 ? (
                <div
                  style={{
                    fontSize: '12px',
                    color:
                      'var(--text-muted)',
                  }}
                >
                  No audit events available.
                </div>
              ) : (
                safeAuditLogs.map((log) => (
                  <div
                    key={log.id}
                    style={{
                      paddingBottom: '8px',
                      borderBottom:
                        '1px solid var(--border-color)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent:
                          'space-between',
                        alignItems:
                          'center',
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
                        }}
                      >
                        {new Date(
                          log.timestamp
                        ).toLocaleTimeString()}
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop: '5px',
                        fontSize: '12px',
                        fontWeight: 500,
                      }}
                    >
                      {log.action}
                    </div>

                    <div
                      style={{
                        fontSize: '10px',
                        color:
                          'var(--text-secondary)',
                        marginTop: '2px',
                      }}
                    >
                      Operator: {log.actor}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

