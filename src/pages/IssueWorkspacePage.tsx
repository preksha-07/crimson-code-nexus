import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  MessageSquare,
  Paperclip,
  Send,
  Loader2,
  Lock,
  Cpu,
  Layers,
  Terminal,
  ShieldCheck,
} from 'lucide-react';

import {
  getIssueById,
  addComment,
  updateIssueStatus,
  getComments,
  getAttachments,
  getDependencies,
} from '../lib/api/issues';

import {
  getBugDna,
  getAiTriage,
  getRelatedIssues,
  getCausalGraph,
  getReproductionCapsule,
  getResolutionConfidence,
} from '../lib/api/intelligence';

import type {
  Issue,
  IssueStatus,
} from '../types/issue';

import type {
  BugDNA as DnaType,
  AITriage,
  RelatedIssue,
  CausalGraph,
  ReproductionCapsule as CapType,
  ResolutionConfidence as ConfType,
} from '../types/intelligence';

import BugDNA from '../features/intelligence/BugDNA';
import AIAnalysis from '../features/intelligence/AIAnalysis';
import RelatedIssues from '../features/intelligence/RelatedIssues';
import CausalBugGraph from '../features/intelligence/CausalBugGraph';
import ReproductionCapsule from '../features/intelligence/ReproductionCapsule';
import ResolutionConfidence from '../features/intelligence/ResolutionConfidence';

import SecretSentinel from '../features/security/SecretSentinel';
import { runSecretSentinelScanner } from '../lib/api/security';

const WORKFLOW_STATES: IssueStatus[] = [
  'REPORTED',
  'TRIAGED',
  'ASSIGNED',
  'IN_PROGRESS',
  'CODE_REVIEW',
  'TESTING',
  'RESOLVED',
  'VERIFIED',
  'CLOSED',
];

type WorkspaceTab =
  | 'triage'
  | 'graph'
  | 'reproduction'
  | 'confidence';

const VALID_TABS: WorkspaceTab[] = [
  'triage',
  'graph',
  'reproduction',
  'confidence',
];

