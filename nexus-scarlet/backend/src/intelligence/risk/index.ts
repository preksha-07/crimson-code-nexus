import type { RiskAnalysis, ReleaseRiskSummary, BugDna } from '../types.js';

interface IssueContext {
  id: string;
  severity: string;
  priority: string;
  status: string;
  issueType: string;
  hasBlockedDependencies?: boolean;
  releaseId?: string | null;
}

export function calculateIssueRisk(issue: IssueContext, dna: BugDna): RiskAnalysis {
  let severityWeight = 25;
  switch (issue.severity) {
    case 'CRITICAL': severityWeight = 40; break;
    case 'HIGH': severityWeight = 30; break;
    case 'MEDIUM': severityWeight = 20; break;
    case 'LOW': severityWeight = 10; break;
  }

  let priorityWeight = 15;
  switch (issue.priority) {
    case 'P0': priorityWeight = 25; break;
    case 'P1': priorityWeight = 20; break;
    case 'P2': priorityWeight = 15; break;
    case 'P3': priorityWeight = 10; break;
    case 'P4': priorityWeight = 5; break;
  }

  const securityWeight = dna.securityRelevant ? 20 : 0;
  const dependencyWeight = issue.hasBlockedDependencies ? 15 : 0;
  const releaseWeight = issue.releaseId ? 10 : 0;
  const verificationWeight = (issue.status === 'RESOLVED' || issue.status === 'CLOSED' || issue.status === 'VERIFIED') ? 0 : 10;

  const totalScore = Math.min(100, severityWeight + priorityWeight + securityWeight + dependencyWeight + releaseWeight + verificationWeight);

  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
  if (totalScore >= 80) riskLevel = 'CRITICAL';
  else if (totalScore >= 60) riskLevel = 'HIGH';
  else if (totalScore >= 35) riskLevel = 'MEDIUM';

  const explanation = `Risk score ${totalScore}/100 computed from Severity (${severityWeight}), Priority (${priorityWeight}), Security Relevance (${securityWeight}), Dependencies (${dependencyWeight}), Release association (${releaseWeight}), and Verification state (${verificationWeight}).`;

  return {
    overallScore: totalScore,
    riskLevel,
    factors: {
      severityWeight,
      priorityWeight,
      securityWeight,
      dependencyWeight,
      releaseWeight,
      verificationWeight
    },
    explanation
  };
}

export function calculateReleaseRisk(
  releaseId: string,
  issues: Array<IssueContext & { dna: BugDna }>
): ReleaseRiskSummary {
  const totalIssues = issues.length;
  if (totalIssues === 0) {
    return {
      releaseId,
      overallReleaseRiskScore: 0,
      riskLevel: 'LOW',
      totalIssues: 0,
      criticalHighCount: 0,
      securityIssueCount: 0,
      blockedDependencyCount: 0,
      unverifiedResolvedCount: 0,
      factors: {},
      explanation: 'No issues associated with release.'
    };
  }

  let criticalHighCount = 0;
  let securityIssueCount = 0;
  let blockedDependencyCount = 0;
  let unverifiedResolvedCount = 0;

  for (const issue of issues) {
    if (issue.severity === 'CRITICAL' || issue.severity === 'HIGH') criticalHighCount++;
    if (issue.dna.securityRelevant) securityIssueCount++;
    if (issue.hasBlockedDependencies) blockedDependencyCount++;
    if (issue.status === 'RESOLVED') unverifiedResolvedCount++;
  }

  // Formula: Weighted aggregation of high risk factors normalized over total issues
  const baseScore = Math.round(
    ((criticalHighCount * 25) +
     (securityIssueCount * 30) +
     (blockedDependencyCount * 20) +
     (unverifiedResolvedCount * 15)) / Math.max(1, totalIssues / 2)
  );

  const overallReleaseRiskScore = Math.min(100, Math.max(0, baseScore));

  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
  if (overallReleaseRiskScore >= 75) riskLevel = 'CRITICAL';
  else if (overallReleaseRiskScore >= 50) riskLevel = 'HIGH';
  else if (overallReleaseRiskScore >= 25) riskLevel = 'MEDIUM';

  const explanation = `Release risk score ${overallReleaseRiskScore}/100 based on ${criticalHighCount} Critical/High issues, ${securityIssueCount} Security issues, ${blockedDependencyCount} blocked dependencies, and ${unverifiedResolvedCount} unverified resolved issues out of ${totalIssues} total release issues.`;

  return {
    releaseId,
    overallReleaseRiskScore,
    riskLevel,
    totalIssues,
    criticalHighCount,
    securityIssueCount,
    blockedDependencyCount,
    unverifiedResolvedCount,
    factors: {
      criticalHighWeight: criticalHighCount * 25,
      securityWeight: securityIssueCount * 30,
      blockedDependencyWeight: blockedDependencyCount * 20,
      unverifiedResolvedWeight: unverifiedResolvedCount * 15
    },
    explanation
  };
}
