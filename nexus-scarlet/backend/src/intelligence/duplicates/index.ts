import type { DuplicateCandidate, RelatedIssueCandidate } from '../types.js';

interface IssueRecord {
  id: string;
  projectId: string;
  title: string;
  description: string;
  component?: string | null;
  issueType?: string | null;
  status: string;
}

function tokenize(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);
  return new Set(words);
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function findDuplicates(
  target: IssueRecord,
  allIssues: IssueRecord[],
  threshold = 0.35
): DuplicateCandidate[] {
  const targetTokens = tokenize(`${target.title} ${target.description}`);
  const candidates: DuplicateCandidate[] = [];

  for (const issue of allIssues) {
    if (issue.id === target.id) continue;

    const issueTokens = tokenize(`${issue.title} ${issue.description}`);
    let score = jaccardSimilarity(targetTokens, issueTokens);

    // Boost score if components and issue types match
    if (target.component && issue.component && target.component === issue.component) {
      score += 0.15;
    }
    if (target.issueType && issue.issueType && target.issueType === issue.issueType) {
      score += 0.10;
    }

    score = Math.min(1.0, Math.round(score * 100) / 100);

    if (score >= threshold) {
      candidates.push({
        issueId: issue.id,
        similarityScore: score,
        title: issue.title,
        status: issue.status,
        reason: `High term overlap (${Math.round(score * 100)}% similarity)${
          target.component === issue.component ? ' and identical component' : ''
        }`
      });
    }
  }

  return candidates.sort((a, b) => b.similarityScore - a.similarityScore);
}

export function findRelatedIssues(
  target: IssueRecord,
  allIssues: IssueRecord[],
  dependencies: Array<{ issueId: string; dependsOnIssueId: string; relation: string }> = []
): RelatedIssueCandidate[] {
  const targetTokens = tokenize(`${target.title} ${target.description}`);
  const candidates: RelatedIssueCandidate[] = [];

  for (const issue of allIssues) {
    if (issue.id === target.id) continue;

    const issueTokens = tokenize(`${issue.title} ${issue.description}`);
    const tokenSim = jaccardSimilarity(targetTokens, issueTokens);

    // Check if there is an explicit dependency relation
    const directDep = dependencies.find(
      d => (d.issueId === target.id && d.dependsOnIssueId === issue.id) ||
           (d.dependsOnIssueId === target.id && d.issueId === issue.id)
    );

    let relevanceScore = tokenSim;
    let signal = 'SHARED_TERMS';
    let reason = 'Overlapping terminology and context';

    if (directDep) {
      relevanceScore = Math.max(relevanceScore, 0.90);
      signal = `EXPLICIT_DEPENDENCY_${directDep.relation}`;
      reason = `Explicit ${directDep.relation} dependency relationship established`;
    } else if (target.component && issue.component && target.component === issue.component) {
      relevanceScore = Math.max(relevanceScore, 0.50);
      signal = 'SAME_COMPONENT';
      reason = `Belongs to identical component (${target.component})`;
    }

    relevanceScore = Math.min(1.0, Math.round(relevanceScore * 100) / 100);

    if (relevanceScore >= 0.20) {
      candidates.push({
        issueId: issue.id,
        relevanceScore,
        relationshipSignal: signal,
        reason,
        title: issue.title,
        status: issue.status
      });
    }
  }

  return candidates.sort((a, b) => b.relevanceScore - a.relevanceScore);
}