export default function IssueWorkspacePage() {
  const { issueId } = useParams<{ issueId: string }>();
  const navigate = useNavigate();

  // ---------------------------------------------------------
  // Issue + Intelligence state
  // ---------------------------------------------------------

  const [issue, setIssue] = useState<Issue | null>(null);

  const [bugDna, setBugDna] =
    useState<DnaType | null>(null);

  const [aiTriage, setAiTriage] =
    useState<AITriage | null>(null);

  const [relations, setRelations] =
    useState<RelatedIssue[]>([]);

  const [causalGraph, setCausalGraph] =
    useState<CausalGraph | null>(null);

  const [capsule, setCapsule] =
    useState<CapType | null>(null);

  const [confidence, setConfidence] =
    useState<ConfType | null>(null);

  // ---------------------------------------------------------
  // UI state
  // ---------------------------------------------------------

  const [activeTab, setActiveTab] =
    useState<WorkspaceTab>('triage');

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  // ---------------------------------------------------------
  // Comment state
  // ---------------------------------------------------------

  const [newComment, setNewComment] =
    useState('');

  const [commentSecretsWarning, setCommentSecretsWarning] =
    useState(false);

  const [isAddingComment, setIsAddingComment] =
    useState(false);

  // ---------------------------------------------------------
  // Status state
  // ---------------------------------------------------------

  const [isUpdatingStatus, setIsUpdatingStatus] =
    useState(false);

  // ---------------------------------------------------------
  // Fetch complete workspace data
  // ---------------------------------------------------------

  const fetchData = async () => {
    if (!issueId) {
      setError('No issue ID was provided.');
      setIsLoading(false);
      return;
    }

    try {
      setError(null);

      const [item, comments, attachments, dependencies] = await Promise.all([
        getIssueById(issueId),
        getComments(issueId),
        getAttachments(issueId),
        getDependencies(issueId),
      ]);

      if (!item) {
        setIssue(null);
        setIsLoading(false);
        return;
      }

      item.comments = comments;
      item.attachments = attachments;
      item.dependencies = dependencies;

      setIssue(item);

      // Load intelligence data in parallel.
      const [
        dnaData,
        triageData,
        relatedData,
        graphData,
        capsuleData,
        confidenceData,
      ] = await Promise.all([
        getBugDna(issueId),
        getAiTriage(issueId),
        getRelatedIssues(issueId),
        getCausalGraph(issueId),
        getReproductionCapsule(issueId),
        getResolutionConfidence(issueId),
      ]);

      setBugDna(dnaData);
      setAiTriage(triageData);
      setRelations(relatedData);
      setCausalGraph(graphData);
      setCapsule(capsuleData);
      setConfidence(confidenceData);
    } catch (err) {
      console.error('Failed to load issue workspace:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load issue workspace.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------
  // Initial load + database events
  // ---------------------------------------------------------

  useEffect(() => {
    setIsLoading(true);
    fetchData();

    const handleDbUpdate = () => {
      fetchData();
    };

    window.addEventListener(
      'nexus_db_updated',
      handleDbUpdate
    );

    // Demo controller tab switching
    const handleSwitchTab = (event: Event) => {
      const customEvent =
        event as CustomEvent<unknown>;

      const tab = customEvent.detail;

      if (tab === 'relations') {
        setActiveTab('graph');
        return;
      }

      if (
        typeof tab === 'string' &&
        VALID_TABS.includes(tab as WorkspaceTab)
      ) {
        setActiveTab(tab as WorkspaceTab);
      }
    };

    window.addEventListener(
      'switch_workspace_tab',
      handleSwitchTab
    );

    return () => {
      window.removeEventListener(
        'nexus_db_updated',
        handleDbUpdate
      );

      window.removeEventListener(
        'switch_workspace_tab',
        handleSwitchTab
      );
    };
  }, [issueId]);

  // ---------------------------------------------------------
  // Secret Sentinel live comment scanner
  // ---------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    const checkComment = async () => {
      if (!newComment.trim()) {
        setCommentSecretsWarning(false);
        return;
      }

      try {
        const scan =
          await runSecretSentinelScanner(
            newComment
          );

        if (!cancelled) {
          setCommentSecretsWarning(
            scan.hasSecrets
          );
        }
      } catch (err) {
        console.error(
          'Secret Sentinel comment scan failed:',
          err
        );

        if (!cancelled) {
          setCommentSecretsWarning(false);
        }
      }
    };

    const debounceTimer = window.setTimeout(
      checkComment,
      150
    );

    return () => {
      cancelled = true;
      window.clearTimeout(debounceTimer);
    };
  }, [newComment]);

  // ---------------------------------------------------------
  // Change workflow status
  // ---------------------------------------------------------

  const handleStatusChange = async (
    status: IssueStatus
  ) => {
    if (!issueId || isUpdatingStatus) {
      return;
    }

    try {
      setIsUpdatingStatus(true);
      setError(null);

      await updateIssueStatus(
        issueId,
        status
      );

      await fetchData();
    } catch (err) {
      console.error(
        'Failed to update issue status:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to update issue status.'
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // ---------------------------------------------------------
  // Post comment
  // ---------------------------------------------------------

  const handlePostComment = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (
      !issueId ||
      !newComment.trim() ||
      isAddingComment
    ) {
      return;
    }

    try {
      setIsAddingComment(true);
      setError(null);

      const scan =
        await runSecretSentinelScanner(
          newComment
        );

      const isSensitive =
        scan.hasSecrets;

      await addComment(
        issueId,
        { content: newComment, isSecuritySensitive: isSensitive }
      );

      setNewComment('');
      setCommentSecretsWarning(false);

      await fetchData();
    } catch (err) {
      console.error(
        'Failed to add comment:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to add comment.'
      );
    } finally {
      setIsAddingComment(false);
    }
  };

  // ---------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------

  if (isLoading) {
    return (
      <div
        className="fade-in"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '300px',
        }}
      >
        <div
          className="nexus-card"
          style={{
            padding: 'var(--space-8)',
            textAlign: 'center',
          }}
        >
          <Loader2
            size={28}
            className="animate-spin"
            style={{
              color: 'var(--color-cyan)',
              margin: '0 auto var(--space-3)',
            }}
          />

          <div
            style={{
              color: 'var(--text-primary)',
              fontWeight: 600,
              fontSize: '14px',
            }}
          >
            Loading Intelligence Workspace...
          </div>

          <div
            style={{
              color: 'var(--text-muted)',
              fontSize: '11px',
              marginTop: '4px',
            }}
          >
            Synchronizing issue telemetry and
            intelligence modules.
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // Error state
  // ---------------------------------------------------------

  if (error && !issue) {
    return (
      <div
        className="fade-in"
        style={{
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div
          className="nexus-card"
          style={{
            padding: 'var(--space-8)',
            textAlign: 'center',
            maxWidth: '500px',
            width: '100%',
          }}
        >
          <h3
            style={{
              color: 'var(--text-primary)',
              marginBottom: 'var(--space-3)',
            }}
          >
            Unable to Load Workspace
          </h3>

          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: '12px',
              marginBottom: 'var(--space-4)',
            }}
          >
            {error}
          </p>

          <button
            onClick={() => navigate('/')}
            className="btn btn-secondary"
          >
            Return to Control Room
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // Issue not found
  // ---------------------------------------------------------

  if (!issue) {
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
          }}
        >
          Ingest Record Not Found
        </h3>

        <p
          style={{
            color: 'var(--text-secondary)',
            margin: 'var(--space-4) 0',
            fontSize: '12px',
          }}
        >
          The requested Bug ID does not exist
          in local telemetry files.
        </p>

        <button
          onClick={() => navigate('/')}
          className="btn btn-secondary"
        >
          Return to Control Room
        </button>
      </div>
    );
  }

  const isCritical =
    issue.severity === 'CRITICAL';

  const attachments =
    issue.attachments ?? [];

  const comments =
    issue.comments ?? [];

  const currentStatusIndex =
    WORKFLOW_STATES.indexOf(
      issue.status
    );

  // ---------------------------------------------------------
  // Main workspace
  // ---------------------------------------------------------

  return (
    <div
      className="fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-6)',
      }}
    >
      {/* Error banner */}
      {error && (
        <div
          className="nexus-card-ruby"
          style={{
            padding: 'var(--space-3)',
            fontSize: '12px',
          }}
        >
          <strong>
            Workspace Error:
          </strong>{' '}
          {error}
        </div>
      )}

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-4)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
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
            Control Room
          </button>

          <span
            style={{
              color: 'var(--text-muted)',
            }}
          >
            / Ingests /
          </span>

          <span
            style={{
              fontFamily: 'var(--font-mono)',
              color: 'var(--color-cyan)',
              fontWeight: 600,
            }}
          >
            {issue.id}
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            flexWrap: 'wrap',
          }}
        >
          {issue.visibility !== 'PUBLIC' && (
            <span
              className="badge badge-indigo"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
              }}
            >
              <Lock size={10} />
              Visibility: {issue.visibility}
            </span>
          )}

          <span
            className={`badge ${
              isCritical
                ? 'badge-ruby'
                : 'badge-amber'
            }`}
            style={{
              padding: '4px 8px',
            }}
          >
            {issue.severity} Severity
          </span>

          <span
            className="badge badge-slate"
            style={{
              padding: '4px 8px',
            }}
          >
            Priority: {issue.priority}
          </span>
        </div>
      </div>

      {/* Workflow tracker */}
      <div
        className="nexus-card"
        style={{
          padding: 'var(--space-3)',
        }}
      >
        <div
          style={{
            fontSize: '10px',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            marginBottom: '8px',
            fontWeight: 600,
          }}
        >
          Telemetry Workflow Pipeline State
          Transitions (Click to change status):
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4px',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {WORKFLOW_STATES.map(
            (state, index) => {
              const isCurrent =
                issue.status === state;

              const isCompleted =
                currentStatusIndex >= index;

              const isFinalState =
                state === 'VERIFIED' ||
                state === 'CLOSED';

              let color =
                'var(--text-muted)';

              let border =
                'var(--border-color)';

              let background =
                'transparent';

              if (isCurrent) {
                background = isFinalState
                  ? 'var(--color-emerald-glow)'
                  : 'var(--color-cyan-glow)';

                border = isFinalState
                  ? 'var(--color-emerald)'
                  : 'var(--color-cyan)';

                color = isFinalState
                  ? 'var(--color-emerald)'
                  : 'var(--color-cyan)';
              } else if (isCompleted) {
                color =
                  'var(--text-primary)';
              }

              return (
                <button
                  key={state}
                  type="button"
                  onClick={() =>
                    handleStatusChange(state)
                  }
                  disabled={
                    isUpdatingStatus
                  }
                  className="btn"
                  style={{
                    padding: '4px 8px',
                    fontSize: '10px',
                    fontFamily:
                      'var(--font-mono)',
                    backgroundColor:
                      background,
                    borderColor: border,
                    color,
                    cursor:
                      isUpdatingStatus
                        ? 'not-allowed'
                        : 'pointer',
                    flex: '1',
                    minWidth: '90px',
                    justifyContent:
                      'center',
                    fontWeight: isCurrent
                      ? 'bold'
                      : 'normal',
                    transition:
                      'all var(--transition-fast)',
                    opacity:
                      isUpdatingStatus
                        ? 0.6
                        : 1,
                  }}
                >
                  {isUpdatingStatus &&
                  isCurrent ? (
                    <Loader2
                      size={11}
                      className="animate-spin"
                    />
                  ) : null}

                  {state}
                </button>
              );
            }
          )}
        </div>
      </div>

      {/* Main two-column workspace */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            '4fr 6fr',
          gap: 'var(--space-6)',
          alignItems: 'start',
        }}
      >
        {/* =====================================================
            LEFT COLUMN
        ====================================================== */}

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-6)',
          }}
        >
          {/* Issue information */}
          <div
            className="nexus-card"
            style={{
              borderLeft: isCritical
                ? '3px solid var(--color-ruby)'
                : '3px solid var(--border-color)',
            }}
          >
            <h2
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom:
                  'var(--space-2)',
              }}
            >
              {issue.title}
            </h2>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 'var(--space-3)',
                fontSize: '11px',
                color:
                  'var(--text-secondary)',
                marginBottom:
                  'var(--space-4)',
              }}
            >
              <span>
                Reporter:{' '}
                <strong>
                  {issue.reporter}
                </strong>
              </span>

              <span>ΓÇó</span>

              <span>
                Component:{' '}
                <strong
                  className="badge badge-slate"
                  style={{
                    fontSize: '9px',
                    padding: '0px 4px',
                  }}
                >
                  {issue.component}
                </strong>
              </span>

              <span>ΓÇó</span>

              <span>
                Version:{' '}
                <strong>
                  {issue.version}
                </strong>
              </span>
            </div>

            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color:
                  'var(--text-muted)',
                textTransform: 'uppercase',
                marginBottom: '6px',
              }}
            >
              Telemetry Description:
            </div>

            <div
              style={{
                padding:
                  'var(--space-3)',
                backgroundColor:
                  'var(--bg-primary)',
                border:
                  '1px solid var(--border-color)',
                borderRadius:
                  'var(--border-radius-md)',
                fontSize: '12.5px',
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily:
                  'var(--font-sans)',
                color:
                  'var(--text-primary)',
              }}
            >
              {issue.description}
            </div>
          </div>

          {/* Evidence */}
          <div className="nexus-card">
            <div className="card-header">
              <div className="card-title">
                <Paperclip
                  size={14}
                  style={{
                    color:
                      'var(--color-cyan)',
                  }}
                />
                Verification Evidence &
                Logs
              </div>
            </div>

            {attachments.length === 0 ? (
              <div
                style={{
                  fontSize: '11px',
                  color:
                    'var(--text-muted)',
                  padding:
                    'var(--space-2)',
                  textAlign: 'center',
                }}
              >
                No external logs or
                package attachments
                verified.
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection:
                    'column',
                  gap: 'var(--space-2)',
                }}
              >
                {attachments.map(
                  (attachment) => (
                    <div
                      key={attachment.id}
                      style={{
                        padding:
                          '8px var(--space-3)',
                        backgroundColor:
                          'var(--bg-tertiary)',
                        border:
                          '1px solid var(--border-color)',
                        borderRadius:
                          'var(--border-radius-md)',
                        display: 'flex',
                        justifyContent:
                          'space-between',
                        alignItems:
                          'center',
                        fontSize: '12px',
                        gap: 'var(--space-3)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems:
                            'center',
                          gap: 'var(--space-2)',
                          minWidth: 0,
                        }}
                      >
                        <span
                          className="badge badge-cyan"
                          style={{
                            fontSize: '8px',
                            padding:
                              '1px 3px',
                            flexShrink: 0,
                          }}
                        >
                          {attachment.type}
                        </span>

                        <strong
                          style={{
                            color:
                              'var(--text-primary)',
                            overflow:
                              'hidden',
                            textOverflow:
                              'ellipsis',
                          }}
                        >
                          {attachment.name}
                        </strong>

                        <span
                          style={{
                            color:
                              'var(--text-muted)',
                            fontSize: '10px',
                            flexShrink: 0,
                          }}
                        >
                          ({attachment.size})
                        </span>
                      </div>

                      <span
                        style={{
                          fontSize: '10px',
                          color:
                            'var(--text-muted)',
                          flexShrink: 0,
                        }}
                      >
                        Uploaded:{' '}
                        {attachment.uploadedBy}
                      </span>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          {/* Comments */}
          <div className="nexus-card">
            <div className="card-header">
              <div className="card-title">
                <MessageSquare
                  size={14}
                  style={{
                    color:
                      'var(--color-cyan)',
                  }}
                />
                Operator Comment Log
                Thread
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection:
                  'column',
                gap: 'var(--space-3)',
                marginBottom:
                  'var(--space-4)',
                maxHeight: '220px',
                overflowY: 'auto',
                paddingRight: '4px',
              }}
            >
              {comments.length === 0 ? (
                <div
                  style={{
                    padding:
                      'var(--space-2)',
                    textAlign: 'center',
                    color:
                      'var(--text-muted)',
                    fontSize: '12px',
                  }}
                >
                  No operator commentary
                  recorded on this
                  ticket.
                </div>
              ) : (
                comments.map(
                  (comment) => (
                    <div
                      key={comment.id}
                      style={{
                        padding:
                          '8px var(--space-3)',
                        backgroundColor:
                          'var(--bg-tertiary)',
                        borderRadius:
                          'var(--border-radius-md)',
                        border:
                          '1px solid var(--border-color)',
                        fontSize: '12px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent:
                            'space-between',
                          alignItems:
                            'center',
                          gap: 'var(--space-2)',
                          color:
                            'var(--text-secondary)',
                          fontSize: '10px',
                          marginBottom:
                            '4px',
                        }}
                      >
                        <strong>
                          {comment.author}{' '}
                          (
                          {
                            comment.authorRole
                          }
                          )
                        </strong>

                        <span>
                          {new Date(
                            comment.createdAt
                          ).toLocaleTimeString(
                            [],
                            {
                              hour: '2-digit',
                              minute:
                                '2-digit',
                            }
                          )}
                        </span>
                      </div>

                      <div
                        style={{
                          lineHeight: '1.4',
                          whiteSpace:
                            'pre-wrap',
                        }}
                      >
                        <SecretSentinel
                          content={
                            comment.content
                          }
                        />
                      </div>
                    </div>
                  )
                )
              )}
            </div>

            {/* Comment input */}
            <form
              onSubmit={
                handlePostComment
              }
              style={{
                display: 'flex',
                flexDirection:
                  'column',
                gap: 'var(--space-2)',
              }}
            >
              <textarea
                className="input-field input-field-mono"
                style={{
                  minHeight: '64px',
                  resize: 'vertical',
                  fontSize: '12px',
                }}
                placeholder="Post comment logs... (Secrets typed here will trigger live warning & redaction)"
                value={newComment}
                onChange={(event) =>
                  setNewComment(
                    event.target.value
                  )
                }
                disabled={
                  isAddingComment
                }
                required
              />

              {commentSecretsWarning && (
                <div
                  className="nexus-card-ruby"
                  style={{
                    padding:
                      '4px 8px',
                    fontSize: '10px',
                    borderRadius:
                      'var(--border-radius-sm)',
                    backgroundColor:
                      'rgba(244, 63, 94, 0.08)',
                  }}
                >
                  <strong
                    style={{
                      color:
                        'var(--color-ruby)',
                    }}
                  >
                    SENTINEL KEY FLAGGED:
                  </strong>{' '}
                  High-entropy API key
                  or password detected.
                  It will be scrubbed
                  before database
                  commits.
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent:
                    'flex-end',
                }}
              >
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    padding:
                      '6px 12px',
                    fontSize: '11px',
                  }}
                  disabled={
                    isAddingComment
                  }
                >
                  {isAddingComment ? (
                    <>
                      <Loader2
                        size={12}
                        className="animate-spin"
                      />
                      Posting...
                    </>
                  ) : (
                    <>
                      <Send size={12} />
                      Post Comment
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* =====================================================
            RIGHT COLUMN ΓÇö INTELLIGENCE
        ====================================================== */}

        <div
          style={{
            display: 'flex',
            flexDirection:
              'column',
            gap: 'var(--space-6)',
          }}
        >
          {/* Tabs */}
          <div
            className="tab-container"
            style={{
              marginBottom: '0',
              overflowX: 'auto',
            }}
          >
            <button
              type="button"
              onClick={() =>
                setActiveTab('triage')
              }
              className={`tab-btn ${
                activeTab === 'triage'
                  ? 'active'
                  : ''
              }`}
              style={{
                display: 'flex',
                alignItems:
                  'center',
                gap: '6px',
                whiteSpace:
                  'nowrap',
              }}
            >
              <Cpu size={14} />
              AI Triage & DNA
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveTab('graph')
              }
              className={`tab-btn ${
                activeTab === 'graph'
                  ? 'active'
                  : ''
              }`}
              style={{
                display: 'flex',
                alignItems:
                  'center',
                gap: '6px',
                whiteSpace:
                  'nowrap',
              }}
            >
              <Layers size={14} />
              Causal Graph &
              Relations
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveTab(
                  'reproduction'
                )
              }
              className={`tab-btn ${
                activeTab ===
                'reproduction'
                  ? 'active'
                  : ''
              }`}
              style={{
                display: 'flex',
                alignItems:
                  'center',
                gap: '6px',
                whiteSpace:
                  'nowrap',
              }}
            >
              <Terminal size={14} />
              Reproduction Capsule
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveTab(
                  'confidence'
                )
              }
              className={`tab-btn ${
                activeTab ===
                'confidence'
                  ? 'active'
                  : ''
              }`}
              style={{
                display: 'flex',
                alignItems:
                  'center',
                gap: '6px',
                whiteSpace:
                  'nowrap',
              }}
            >
              <ShieldCheck
                size={14}
              />
              Resolution
              Confidence
            </button>
          </div>

          {/* Tab content */}
          <div className="fade-in">
            {activeTab ===
              'triage' && (
              <div
                style={{
                  display: 'flex',
                  flexDirection:
                    'column',
                  gap: 'var(--space-6)',
                }}
              >
                <BugDNA
                  dna={bugDna}
                />

                <AIAnalysis
                  triage={aiTriage}
                  issueId={issue.id}
                  onUpdate={fetchData}
                />
              </div>
            )}

            {activeTab ===
              'graph' && (
              <div
                style={{
                  display: 'flex',
                  flexDirection:
                    'column',
                  gap: 'var(--space-6)',
                }}
              >
                <CausalBugGraph
                  graph={causalGraph}
                />

                <RelatedIssues
                  relations={relations}
                />
              </div>
            )}

            {activeTab ===
              'reproduction' && (
              <ReproductionCapsule
                capsule={capsule}
              />
            )}

            {activeTab ===
              'confidence' && (
              <ResolutionConfidence
                confidence={
                  confidence
                }
                issueId={issue.id}
                onUpdate={fetchData}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
