import { useState } from 'react';
import type { ResolutionConfidence as ConfType } from '../../types/intelligence';
import { ShieldCheck, CheckSquare, Square } from 'lucide-react';
import { verifyConfidenceItem } from '../../lib/api/intelligence';

interface ResolutionConfidenceProps {
  confidence: ConfType | null;
  issueId: string;
  onUpdate: () => void;
}

export default function ResolutionConfidence({ confidence, issueId, onUpdate }: ResolutionConfidenceProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!confidence) {
    return (
      <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--text-muted)' }}>
        No resolution confidence scorecard initialized.
      </div>
    );
  }

  const handleToggle = async (itemId: string, currentStatus: boolean) => {
    setIsSubmitting(true);
    try {
      await verifyConfidenceItem(issueId, itemId, !currentStatus);
      onUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'var(--color-emerald)';
    if (score >= 60) return 'var(--color-amber)';
    return 'var(--color-ruby)';
  };

  return (
    <div className="nexus-card">
      <div className="card-header">
        <div className="card-title">
          <ShieldCheck size={16} style={{ color: 'var(--color-cyan)' }} />
          Evidence-Based Resolution Confidence Scorecard
        </div>
      </div>

      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)', lineHeight: '1.4' }}>
        NEXUS requires tangible engineering evidence (tests, audits, validations) to increase confidence that a vulnerability is fully closed. The score is not magically generated.
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 3fr',
        gap: 'var(--space-6)',
        alignItems: 'center'
      }}>
        
        {/* Visual score dial */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--space-4)',
          backgroundColor: 'var(--bg-tertiary)',
          borderRadius: 'var(--border-radius-lg)',
          border: '1px solid var(--border-color)',
          textAlign: 'center'
        }}>
          <div style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            border: '8px solid var(--bg-primary)',
            borderTopColor: getScoreColor(confidence.score),
            borderRightColor: confidence.score >= 50 ? getScoreColor(confidence.score) : 'var(--bg-primary)',
            borderBottomColor: confidence.score >= 75 ? getScoreColor(confidence.score) : 'var(--bg-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            fontWeight: 700,
            color: getScoreColor(confidence.score)
          }}>
            {confidence.score}%
          </div>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginTop: 'var(--space-2)' }}>
            Resolution Confidence
          </span>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {confidence.score >= 90 ? 'High Confidence (Safe to close)' : 
             confidence.score >= 50 ? 'Medium Confidence (Testing ongoing)' : 'Low Confidence (Unverified patch)'}
          </span>
        </div>

        {/* Evidence checklist */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>
            Contributing Verification Evidence:
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {confidence.evidenceItems.map(item => (
              <div
                key={item.id}
                onClick={() => !isSubmitting && handleToggle(item.id, item.verified)}
                style={{
                  padding: '10px var(--space-3)',
                  backgroundColor: item.verified ? 'rgba(16, 189, 129, 0.03)' : 'var(--bg-tertiary)',
                  border: '1px solid',
                  borderColor: item.verified ? 'rgba(16, 189, 129, 0.2)' : 'var(--border-color)',
                  borderRadius: 'var(--border-radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  transition: 'all var(--transition-fast)'
                }}
              >
                <div>
                  {item.verified ? (
                    <CheckSquare size={16} style={{ color: 'var(--color-emerald)' }} />
                  ) : (
                    <Square size={16} style={{ color: 'var(--text-muted)' }} />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11.5px', fontWeight: 500, color: item.verified ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {item.label}
                  </div>
                </div>
                <span className={`badge ${item.verified ? 'badge-emerald' : 'badge-slate'}`} style={{ flexShrink: 0 }}>
                  +{item.weight}% Score
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
