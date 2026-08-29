export interface SecretSentinelWarning {
lineIndex: number;
characterIndex: number;
typeOfSecret: string;
snippet: string;
redactedSnippet: string;
}

export interface AuditEvent {
id: string;
actor: string;
actorRole: string;
action: string;
target: string;
timestamp: string;
type:
| 'PERMISSION'
| 'VISIBILITY'
| 'AI_TRIAGE'
| 'STATE_TRANSITION'
| 'SECURITY_FINDING';
}
