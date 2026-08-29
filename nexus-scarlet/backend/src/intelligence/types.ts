export interface BugDna {
  component: string;
  failureType: string;
  inputType: string;
  impact: string;
  securityRelevant: boolean;
  environment: string | null;
}

export interface TriageSuggestion {
  category: string;
  suggestedSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  suggestedPriority: 'P0' | 'P1' | 'P2' | 'P3' | 'P4';
  suggestedOwnerRole: string;
  riskFactor: number;
  reasoning: string;
  confidence: number;
}

export interface DuplicateCandidate {
  issueId: string;
  similarityScore: number; // 0.0 - 1.0
  reason: string;
  title: string;
  status: string;
}

export interface RelatedIssueCandidate {
  issueId: string;
  relationshipSignal: string;
  relevanceScore: number; // 0.0 - 1.0
  reason: string;
  title: string;
  status: string;
}

export interface RiskAnalysis {
  overallScore: number; // 0 - 100
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  factors: {
    severityWeight: number;
    priorityWeight: number;
    securityWeight: number;
    dependencyWeight: number;
    releaseWeight: number;
    verificationWeight: number;
  };
  explanation: string;
}

export interface ReproductionCapsule {
  environment: string;
  steps: string[];
  expectedResult: string;
  actualResult: string;
  evidenceProvided: boolean;
}

export interface ResolutionConfidence {
  confidenceScore: number; // 0 - 100
  confidenceLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERIFIED';
  factors: {
    statusWeight: number;
    reproductionWeight: number;
    verificationState: string;
    evidenceWeight: number;
  };
  explanation: string;
}

export interface ReleaseRiskSummary {
  releaseId: string;
  overallReleaseRiskScore: number; // 0 - 100
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  totalIssues: number;
  criticalHighCount: number;
  securityIssueCount: number;
  blockedDependencyCount: number;
  unverifiedResolvedCount: number;
  factors: Record<string, number>;
  explanation: string;
}

export interface IntelligenceResult {
  issueId: string;
  provider: string;
  model: string;
  bugDna: BugDna;
  triage: TriageSuggestion;
  reproductionCapsule: ReproductionCapsule;
  resolutionConfidence: ResolutionConfidence;
  risk: RiskAnalysis;
  analyzedAt: string;
}
