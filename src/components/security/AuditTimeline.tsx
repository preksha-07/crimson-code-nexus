import type { AuditEvent } from '../../types/security';
import { ShieldCheck, Cpu, Key, EyeOff, CheckSquare, Clock } from 'lucide-react';

interface AuditTimelineProps {
  events: AuditEvent[];
}

export default function AuditTimeline({ events }: AuditTimelineProps) {
  if (events.length === 0) {
    return (
      <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--text-muted)' }}>
        No audit events recorded in security ledger.
      </div>
    );
  }

  const getEventIcon = (type: AuditEvent['type']) => {
    switch (type) {
      case 'PERMISSION':
        return <Key size={14} style={{ color: 'var(--color-cyan)' }} />;
      case 'VISIBILITY':
        return <EyeOff size={14} style={{ color: 'var(--color-indigo)' }} />;
      case 'AI_TRIAGE':
        return <Cpu size={14} style={{ color: 'var(--color-cyan)' }} />;
      case 'STATE_TRANSITION':
        return <CheckSquare size={14} style={{ color: 'var(--color-amber)' }} />;
      case 'SECURITY_FINDING':
        return <ShieldCheck size={14} style={{ color: 'var(--color-ruby)' }} />;
      default:
        return <Clock size={14} />;
    }
  };

  const getEventBadgeClass = (type: AuditEvent['type']) => {
    switch (type) {
      case 'PERMISSION': return 'badge-cyan';
      case 'VISIBILITY': return 'badge-indigo';
      case 'AI_TRIAGE': return 'badge-cyan';
      case 'STATE_TRANSITION': return 'badge-amber';
      case 'SECURITY_FINDING': return 'badge-ruby';
      default: return 'badge-slate';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {events.map((event, idx) => (
        <div key={event.id || idx} style={{
          display: 'flex',
          gap: 'var(--space-3)',
          paddingBottom: 'var(--space-3)',
          borderBottom: '1px solid var(--border-color)',
          position: 'relative'
        }}>
          {/* Vertical line indicator */}
          {idx < events.length - 1 && (
            <div style={{
              position: 'absolute',
              top: '24px',
              left: '12px',
              bottom: '-12px',
              width: '1px',
              backgroundColor: 'var(--border-color)',
              zIndex: 0
            }} />
          )}

          {/* Icon Bubble */}
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
            flexShrink: 0
          }}>
            {getEventIcon(event.type)}
          </div>

          {/* Details */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              <span className={`badge ${getEventBadgeClass(event.type)}`} style={{ fontSize: '9px', padding: '1px 4px' }}>
                {event.type}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {new Date(event.timestamp).toLocaleString()}
              </span>
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
              {event.action}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Operator: <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{event.actor}</span> ({event.actorRole}) ΓÇó Target: {event.target}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
