import type { ReleaseRisk } from '../../types/release';
import { Gauge } from 'lucide-react';

interface ReleaseRiskRadarProps {
  risk: ReleaseRisk | null;
}

export default function ReleaseRiskRadar({ risk }: ReleaseRiskRadarProps) {
  if (!risk) {
    return (
      <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--text-muted)' }}>
        No release parameters mapped.
      </div>
    );
  }

  const isCritical = risk.riskLevel === 'CRITICAL';
  const isMedium = risk.riskLevel === 'MEDIUM';

  return (
    <div className="nexus-card" style={{
      borderLeft: `3px solid ${isCritical ? 'var(--color-ruby)' : isMedium ? 'var(--color-amber)' : 'var(--color-emerald)'}`
    }}>
      <div className="card-header">
        <div className="card-title">
          <Gauge size={16} style={{ color: isCritical ? 'var(--color-ruby)' : 'var(--color-cyan)' }} />
          Release Risk Radar Dashboard: Release {risk.version}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-6)', alignItems: 'center' }}>
        
        {/* Dial score card */}
        <div style={{
          padding: 'var(--space-4)',
          backgroundColor: 'var(--bg-tertiary)',
          borderRadius: 'var(--border-radius-lg)',
          border: '1px solid var(--border-color)',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <div style={{
            width: '90px',
            height: '90px',
            borderRadius: '50%',
            border: '8px solid var(--bg-primary)',
            borderTopColor: isCritical ? 'var(--color-ruby)' : isMedium ? 'var(--color-amber)' : 'var(--color-emerald)',
            borderRightColor: isCritical || isMedium ? 'var(--color-amber)' : 'var(--color-emerald)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px',
            fontWeight: 700,
            color: isCritical ? 'var(--color-ruby)' : isMedium ? 'var(--color-amber)' : 'var(--color-emerald)'
          }}>
            {risk.score}%
          </div>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '8px' }}>
            Risk Status: {risk.riskLevel}
          </span>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Score recalculates on verification checklist checks
          </span>
        </div>

        {/* Factors list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            Active Threat Contributions:
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {risk.factorContributions.map(factor => (
              <div key={factor.id} style={{
                padding: '8px var(--space-3)',
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: 'var(--border-radius-md)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                fontSize: '11px'
              }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{factor.label}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '10px', marginTop: '2px' }}>{factor.description}</div>
                </div>
                <span className={`badge ${
                  factor.status === 'CRITICAL' ? 'badge-ruby' : 
                  factor.status === 'WARNING' ? 'badge-amber' : 'badge-emerald'
                }`} style={{ marginLeft: 'var(--space-2)', flexShrink: 0 }}>
                  +{factor.riskWeight} pts
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      <div style={{
        marginTop: 'var(--space-4)',
        paddingTop: 'var(--space-3)',
        borderTop: '1px solid var(--border-color)',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 'var(--space-2)',
        textAlign: 'center',
        fontSize: '11px'
      }}>
        <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '6px', borderRadius: 'var(--border-radius-sm)' }}>
          <span style={{ color: 'var(--text-muted)' }}>Blocked Deps</span>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>{risk.blockedDependenciesCount}</div>
        </div>
        <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '6px', borderRadius: 'var(--border-radius-sm)' }}>
          <span style={{ color: 'var(--text-muted)' }}>Unverified Fixes</span>
          <div style={{ fontWeight: 700, color: risk.unverifiedFixesCount > 0 ? 'var(--color-amber)' : 'var(--text-primary)', marginTop: '2px' }}>
            {risk.unverifiedFixesCount}
          </div>
        </div>
        <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '6px', borderRadius: 'var(--border-radius-sm)' }}>
          <span style={{ color: 'var(--text-muted)' }}>Security Bugs</span>
          <div style={{ fontWeight: 700, color: risk.securityIssuesCount > 0 ? 'var(--color-ruby)' : 'var(--text-primary)', marginTop: '2px' }}>
            {risk.securityIssuesCount}
          </div>
        </div>
        <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '6px', borderRadius: 'var(--border-radius-sm)' }}>
          <span style={{ color: 'var(--text-muted)' }}>Regression warnings</span>
          <div style={{ fontWeight: 700, color: risk.regressionSignalsCount > 0 ? 'var(--color-amber)' : 'var(--text-primary)', marginTop: '2px' }}>
            {risk.regressionSignalsCount}
          </div>
        </div>
      </div>
    </div>
  );
}
