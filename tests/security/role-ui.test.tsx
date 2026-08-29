import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import AuditTimeline from '../../src/components/security/AuditTimeline';
import type { AuditEvent } from '../../src/types/security';

describe('Role-Based UI Rendering Verification', () => {
  const mockEvents: AuditEvent[] = [
    {
      id: 'evt-01',
      timestamp: '2026-08-29T12:00:00Z',
      type: 'STATE_TRANSITION',
      actor: 'Sarah Connor',
      actorRole: 'Lead Security Engineer',
      action: 'Status Transition',
      target: 'BUG-101',
      status: 'SUCCESS',
      details: 'Transitioned issue to TRIAGED',
    },
    {
      id: 'evt-02',
      timestamp: '2026-08-29T12:05:00Z',
      type: 'PERMISSION',
      actor: 'John Doe',
      actorRole: 'Security Reviewer',
      action: 'Read Private Issue',
      target: 'BUG-102',
      status: 'FAILURE',
      details: 'Unauthorized read attempt blocked',
    },
  ];

  it('renders role strings in AuditTimeline logs without crashing', () => {
    render(<AuditTimeline events={mockEvents} />);
    
    expect(screen.getByText(/Lead Security Engineer/)).toBeInTheDocument();
    expect(screen.getByText(/Security Reviewer/)).toBeInTheDocument();
  });

  it('handles arbitrary user roles stably without rendering crashes', () => {
    const arbitraryEvents: AuditEvent[] = [
      {
        id: 'evt-03',
        timestamp: '2026-08-29T12:10:00Z',
        type: 'AI_TRIAGE',
        actor: 'Cipher Engine',
        actorRole: 'SYSTEM_DAEMON_WITH_EXTREME_ROLE_NAME_THAT_COULD_OVERFLOW_THE_LAYOUT_CONTAINER_OF_NEXUS',
        action: 'Analyze Code',
        target: 'BUG-103',
        status: 'SUCCESS',
        details: 'Completed security analysis',
      },
    ];

    render(<AuditTimeline events={arbitraryEvents} />);
    expect(screen.getByText(/SYSTEM_DAEMON_WITH_EXTREME_ROLE_NAME_THAT_COULD_OVERFLOW_THE_LAYOUT_CONTAINER_OF_NEXUS/)).toBeInTheDocument();
  });
});
