import type { ReproductionCapsule as CapsuleType } from '../../types/intelligence';
import { Terminal, ShieldAlert, CheckCircle, FileText } from 'lucide-react';

interface ReproductionCapsuleProps {
  capsule: CapsuleType | null;
}

export default function ReproductionCapsule({ capsule }: ReproductionCapsuleProps) {
  if (!capsule) {
    return (
      <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--text-muted)' }}>
        Reproduction capsule evidence generation pending.
      </div>
    );
  }

  const hasMissingInfo = capsule.missingInformation && capsule.missingInformation.length > 0;

  return (
    <div className="nexus-card">
      <div className="card-header">
        <div className="card-title">
          <Terminal size={16} style={{ color: 'var(--color-cyan)' }} />
          Isolate Reproduction Capsule
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {/* Environment Profile */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
            Target Sandbox Environment:
          </div>
          <div style={{
            padding: '8px var(--space-3)',
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius-md)',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            color: 'var(--text-primary)'
          }}>
            {capsule.environment || 'Unknown Environment (Needs verification)'}
          </div>
        </div>

        {/* Preconditions */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
            Preconditions:
          </div>
          <ul style={{ paddingLeft: 'var(--space-4)', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {capsule.preconditions.map((pre, idx) => (
              <li key={idx}>{pre}</li>
            ))}
          </ul>
        </div>

        {/* Reproduction Steps */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
            Steps to Reproduce:
          </div>
          <ol style={{ paddingLeft: 'var(--space-4)', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {capsule.steps.map((step, idx) => (
              <li key={idx} style={{ lineHeight: '1.4' }}>{step}</li>
            ))}
          </ol>
        </div>

        {/* Expected vs Actual */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
          <div style={{
            padding: 'var(--space-3)',
            backgroundColor: 'rgba(16, 189, 129, 0.02)',
            border: '1px solid rgba(16, 189, 129, 0.1)',
            borderRadius: 'var(--border-radius-md)'
          }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-emerald)', display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase' }}>
              <CheckCircle size={12} /> Expected Behavior:
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.4' }}>
              {capsule.expectedBehavior}
            </p>
          </div>

          <div style={{
            padding: 'var(--space-3)',
            backgroundColor: 'rgba(244, 63, 94, 0.02)',
            border: '1px solid rgba(244, 63, 94, 0.1)',
            borderRadius: 'var(--border-radius-md)'
          }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-ruby)', display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase' }}>
              <ShieldAlert size={12} /> Actual Behavior (Vulnerable):
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.4' }}>
              {capsule.actualBehavior}
            </p>
          </div>
        </div>

        {/* Evidence Logs Console */}
        {capsule.evidenceLogs && (
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <FileText size={12} /> Raw Normalization Telemetry Evidence Logs:
            </div>
            <pre className="log-box" style={{ fontSize: '11px' }}>
              {capsule.evidenceLogs}
            </pre>
          </div>
        )}

        {/* Missing Info Warning */}
        {hasMissingInfo ? (
          <div className="nexus-card-amber" style={{
            backgroundColor: 'rgba(245, 158, 11, 0.04)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            padding: 'var(--space-2) var(--space-3)',
            fontSize: '11px',
            color: 'var(--text-secondary)'
          }}>
            <strong>NEEDS VERIFICATION:</strong> Missing parameters discovered: {capsule.missingInformation.join(', ')}. Submit further telemetry.
          </div>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            color: 'var(--color-emerald)',
            fontWeight: 500
          }}>
            <CheckCircle size={12} /> All expected reproduction parameters mapped. No missing fields.
          </div>
        )}
      </div>
    </div>
  );
}
