import { query } from '../db/pool.js';
import { getIssue } from '../issues/service.js';
import { analyzeIssueWithIntelligence } from './provider.js';
import { findDuplicates, findRelatedIssues } from './duplicates/index.js';
import { calculateReleaseRisk } from './risk/index.js';
import { extractBugDna } from './bug-dna/index.js';
import { HttpError } from '../shared/http.js';
import type { IntelligenceResult } from './types.js';

export async function analyzeIssue(issueId: string): Promise<IntelligenceResult> {
  const issue = await getIssue(issueId);

  // Check if issue has blocked dependencies
  const depRes = await query('SELECT 1 FROM issue_dependencies WHERE issue_id=$1 AND relation=$2', [issueId, 'BLOCKS']);
  const hasBlockedDependencies = (depRes.rowCount ?? 0) > 0;

  // Check comment count
  const comRes = await query('SELECT COUNT(*)::int as count FROM issue_comments WHERE issue_id=$1', [issueId]);
  const commentCount = comRes.rows[0]?.count || 0;

  const result = await analyzeIssueWithIntelligence({
    id: issue.id as string,
    projectId: issue.projectId as string,
    title: issue.title as string,
    description: issue.description as string,
    status: issue.status as string,
    severity: issue.severity as string,
    priority: issue.priority as string,
    issueType: issue.issueType as string,
    component: issue.component as string | null,
    version: issue.version as string | null,
    reporterId: issue.reporterId as string,
    assigneeId: issue.assigneeId as string | null,
    releaseId: issue.releaseId as string | null,
    hasBlockedDependencies,
    commentCount
  });

  // Persist result to database
  const recordId = `ai_${Date.now().toString(36)}`;
  try {
    await query(
      `INSERT INTO ai_analysis (id, issue_id, provider, model, bug_dna, triage_suggestion, reproduction_capsule, resolution_confidence, risk_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO NOTHING`,
      [
        recordId,
        issueId,
        result.provider,
        result.model,
        JSON.stringify(result.bugDna),
        JSON.stringify(result.triage),
        JSON.stringify(result.reproductionCapsule),
        JSON.stringify(result.resolutionConfidence),
        JSON.stringify(result.risk)
      ]
    );
  } catch (err) {
    // If DB is offline or write fails, proceed cleanly returning in-memory result
  }

  return result;
}

export async function getIntelligence(issueId: string): Promise<IntelligenceResult> {
  return analyzeIssue(issueId);
}

export async function getIssueDuplicates(issueId: string) {
  const target = await getIssue(issueId);
  const res = await query('SELECT id, project_id, title, description, component, issue_type, status FROM issues WHERE project_id=$1', [target.projectId]);

  const allIssues = res.rows.map(r => ({
    id: r.id as string,
    projectId: r.project_id as string,
    title: r.title as string,
    description: r.description as string,
    component: r.component as string | null,
    issueType: r.issue_type as string | null,
    status: r.status as string
  }));

  return findDuplicates(
    {
      id: target.id as string,
      projectId: target.projectId as string,
      title: target.title as string,
      description: target.description as string,
      component: target.component as string | null,
      issueType: target.issueType as string | null,
      status: target.status as string
    },
    allIssues
  );
}

export async function getIssueRelated(issueId: string) {
  const target = await getIssue(issueId);
  const issuesRes = await query('SELECT id, project_id, title, description, component, issue_type, status FROM issues WHERE project_id=$1', [target.projectId]);
  const depsRes = await query(
    `SELECT d.issue_id, d.depends_on_issue_id, d.relation
     FROM issue_dependencies d
     JOIN issues i1 ON i1.id = d.issue_id
     JOIN issues i2 ON i2.id = d.depends_on_issue_id
     WHERE i1.project_id = $1 AND i2.project_id = $1`,
    [target.projectId]
  );

  const allIssues = issuesRes.rows.map(r => ({
    id: r.id as string,
    projectId: r.project_id as string,
    title: r.title as string,
    description: r.description as string,
    component: r.component as string | null,
    issueType: r.issue_type as string | null,
    status: r.status as string
  }));

  const dependencies = depsRes.rows.map(r => ({
    issueId: r.issue_id as string,
    dependsOnIssueId: r.depends_on_issue_id as string,
    relation: r.relation as string
  }));

  return findRelatedIssues(
    {
      id: target.id as string,
      projectId: target.projectId as string,
      title: target.title as string,
      description: target.description as string,
      component: target.component as string | null,
      issueType: target.issueType as string | null,
      status: target.status as string
    },
    allIssues,
    dependencies
  );
}

export async function getIssueReproductionCapsule(issueId: string) {
  const intel = await getIntelligence(issueId);
  return intel.reproductionCapsule;
}

export async function getIssueResolutionConfidence(issueId: string) {
  const intel = await getIntelligence(issueId);
  return intel.resolutionConfidence;
}

export async function getReleaseRiskScore(releaseId: string) {
  // Check if release exists
  const relRes = await query('SELECT id FROM releases WHERE id=$1', [releaseId]);
  if (!relRes.rowCount) throw new HttpError(404, 'RELEASE_NOT_FOUND', 'Release does not exist.');

  const issuesRes = await query(
    'SELECT id, title, description, severity, priority, status, issue_type, component, release_id FROM issues WHERE release_id=$1',
    [releaseId]
  );

  const depsRes = await query(
    `SELECT DISTINCT d.issue_id
     FROM issue_dependencies d
     JOIN issues i ON i.id = d.issue_id
     WHERE d.relation=$1 AND i.release_id=$2`,
    ['BLOCKS', releaseId]
  );
  const blockedIds = new Set(depsRes.rows.map(r => r.issue_id as string));

  const issueContexts = issuesRes.rows.map(r => {
    const dna = extractBugDna({
      title: r.title as string,
      description: r.description as string,
      component: r.component as string | null,
      issueType: r.issue_type as string | null,
      severity: r.severity as string | null
    });

    return {
      id: r.id as string,
      severity: r.severity as string,
      priority: r.priority as string,
      status: r.status as string,
      issueType: r.issue_type as string,
      hasBlockedDependencies: blockedIds.has(r.id as string),
      releaseId: r.release_id as string | null,
      dna
    };
  });

  return calculateReleaseRisk(releaseId, issueContexts);
}
