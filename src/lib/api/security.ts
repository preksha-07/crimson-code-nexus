import type {
  AuditEvent,
  SecretSentinelWarning,
} from '../../types/security';

import { apiClient } from './client';

export interface SecretScanResult {
  hasSecrets: boolean;
  warnings: SecretSentinelWarning[];
  redactedContent: string;
}

/**
 * Fetch audit events visible to the current user.
 *
 * Authorization and filtering are handled by the backend.
 */
export const getAuditLogs = (): Promise<AuditEvent[]> => {
  return apiClient.get<AuditEvent[]>('/security/audit-logs');
};

/**
 * Submit an audit event to the backend.
 *
 * The backend is responsible for:
 * - generating the event ID
 * - generating the timestamp
 * - validating the actor
 * - authorization
 * - persistence
 */
export const postAuditEvent = (
  event: Omit<AuditEvent, 'id' | 'timestamp'>
): Promise<AuditEvent> => {
  return apiClient.post<AuditEvent>(
    '/security/audit-logs',
    event
  );
};

/**
 * Request a Secret Sentinel scan.
 *
 * Secret detection and redaction are performed by the
 * backend/security service. The frontend only sends content
 * and displays the returned result.
 */
export const runSecretSentinelScanner = (
  content: string
): Promise<SecretScanResult> => {
  return apiClient.post<SecretScanResult>(
    '/security/secret-sentinel/scan',
    { content }
  );
};
