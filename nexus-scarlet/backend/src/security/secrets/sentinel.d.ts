export interface Finding {
  id: string;
  issueId: string;
  type: string;
  severity: string;
  confidence: number;
  source: string;
  action: string;
  createdAt: string;
}

export function scanText(text: string, metadata?: { issueId?: string, source?: string }): Finding[];
export function redactText(text: string): string;
