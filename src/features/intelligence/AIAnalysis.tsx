import { useState } from 'react';
import type { AITriage } from '../../types/intelligence';
import { Cpu, CheckSquare, XSquare, AlertCircle } from 'lucide-react';
import { acceptAiTriage, rejectAiTriage } from '../../lib/api/intelligence';

interface AIAnalysisProps {
  triage: AITriage | null;
  issueId: string;
  onUpdate: () => void;
}

export default function AIAnalysis({ triage, issueId, onUpdate }: AIAnalysisProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!triage) {
    return (
      <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--text-muted)' }}>
        AI triage pipeline processing pending.
      </div>
    );
  }

  const handleAccept = async () => {
    setIsSubmitting(true);
    await acceptAiTriage(issueId);
    onUpdate();
    setIsSubmitting(false);
  };

  const handleReject = async () => {
    setIsSubmitting(true);
    await rejectAiTriage(issueId);
    onUpdate();
    setIsSubmitting(false);
  };

  return (
    <div className="nexus-card" style={{ borderLeft: '3px solid var(--color-indigo)' }}>
      <div className="card-header">
        <div className="card-title">
          <Cpu size={16} style={{ color: 'var(--color-indigo)' }} />
          Explainable AI Triage Advisory
        </div>
        <span className="badge badge-indigo" style={{ display: 'flex', gap: '4px' }}>
          <Cpu size={10} /> Confidence: {triage.confidence}%
        </span>
      </div>

      {/* Advisory Warning */}
      <div className="nexus-card-amber" style={{
        backgroundColor: 'rgba(245, 158, 11, 0.04)',
        border: '1px solid rgba(245, 158, 11, 0.2)',
        borderRadius: 'var(--border-radius-md)',
        padding: 'var(--space-2) var(--space-3)',
        marginBottom: 'var(--space-4)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)'
      }}>
        <AlertCircle size={14} style={{ color: 'var(--color-amber)', flexShrink: 0 }} />
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
          <strong>ADVISORY CHECK:</strong> AI suggestions are purely advisory recommendations. Operators remain authoritative.
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
        {/* Suggested Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Suggested Classification:</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Category:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{triage.category}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Severity:</span>
              <span className="badge badge-ruby">{triage.suggestedSeverity}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Priority:</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{triage.suggestedPriority}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Suggested Lead:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{triage.suggestedOwner}</span>
            </div>
          </div>
        </div>

        {/* Reasoning and Evidence */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Causal Reasoning logs:</div>
          <ul style={{ paddingLeft: 'var(--space-4)', fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {triage.reasons.map((reason, idx) => (
              <li key={idx} style={{ lineHeight: '1.4' }}>{reason}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Human Actions validation */}
      <div style={{
        paddingTop: 'var(--space-3)',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          {triage.acceptedByHuman && (
            <span style={{ color: 'var(--color-emerald)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
              <CheckSquare size={14} /> AI Recommendation Approved by Operator
            </span>
          )}
          {triage.rejectedByHuman && (
            <span style={{ color: 'var(--color-ruby)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
              <XSquare size={14} /> AI Recommendation Overruled by Operator
            </span>
          )}
          {!triage.acceptedByHuman && !triage.rejectedByHuman && (
            <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
              Verification status: Pending human validation
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button
            onClick={handleReject}
            disabled={isSubmitting || triage.rejectedByHuman}
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '11px', borderColor: triage.rejectedByHuman ? 'var(--color-ruby)' : 'var(--border-color)' }}
          >
            Overrule
          </button>
          <button
            onClick={handleAccept}
            disabled={isSubmitting || triage.acceptedByHuman}
            className="btn btn-primary"
            style={{ padding: '4px 8px', fontSize: '11px', backgroundColor: triage.acceptedByHuman ? 'var(--color-emerald)' : 'var(--color-cyan)' }}
          >
            Approve Triage
          </button>
        </div>
      </div>
    </div>
  );
}
