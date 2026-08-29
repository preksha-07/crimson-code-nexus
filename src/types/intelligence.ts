import type { Severity, Priority } from './issue';

export interface BugDNA {
  component: string;
  failureType: string;
  triggerInputClass: string;
  environment: string;
  impact: string;
  securityRelevance: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface AITriage {
  category: string;
  suggestedSeverity: Severity;
  suggestedPriority: Priority;
  securityFlag: boolean;
  suggestedOwner: string;
  confidence: number;
  reasons: string[];
  acceptedByHuman?: boolean;
  rejectedByHuman?: boolean;
}

export interface RelatedIssue {
  issueId: string;
  title: string;
  relationType: 'DUPLICATE' | 'RELATED';
  similarityPercentage: number;
  sharedSignals: string[];
  connectionExplanation: string;
}

export interface CausalGraphNode {
  id: string;
  label: string;
  type: 'BUG' | 'COMPONENT' | 'ROOT_CAUSE' | 'RELEASE_IMPACT';
  status?: string;
  severity?: Severity;
  description?: string;
}

export interface CausalGraphLink {
  source: string;
  target: string;
  label?: string;
}

export interface CausalGraph {
  nodes: CausalGraphNode[];
  links: CausalGraphLink[];
}

export interface CausalGraph {
  nodes: CausalGraphNode[];
  links: CausalGraphLink[];
}

export interface ReproductionCapsule {
  environment: string;
  preconditions: string[];
  steps: string[];
  expectedBehavior: string;
  actualBehavior: string;
  evidenceLogs: string;
  missingInformation: string[];
}

export interface ConfidenceEvidenceItem {
  id: string;
  label: string;
  verified: boolean;
  weight: number;
}

export interface ResolutionConfidence {
  score: number;
  evidenceItems: ConfidenceEvidenceItem[];
}
