import type { RelatedIssue } from '../../types/intelligence';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface RelatedIssuesProps {
  relations: RelatedIssue[];
}

export default function RelatedIssues({ relations }: RelatedIssuesProps) {
  const navigate = useNavigate();

  const items = Array.isArray(relations) ? relations : [];

  if (items.length === 0) {
    return (
      <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--text-muted)' }}>
        No duplicates or related signal matches found.
      </div>
    );
  }

  // Distinguish concepts clearly
  const duplicates = items.filter(
    (r) =>
      r.relationType === 'DUPLICATE' ||
      r.relationshipSignal?.includes('DUPLICATE') ||
      (r.similarityPercentage ? r.similarityPercentage >= 80 : (r.relevanceScore ? r.relevanceScore >= 0.8 : false))
  );
  const relateds = items.filter((r) => !duplicates.includes(r));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

      {/* Duplicates Section */}
      <div>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 'var(--space-2)' }}>
          Ingested Duplicate Concepts (Potential same root cause):
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {duplicates.length === 0 ? (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', padding: 'var(--space-2)' }}>No direct duplicates detected.</div>
          ) : (
            duplicates.map((item, idx) => {
              const matchPct = item.similarityPercentage ?? Math.round((item.relevanceScore ?? 0) * 100);
              const explanation = item.connectionExplanation || item.reason || 'High terminology overlap detected.';
              const signals = Array.isArray(item.sharedSignals) && item.sharedSignals.length > 0
                ? item.sharedSignals
                : item.relationshipSignal
                ? [item.relationshipSignal]
                : [];

              return (
                <div key={idx} className="nexus-card nexus-card-ruby" style={{
                  backgroundColor: 'rgba(244, 63, 94, 0.02)',
                  padding: 'var(--space-3)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-4)' }}>
                    <div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-ruby)', fontSize: '11px' }}>
                        {item.issueId} (DUPLICATE MATCH)
                      </span>
                      <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                        {item.title}
                      </h4>
                    </div>
                    <span className="badge badge-ruby" style={{ flexShrink: 0 }}>
                      {matchPct}% Match
                    </span>
                  </div>

                  <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <strong>Causal Explanation:</strong> {explanation}
                  </div>

                  {signals.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                      {signals.map((sig, sIdx) => (
                        <span key={sIdx} className="badge badge-slate" style={{ fontSize: '9px' }}>{sig}</span>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                    <button
                      onClick={() => navigate(`/issues/${item.issueId}`)}
                      className="btn btn-secondary"
                      style={{ padding: '2px 6px', fontSize: '10px' }}
                    >
                      View Original <ArrowRight size={10} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Related Concepts Section */}
      <div>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 'var(--space-2)' }}>
          Related Signaling Concepts (Connected components/failures):
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {relateds.length === 0 ? (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', padding: 'var(--space-2)' }}>No connected systems detected.</div>
          ) : (
            relateds.map((item, idx) => {
              const matchPct = item.similarityPercentage ?? Math.round((item.relevanceScore ?? 0) * 100);
              const explanation = item.connectionExplanation || item.reason || 'Related system connection detected.';
              const signals = Array.isArray(item.sharedSignals) && item.sharedSignals.length > 0
                ? item.sharedSignals
                : item.relationshipSignal
                ? [item.relationshipSignal]
                : [];

              return (
                <div key={idx} className="nexus-card nexus-card-amber" style={{
                  backgroundColor: 'rgba(245, 158, 11, 0.02)',
                  padding: 'var(--space-3)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-4)' }}>
                    <div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-amber)', fontSize: '11px' }}>
                        {item.issueId} (MUTUAL SIGNAL)
                      </span>
                      <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                        {item.title}
                      </h4>
                    </div>
                    <span className="badge badge-amber" style={{ flexShrink: 0 }}>
                      {matchPct}% Match
                    </span>
                  </div>

                  <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <strong>Causal Explanation:</strong> {explanation}
                  </div>

                  {signals.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                      {signals.map((sig, sIdx) => (
                        <span key={sIdx} className="badge badge-slate" style={{ fontSize: '9px' }}>{sig}</span>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                    <button
                      onClick={() => navigate(`/issues/${item.issueId}`)}
                      className="btn btn-secondary"
                      style={{ padding: '2px 6px', fontSize: '10px' }}
                    >
                      Investigate <ArrowRight size={10} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}
