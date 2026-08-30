import type { Severity, Priority } from './issue';

export interface BugDNA {
  component: string;
  failureType: string;
  inputType?: string;
  triggerInputClass?: string;
  environment?: string | null;
  impact: string;
  securityRelevant?: boolean;
  securityRelevance?: 'HIGH' | 'MEDIUM' | 'LOW' | string;
}

export interface AITriage {
  category: string;
  suggestedSeverity: Severity;
  suggestedPriority: Priority;
  securityFlag?: boolean;
  suggestedOwner?: string;
  suggestedOwnerRole?: string;
  riskFactor?: number;
  confidence: number;
  reasoning?: string;
  reasons?: string[];
  acceptedByHuman?: boolean;
  rejectedByHuman?: boolean;
}

export interface RelatedIssue {
  issueId: string;
  title: string;
  status?: string;
  relationType?: 'DUPLICATE' | 'RELATED';
  relationshipSignal?: string;
  similarityPercentage?: number;
  relevanceScore?: number;
  sharedSignals?: string[];
  connectionExplanation?: string;
  reason?: string;
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

export interface ReproductionCapsule {
  environment?: string | null;
  preconditions?: string[];
  steps?: string[];
  expectedBehavior?: string;
  expectedResult?: string;
  actualBehavior?: string;
  actualResult?: string;
  evidenceLogs?: string;
  evidenceProvided?: boolean;
  missingInformation?: string[];
}

export interface ConfidenceEvidenceItem {
  id: string;
  label: string;
  verified: boolean;
  weight: number;
}

export interface ResolutionConfidence {
  score?: number;
  confidenceScore?: number;
  confidenceLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERIFIED';
  factors?: {
    statusWeight?: number;
    reproductionWeight?: number;
    verificationState?: string;
    evidenceWeight?: number;
  };
  explanation?: string;
  evidenceItems?: ConfidenceEvidenceItem[];
}
