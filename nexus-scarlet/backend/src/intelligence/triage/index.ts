import type { TriageSuggestion, BugDna } from '../types.js';

interface RawIssueData {
  title: string;
  description: string;
  severity?: string | null;
  priority?: string | null;
  issueType?: string | null;
}

export function performTriage(issue: RawIssueData, dna: BugDna): TriageSuggestion {
  const text = `${issue.title} ${issue.description}`.toLowerCase();

  let category = 'GENERAL_DEFECT';
  let suggestedSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = (issue.severity as any) || 'MEDIUM';
  let suggestedPriority: 'P0' | 'P1' | 'P2' | 'P3' | 'P4' = (issue.priority as any) || 'P2';
  let suggestedOwnerRole = 'DEVELOPER';
  let riskFactor = 50;

  if (dna.securityRelevant) {
    category = 'SECURITY_VULNERABILITY';
    suggestedSeverity = 'HIGH';
    suggestedPriority = 'P1';
    suggestedOwnerRole = 'SECURITY_REVIEWER';
    riskFactor = 85;

    if (text.includes('critical') || text.includes('private') || text.includes('bypass')) {
      suggestedSeverity = 'CRITICAL';
      suggestedPriority = 'P0';
      riskFactor = 95;
    }
  } else if (dna.failureType === 'runtime_exception' || dna.failureType === 'functional_failure') {
    category = 'FUNCTIONAL_BUG';
    suggestedSeverity = text.includes('crash') ? 'HIGH' : 'MEDIUM';
    suggestedPriority = text.includes('crash') ? 'P1' : 'P2';
    suggestedOwnerRole = 'DEVELOPER';
    riskFactor = suggestedSeverity === 'HIGH' ? 70 : 40;
  } else if (dna.failureType === 'performance_degradation') {
    category = 'PERFORMANCE';
    suggestedSeverity = 'MEDIUM';
    suggestedPriority = 'P2';
    suggestedOwnerRole = 'DEVELOPER';
    riskFactor = 45;
  }

  const reasoning = `Deterministic classification based on failure type '${dna.failureType}' and input type '${dna.inputType}'. Security relevance evaluates to ${dna.securityRelevant}.`;

  return {
    category,
    suggestedSeverity,
    suggestedPriority,
    suggestedOwnerRole,
    riskFactor,
    reasoning,
    confidence: 0.90
  };
}
