import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Users,
  History,
  Calendar,
  BarChart2,
  ArrowLeft,
} from 'lucide-react';
import { getDb } from '../lib/api/client';

export default function ProjectOverviewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [db, setDb] = useState<any>(() => getDb());

  useEffect(() => {
    const handleDbUpdate = () => {
      setDb(getDb());
    };

    window.addEventListener('nexus_db_updated', handleDbUpdate);

    return () => {
      window.removeEventListener('nexus_db_updated', handleDbUpdate);
    };
  }, []);

  /*
   * Find the requested project.
   * Do not silently fall back to another project when projectId is invalid.
   */
  const project = projectId
    ? db.projects.find((p) => p.id === projectId)
    : undefined;

  if (!project) {
    return (
      <div
        className="nexus-card"
        style={{
          padding: 'var(--space-8)',
          textAlign: 'center',
        }}
      >
        <h3
          style={{
            color: 'var(--text-primary)',
            marginBottom: 'var(--space-2)',
          }}
        >
          Project Not Found
        </h3>

        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: '13px',
            marginBottom: 'var(--space-4)',
          }}
        >
          The requested project does not exist in the local NEXUS telemetry
          database.
        </p>

        <button
          onClick={() => navigate('/')}
          className="btn btn-secondary"
        >
          <ArrowLeft size={14} />
          Back to Control Room
        </button>
      </div>
    );
  }

  /*
   * Project issue association.
   *
   * Current NEXUS demo project:
   * nexus-core
   *
   * These components are treated as belonging to this project.
   */
  const nexusCoreComponents = [
    'auth-middleware',
    'database-schema',
    'query-processor',
    'container-specs',
  ];

  const projectIssues = db.issues.filter((issue) => {
    if (project.id === 'nexus-core') {
      return nexusCoreComponents.includes(issue.component);
    }

    return false;
  });

  const activeIssues = projectIssues.filter(
    (issue) => issue.status !== 'CLOSED'
  );

  const criticalIssues = activeIssues.filter(
    (issue) => issue.severity === 'CRITICAL'
  );

  const securityIssues = activeIssues.filter(
    (issue) => issue.visibility !== 'PUBLIC'
  );

  const verifiedFixes = projectIssues.filter(
    (issue) => issue.status === 'VERIFIED'
  );

  return (
    <div
      className="fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-6)',
      }}
    >
      {/* Header breadcrumb */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={() => navigate('/')}
          className="btn btn-secondary"
          style={{
            padding: '6px 10px',
          }}
        >
          <ArrowLeft size={14} />
          Back
        </button>

        <span style={{ color: 'var(--text-muted)' }}>
          / Projects /
        </span>

        <span
          style={{
            color: 'var(--text-primary)',
            fontWeight: 600,
          }}
        >
          {project.name}
        </span>
      </div>

      {/* Hero Section */}
      <div
        className="nexus-card nexus-card-cyber"
        style={{
          padding: 'var(--space-6)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 'var(--space-4)',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '22px',
                fontWeight: 700,
                color: 'var(--text-primary)',
              }}
            >
              {project.name}
            </h1>

            <p
              style={{
                color: 'var(--text-secondary)',
                marginTop: '8px',
                maxWidth: '800px',
                fontSize: '13px',
                lineHeight: '1.5',
              }}
            >
              {project.description}
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 'var(--space-2)',
              flexWrap: 'wrap',
            }}
          >
            <span
              className="badge badge-cyan"
              style={{
                padding: '4px 8px',
              }}
            >
              Active Ingest
            </span>

            <span
              className="badge badge-slate"
              style={{
                padding: '4px 8px',
              }}
            >
              ID: {project.id}
            </span>
          </div>
        </div>

        {/* Quick Stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 'var(--space-4)',
            marginTop: 'var(--space-6)',
            paddingTop: 'var(--space-6)',
            borderTop: '1px solid var(--border-color)',
          }}
        >
          {/* Active Ingests */}
          <div>
            <span
              style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
              }}
            >
              Active Ingests
            </span>

            <div
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginTop: '2px',
              }}
            >
              {activeIssues.length}
            </div>
          </div>

          {/* Critical Bugs */}
          <div>
            <span
              style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
              }}
            >
              Critical Bugs
            </span>

            <div
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: 'var(--color-ruby)',
                marginTop: '2px',
              }}
            >
              {criticalIssues.length}
            </div>
          </div>

          {/* Security Issues */}
          <div>
            <span
              style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
              }}
            >
              Security Issues
            </span>

            <div
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: 'var(--color-indigo)',
                marginTop: '2px',
              }}
            >
              {securityIssues.length}
            </div>
          </div>

          {/* Verified Fixes */}
          <div>
            <span
              style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
              }}
            >
              Verified Fixes
            </span>

            <div
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: 'var(--color-emerald)',
                marginTop: '2px',
              }}
            >
              {verifiedFixes.length}
            </div>
          </div>

          {/* Tracked Releases */}
          <div>
            <span
              style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
              }}
            >
              Tracked Releases
            </span>

            <div
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: 'var(--color-cyan)',
                marginTop: '2px',
              }}
            >
              {project.activeReleases.length}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '7fr 3fr',
          gap: 'var(--space-6)',
        }}
      >
        {/* LEFT COLUMN */}
        <div className="nexus-card">
          <div className="card-header">
            <div className="card-title">
              <BarChart2
                size={16}
                style={{
                  color: 'var(--color-cyan)',
                }}
              />
              Project Component Ingests
            </div>
          </div>

          <div className="nexus-table-wrapper">
            <table className="nexus-table">
              <thead>
                <tr>
                  <th>Bug ID</th>
                  <th>Title</th>
                  <th>Component</th>
                  <th>Severity</th>
                  <th>Priority</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {projectIssues.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        textAlign: 'center',
                        padding: 'var(--space-6)',
                        color: 'var(--text-muted)',
                        fontSize: '12px',
                      }}
                    >
                      No component ingests recorded for this project.
                    </td>
                  </tr>
                ) : (
                  projectIssues.map((issue) => (
                    <tr
                      key={issue.id}
                      style={{
                        cursor: 'pointer',
                      }}
                      onClick={() =>
                        navigate(`/issues/${issue.id}`)
                      }
                    >
                      {/* Bug ID */}
                      <td
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 600,
                          fontSize: '12px',
                          color: 'var(--color-cyan)',
                        }}
                      >
                        {issue.id}
                      </td>

                      {/* Title */}
                      <td>
                        <div
                          style={{
                            fontWeight: 500,
                            color: 'var(--text-primary)',
                          }}
                        >
                          {issue.title}
                        </div>

                        <div
                          style={{
                            fontSize: '10px',
                            color: 'var(--text-muted)',
                            marginTop: '2px',
                          }}
                        >
                          Env: {issue.environment}
                        </div>
                      </td>

                      {/* Component */}
                      <td>
                        <span className="badge badge-slate">
                          {issue.component}
                        </span>
                      </td>

                      {/* Severity */}
                      <td>
                        <span
                          className={`badge ${
                            issue.severity === 'CRITICAL'
                              ? 'badge-ruby'
                              : issue.severity === 'HIGH'
                              ? 'badge-ruby'
                              : issue.severity === 'MEDIUM'
                              ? 'badge-amber'
                              : 'badge-cyan'
                          }`}
                        >
                          {issue.severity}
                        </span>
                      </td>

                      {/* Priority */}
                      <td
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '12px',
                        }}
                      >
                        {issue.priority}
                      </td>

                      {/* Status */}
                      <td>
                        <span
                          className={`badge ${
                            issue.status === 'VERIFIED'
                              ? 'badge-emerald'
                              : issue.status === 'CLOSED'
                              ? 'badge-slate'
                              : issue.status === 'REPORTED'
                              ? 'badge-cyan'
                              : 'badge-amber'
                          }`}
                        >
                          {issue.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-6)',
          }}
        >
          {/* Releases */}
          <div className="nexus-card">
            <div className="card-header">
              <div className="card-title">
                <Calendar
                  size={16}
                  style={{
                    color: 'var(--color-cyan)',
                  }}
                />
                Target Releases
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-2)',
              }}
            >
              {project.activeReleases.length === 0 ? (
                <div
                  style={{
                    padding: 'var(--space-3)',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '11px',
                  }}
                >
                  No active releases tracked.
                </div>
              ) : (
                project.activeReleases.map((version) => {
                  /*
                   * Demo risk classification.
                   * v2.4.0 is currently treated as the critical release.
                   */
                  const isCriticalRelease = version === 'v2.4.0';

                  return (
                    <div
                      key={version}
                      style={{
                        padding: 'var(--space-3)',
                        backgroundColor: 'var(--bg-tertiary)',
                        borderRadius: 'var(--border-radius-md)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 'var(--space-3)',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: '13px',
                          }}
                        >
                          {version}
                        </div>

                        <div
                          style={{
                            fontSize: '10px',
                            color: 'var(--text-muted)',
                            marginTop: '2px',
                          }}
                        >
                          {isCriticalRelease
                            ? 'Critical security audit pending'
                            : 'Patch release verified'}
                        </div>
                      </div>

                      <span
                        className={`badge ${
                          isCriticalRelease
                            ? 'badge-ruby'
                            : 'badge-emerald'
                        }`}
                      >
                        {isCriticalRelease
                          ? 'CRITICAL RISK'
                          : 'LOW RISK'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Members */}
          <div className="nexus-card">
            <div className="card-header">
              <div className="card-title">
                <Users
                  size={16}
                  style={{
                    color: 'var(--color-cyan)',
                  }}
                />
                Security & Dev Operators
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-3)',
              }}
            >
              {project.members.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: 'var(--space-3)',
                    color: 'var(--text-muted)',
                    fontSize: '11px',
                  }}
                >
                  No project members assigned.
                </div>
              ) : (
                project.members.map((member) => (
                  <div
                    key={member.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-2)',
                      fontSize: '12px',
                    }}
                  >
                    {/* Avatar */}
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 600,
                        fontSize: '10px',
                        color: 'var(--color-cyan)',
                        flexShrink: 0,
                      }}
                    >
                      {member.name
                        .split(' ')
                        .filter(Boolean)
                        .map((name) => name[0])
                        .join('')
                        .toUpperCase()}
                    </div>

                    {/* Member details */}
                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                        }}
                      >
                        {member.name}
                      </div>

                      <div
                        style={{
                          fontSize: '10px',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {member.role}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="nexus-card">
            <div className="card-header">
              <div className="card-title">
                <History
                  size={16}
                  style={{
                    color: 'var(--color-cyan)',
                  }}
                />
                Operator Event Log
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-3)',
                maxHeight: '200px',
                overflowY: 'auto',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {project.recentActivity.length === 0 ? (
                <div
                  style={{
                    padding: 'var(--space-3)',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                  }}
                >
                  No recent operator events.
                </div>
              ) : (
                project.recentActivity.map((log, index) => (
                  <div
                    key={`${index}-${log}`}
                    style={{
                      paddingBottom: '6px',
                      borderBottom:
                        '1px solid var(--border-color)',
                      color: 'var(--text-secondary)',
                      lineHeight: '1.4',
                    }}
                  >
                    {log}
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
