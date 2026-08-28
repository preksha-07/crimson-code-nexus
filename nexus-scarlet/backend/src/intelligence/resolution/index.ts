import type { ResolutionConfidence, ReproductionCapsule } from '../types.js';

interface IssueData {
  id: string;
  status: string;
}

export function evaluateResolutionConfidence(
  issue: IssueData,
  capsule: ReproductionCapsule,
  commentCount = 0,
  hasEvidence = false
): ResolutionConfidence {
  let statusWeight = 10;
  let verificationState = 'UNVERIFIED';

  switch (issue.status) {
    case 'VERIFIED':
      statusWeight = 40;
      verificationState = 'VERIFIED_BY_QA_SECURITY';
      break;
    case 'CLOSED':
      statusWeight = 35;
      verificationState = 'CLOSED_WORKFLOW';
      break;
    case 'RESOLVED':
      statusWeight = 25;
      verificationState = 'DEVELOPER_RESOLVED_UNVERIFIED';
      break;
    case 'CODE_REVIEW':
    case 'TESTING':
      statusWeight = 15;
      verificationState = 'IN_VERIFICATION_PIPELINE';
      break;
    default:
      statusWeight = 5;
      verificationState = 'UNRESOLVED';
      break;
  }

  const reproductionWeight = capsule.steps.length > 0 && capsule.environment !== 'unknown' ? 25 : 10;
  const evidenceWeight = (capsule.evidenceProvided || hasEvidence) ? 25 : 5;
  const discussionWeight = Math.min(10, commentCount * 3);

  const confidenceScore = Math.min(100, statusWeight + reproductionWeight + evidenceWeight + discussionWeight);

  let confidenceLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERIFIED' = 'LOW';
  if (issue.status === 'VERIFIED') {
    confidenceLevel = 'VERIFIED';
  } else if (confidenceScore >= 75) {
    confidenceLevel = 'HIGH';
  } else if (confidenceScore >= 45) {
    confidenceLevel = 'MEDIUM';
  }

  const explanation = issue.status === 'RESOLVED'
    ? `Issue status is RESOLVED (Developer marked resolved), but resolution confidence is rated ${confidenceLevel} (${confidenceScore}/100) pending formal verification. Verification state: ${verificationState}.`
    : `Resolution confidence evaluated at ${confidenceScore}/100 (${confidenceLevel}). Verification state: ${verificationState}.`;

  return {
    confidenceScore,
    confidenceLevel,
    factors: {
      statusWeight,
      reproductionWeight,
      verificationState,
      evidenceWeight
    },
    explanation
  };
}
