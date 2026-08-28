import { extractBugDna } from './bug-dna/index.js';
import { performTriage } from './triage/index.js';
import { extractReproductionCapsule } from './reproduction/index.js';
import { evaluateResolutionConfidence } from './resolution/index.js';
import { calculateIssueRisk } from './risk/index.js';
import type { IntelligenceResult } from './types.js';

interface RawIssueContext {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: string;
  severity: string;
  priority: string;
  issueType: string;
  component?: string | null;
  version?: string | null;
  reporterId: string;
  assigneeId?: string | null;
  releaseId?: string | null;
  hasBlockedDependencies?: boolean;
  commentCount?: number;
}

export async function analyzeIssueWithIntelligence(issue: RawIssueContext): Promise<IntelligenceResult> {
  const provider = process.env.AI_PROVIDER || 'deterministic';
  const model = process.env.AI_MODEL || 'v1-deterministic';

  try {
    // 1. Extract Bug DNA
    const dna = extractBugDna({
      title: issue.title,
      description: issue.description,
      component: issue.component,
      issueType: issue.issueType,
      severity: issue.severity
    });

    // 2. Perform AI Triage
    const triage = performTriage({
      title: issue.title,
      description: issue.description,
      severity: issue.severity,
      priority: issue.priority,
      issueType: issue.issueType
    }, dna);

    // 3. Extract Reproduction Capsule
    const reproductionCapsule = extractReproductionCapsule({
      title: issue.title,
      description: issue.description
    });

    // 4. Evaluate Resolution Confidence
    const resolutionConfidence = evaluateResolutionConfidence(
      { id: issue.id, status: issue.status },
      reproductionCapsule,
      issue.commentCount || 0
    );

    // 5. Calculate Risk Score
    const risk = calculateIssueRisk(
      {
        id: issue.id,
        severity: issue.severity,
        priority: issue.priority,
        status: issue.status,
        issueType: issue.issueType,
        hasBlockedDependencies: issue.hasBlockedDependencies,
        releaseId: issue.releaseId
      },
      dna
    );

    return {
      issueId: issue.id,
      provider: provider === 'deterministic' ? 'deterministic-fallback' : provider,
      model,
      bugDna: dna,
      triage,
      reproductionCapsule,
      resolutionConfidence,
      risk,
      analyzedAt: new Date().toISOString()
    };
  } catch (err) {
    // Fail-safe deterministic fallback in case of unexpected processing error
    const fallbackDna = extractBugDna({ title: issue.title, description: issue.description });
    const fallbackRisk = calculateIssueRisk({
      id: issue.id, severity: issue.severity, priority: issue.priority, status: issue.status, issueType: issue.issueType
    }, fallbackDna);

    return {
      issueId: issue.id,
      provider: 'deterministic-fallback-emergency',
      model: 'v1-safe',
      bugDna: fallbackDna,
      triage: performTriage({ title: issue.title, description: issue.description }, fallbackDna),
      reproductionCapsule: extractReproductionCapsule({ title: issue.title, description: issue.description }),
      resolutionConfidence: evaluateResolutionConfidence({ id: issue.id, status: issue.status }, extractReproductionCapsule({ title: issue.title, description: issue.description })),
      risk: fallbackRisk,
      analyzedAt: new Date().toISOString()
    };
  }
}
