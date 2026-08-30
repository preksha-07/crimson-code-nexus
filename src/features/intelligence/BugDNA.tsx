import type { BugDNA as BugDnaType } from '../../types/intelligence';
import { Dna, Server, Shield, HardDrive } from 'lucide-react';

interface BugDnaProps {
  dna: BugDnaType | null;
}

export default function BugDNA({ dna }: BugDnaProps) {
  if (!dna) {
    return (
      <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--text-muted)' }}>
        No Bug DNA sequence calculated for this record.
      </div>
    );
  }

  const triggerClass =
    dna.triggerInputClass || dna.inputType || 'Standard Payload';
  const secRelevance =
    dna.securityRelevance || (dna.securityRelevant ? 'HIGH' : 'LOW');
  const env = dna.environment || 'production';

  const items = [
    { label: 'Ingested Component', value: dna.component || 'core', icon: <HardDrive size={14} /> },
    { label: 'AI Failure Classification', value: dna.failureType || 'defect', icon: <Dna size={14} /> },
    { label: 'Trigger Input Class', value: triggerClass, icon: <Server size={14} /> },
    { label: 'Exploitation Environment', value: env, icon: <Server size={14} /> },
    { label: 'Business Impact Route', value: dna.impact || 'unspecified', icon: <Shield size={14} /> },
    { label: 'Security Relevance', value: secRelevance, icon: <Shield size={14} />, highlight: true }
  ];

  return (
    <div className="nexus-card" style={{ borderLeft: '3px solid var(--color-cyan)' }}>
      <div className="card-header">
        <div className="card-title">
          <Dna size={16} style={{ color: 'var(--color-cyan)' }} />
          Causal Bug DNA Profile
        </div>
      </div>
      
      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)', lineHeight: '1.4' }}>
        Bug DNA extracts characteristic parameters from traces, input payloads, and logs to identify repeating vulnerabilities across disparate systems.
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 'var(--space-3)'
      }}>
        {items.map((item, idx) => (
          <div key={idx} style={{
            padding: 'var(--space-2) var(--space-3)',
            backgroundColor: 'var(--bg-tertiary)',
            borderRadius: 'var(--border-radius-md)',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>
              {item.icon}
              {item.label}
            </div>
            <div style={{ 
              marginTop: '4px', 
              fontSize: '12px', 
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              color: item.highlight 
                ? (item.value === 'HIGH' ? 'var(--color-ruby)' : 'var(--color-amber)')
                : 'var(--text-primary)'
            }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
