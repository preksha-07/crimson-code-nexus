import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Users,
  History,
  Calendar,
  ArrowLeft,
  Activity,
  Compass,
  PlusCircle,
} from 'lucide-react';
import { getProjects, getProjectById } from '../lib/api/projects';
import { getIssues } from '../lib/api/issues';
import { getReleases, type Release } from '../lib/api/releases';
import type { Project } from '../types/project';
import type { Issue } from '../types/issue';

export default function ProjectOverviewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadProjectData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [fetchedProjects, fetchedIssues, fetchedReleases] = await Promise.all([
          getProjects(),
          getIssues(),
          getReleases().catch(() => [] as Release[]),
        ]);

        if (!mounted) return;

        setAllProjects(fetchedProjects);
        setIssues(fetchedIssues);
        setReleases(fetchedReleases);

        let currentProj: Project | null = null;
        if (projectId) {
          currentProj = fetchedProjects.find(
            (p) => p.id === projectId || (p.key && p.key.toLowerCase() === projectId.toLowerCase())
          ) ?? null;

          if (!currentProj) {
            try {
              currentProj = await getProjectById(projectId);
            } catch {
              currentProj = null;
            }
          }
        } else {
          currentProj =
            fetchedProjects.find((p) => p.id === 'proj_01') ??
            fetchedProjects.find((p) => p.key?.toUpperCase() === 'NEX') ??
            fetchedProjects.find((p) => fetchedIssues.some((i) => i.projectId === p.id)) ??
            fetchedProjects[0] ??
            null;
        }

        setProject(currentProj);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Unable to load project telemetry.');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadProjectData();

    return () => {
      mounted = false;
    };
  }, [projectId]);

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
          <div className="card-title">Loading Project Overview...</div>
        </div>
      </div>
    );
  }

  if (error || !project) {
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
          {error ? 'Telemetry Error' : 'Project Not Found'}
        </h3>

        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: '13px',
            marginBottom: 'var(--space-4)',
          }}
        >
          {error || 'The requested project does not exist in the NEXUS system.'}
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

  const projectIssues = issues.filter(
    (issue) => issue.projectId === project.id
  );

  const projectReleases = releases.filter(
    (rel) => rel.projectId === project.id
  );

  const activeIssues = projectIssues.filter((issue) => issue.status !== 'CLOSED');
  const criticalIssues = activeIssues.filter((issue) => issue.severity === 'CRITICAL');
  const securityIssues = activeIssues.filter((issue) => issue.visibility !== 'PUBLIC');
  const verifiedFixes = projectIssues.filter((issue) => issue.status === 'VERIFIED');

  const membersList = project.members || [];
  const activityList = project.recentActivity || [];

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
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <button
            onClick={() => navigate('/')}
            className="btn btn-secondary"
            style={{ padding: '6px 10px' }}
          >
            <ArrowLeft size={14} />
            Back
          </button>

          <span style={{ color: 'var(--text-muted)' }}>/ Projects /</span>

          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
            {project.name}
          </span>
        </div>

        {allProjects.length > 1 && (
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Switch Project:</span>
            {allProjects.map((p) => (
              <button
                key={p.id}
                onClick={() => navigate(`/projects/${p.id}`)}
                className={`btn ${p.id === project.id ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '4px 8px', fontSize: '11px' }}
              >
                {p.key || p.name}
              </button>
            ))}
          </div>
        )}
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
            <span className="badge badge-cyan" style={{ padding: '4px 8px' }}>
              Active Ingest
            </span>

            <span className="badge badge-slate" style={{ padding: '4px 8px' }}>
              ID: {project.id}
            </span>
          </div>
        </div>

        {/* Quick Stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 'var(--space-4)',
            marginTop: 'var(--space-6)',
            paddingTop: 'var(--space-6)',
            borderTop: '1px solid var(--border-color)',
          }}
        >
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Active Ingests
            </span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
              {activeIssues.length}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Critical Bugs
            </span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-ruby)', marginTop: '2px' }}>
              {criticalIssues.length}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Security Findings
            </span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-indigo)', marginTop: '2px' }}>
              {securityIssues.length}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Verified Fixes
            </span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-emerald)', marginTop: '2px' }}>
              {verifiedFixes.length}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 3fr) minmax(280px, 2fr)',
          gap: 'var(--space-6)',
        }}
      >
        {/* LEFT COLUMN: Issues Table */}
        <div className="nexus-card">
          <div className="card-header">
            <div className="card-title">
              <Compass size={16} style={{ color: 'var(--color-cyan)' }} />
              Project Bug Ledger
            </div>

            <Link
              to="/issues/create"
              className="btn btn-primary"
              style={{ padding: '4px 8px', fontSize: '11px' }}
            >
              <PlusCircle size={12} />
              Log New Bug
            </Link>
          </div>

          <div className="nexus-table-wrapper" style={{ overflowX: 'auto' }}>
            <table className="nexus-table">
              <thead>
                <tr>
                  <th>Bug ID</th>
                  <th>Vulnerability Title</th>
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
                        padding: 'var(--space-8)',
                        color: 'var(--text-muted)',
                      }}
                    >
                      No issues registered for this project.
                    </td>
                  </tr>
                ) : (
                  projectIssues.map((issue) => (
                    <tr
                      key={issue.id}
                      onClick={() => navigate(`/issues/${encodeURIComponent(issue.id)}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 600,
                          fontSize: '12px',
                          color: issue.severity === 'CRITICAL' ? 'var(--color-ruby)' : 'var(--color-cyan)',
                        }}
                      >
                        {issue.id}
                      </td>

                      <td>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                          {issue.title}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Env: {issue.environment || 'production'}
                        </div>
                      </td>

                      <td>
                        <span className="badge badge-slate">{issue.component || 'core'}</span>
                      </td>

                      <td>
                        <span
                          className={`badge ${
                            issue.severity === 'CRITICAL' || issue.severity === 'HIGH'
                              ? 'badge-ruby'
                              : issue.severity === 'MEDIUM'
                              ? 'badge-amber'
                              : 'badge-cyan'
                          }`}
                        >
                          {issue.severity}
                        </span>
                      </td>

                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                        {issue.priority}
                      </td>

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

        {/* RIGHT COLUMN: Side Panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Target Releases */}
          <div className="nexus-card">
            <div className="card-header">
              <div className="card-title">
                <Calendar size={16} style={{ color: 'var(--color-cyan)' }} />
                Target Releases
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {projectReleases.length === 0 ? (
                <div style={{ padding: 'var(--space-3)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>
                  No active releases tracked.
                </div>
              ) : (
                projectReleases.map((rel) => (
                  <div
                    key={rel.id}
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
                      <div style={{ fontWeight: 600, fontSize: '13px' }}>
                        {rel.name} (v{rel.version})
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Target: {rel.targetDate || 'Unscheduled'}
                      </div>
                    </div>

                    <span
                      className={`badge ${
                        rel.status === 'IN_PROGRESS'
                          ? 'badge-amber'
                          : rel.status === 'RELEASED'
                          ? 'badge-emerald'
                          : 'badge-slate'
                      }`}
                    >
                      {rel.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Members */}
          <div className="nexus-card">
            <div className="card-header">
              <div className="card-title">
                <Users size={16} style={{ color: 'var(--color-cyan)' }} />
                Security & Dev Operators
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {membersList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-3)', color: 'var(--text-muted)', fontSize: '11px' }}>
                  Project membership telemetry unavailable.
                </div>
              ) : (
                membersList.map((member) => (
                  <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: '12px' }}>
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
                      {member.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{member.name}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{member.role}</div>
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
                <History size={16} style={{ color: 'var(--color-cyan)' }} />
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
              {activityList.length === 0 ? (
                <div style={{ padding: 'var(--space-3)', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No recent operator events recorded.
                </div>
              ) : (
                activityList.map((log, index) => (
                  <div
                    key={`${index}-${log}`}
                    style={{
                      paddingBottom: '6px',
                      borderBottom: '1px solid var(--border-color)',
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
