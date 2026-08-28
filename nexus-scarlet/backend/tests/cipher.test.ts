import { describe, it, expect } from 'vitest';
import { extractBugDna } from '../src/intelligence/bug-dna/index.js';
import { performTriage } from '../src/intelligence/triage/index.js';
import { findDuplicates, findRelatedIssues } from '../src/intelligence/duplicates/index.js';
import { calculateIssueRisk, calculateReleaseRisk } from '../src/intelligence/risk/index.js';
import { extractReproductionCapsule } from '../src/intelligence/reproduction/index.js';
import { evaluateResolutionConfidence } from '../src/intelligence/resolution/index.js';

describe('CIPHER Intelligence Unit Tests', () => {

  describe('Bug DNA Extraction', () => {
    it('extracts DNA for normal functional bug', () => {
      const dna = extractBugDna({
        title: 'Button click handler fails',
        description: 'Clicking submit throws a runtime error in browser.',
        component: 'ui-components',
        issueType: 'BUG'
      });
      expect(dna.component).toBe('ui-components');
      expect(dna.securityRelevant).toBe(false);
      expect(dna.failureType).toBe('functional_failure');
    });

    it('extracts DNA for Unicode & security-relevant issue', () => {
      const dna = extractBugDna({
        title: 'Unicode authentication failure',
        description: 'Valid Unicode-normalized identity cannot authenticate.',
        component: 'authentication',
        issueType: 'SECURITY',
        severity: 'HIGH'
      });
      expect(dna.component).toBe('authentication');
      expect(dna.securityRelevant).toBe(true);
      expect(dna.inputType).toBe('unicode');
      expect(dna.impact).toBe('authentication_failure');
    });

    it('handles missing/minimal information safely', () => {
      const dna = extractBugDna({ title: 'vague issue', description: '' });
      expect(dna.component).toBe('unspecified');
      expect(dna.securityRelevant).toBe(false);
      expect(dna.environment).toBeNull();
    });
  });

  describe('AI Triage', () => {
    it('provides deterministic security triage suggestions', () => {
      const dna = extractBugDna({
        title: 'SQL injection in search API',
        description: 'Unsanitized input allows bypass.',
        issueType: 'SECURITY'
      });
      const triage = performTriage({
        title: 'SQL injection in search API',
        description: 'Unsanitized input allows bypass.'
      }, dna);

      expect(triage.category).toBe('SECURITY_VULNERABILITY');
      expect(triage.suggestedOwnerRole).toBe('SECURITY_REVIEWER');
      expect(triage.riskFactor).toBeGreaterThanOrEqual(85);
    });

    it('provides fallback classification for general bugs', () => {
      const dna = extractBugDna({ title: 'Slow rendering', description: 'Table takes 5s' });
      const triage = performTriage({ title: 'Slow rendering', description: 'Table takes 5s' }, dna);

      expect(triage.category).toBe('PERFORMANCE');
      expect(triage.suggestedPriority).toBe('P2');
      expect(triage.confidence).toBe(0.90);
    });
  });

  describe('Duplicate Detection', () => {
    const issueList = [
      {
        id: 'BUG-100',
        projectId: 'proj_01',
        title: 'Unicode authentication failure',
        description: 'Valid Unicode identity cannot authenticate.',
        component: 'authentication',
        issueType: 'BUG',
        status: 'REPORTED'
      },
      {
        id: 'BUG-101',
        projectId: 'proj_01',
        title: 'Unicode auth login error',
        description: 'Valid Unicode identity cannot authenticate login.',
        component: 'authentication',
        issueType: 'BUG',
        status: 'TRIAGED'
      },
      {
        id: 'BUG-200',
        projectId: 'proj_01',
        title: 'Database connection pool exhausted',
        description: 'Too many open connections during peak load.',
        component: 'database',
        issueType: 'BUG',
        status: 'OPEN'
      }
    ];

    it('detects obvious duplicates based on similarity and component', () => {
      const duplicates = findDuplicates(issueList[0], issueList, 0.35);
      expect(duplicates.length).toBe(1);
      expect(duplicates[0].issueId).toBe('BUG-101');
      expect(duplicates[0].similarityScore).toBeGreaterThanOrEqual(0.50);
    });

    it('ignores unrelated issues', () => {
      const duplicates = findDuplicates(issueList[2], issueList, 0.35);
      expect(duplicates.length).toBe(0);
    });
  });

  describe('Related Issue Detection', () => {
    const issueList = [
      { id: 'BUG-100', projectId: 'proj_01', title: 'Auth service down', description: 'Service crash', component: 'auth', status: 'REPORTED' },
      { id: 'BUG-101', projectId: 'proj_01', title: 'Token validation fails', description: 'Auth token rejected', component: 'auth', status: 'TRIAGED' },
      { id: 'BUG-300', projectId: 'proj_01', title: 'Unrelated frontend CSS typo', description: 'Color mismatch', component: 'ui', status: 'OPEN' }
    ];

    it('identifies related issues sharing components and terms', () => {
      const related = findRelatedIssues(issueList[0], issueList);
      expect(related.some(r => r.issueId === 'BUG-101')).toBe(true);
      expect(related.some(r => r.issueId === 'BUG-300')).toBe(false);
    });

    it('prioritizes explicit dependencies', () => {
      const deps = [{ issueId: 'BUG-100', dependsOnIssueId: 'BUG-300', relation: 'BLOCKS' }];
      const related = findRelatedIssues(issueList[0], issueList, deps);
      const depMatch = related.find(r => r.issueId === 'BUG-300');
      expect(depMatch).toBeDefined();
      expect(depMatch?.relevanceScore).toBe(0.90);
    });
  });

  describe('Risk Engine', () => {
    it('computes reproducible risk score with transparent breakdown', () => {
      const dna = extractBugDna({ title: 'Critical Auth Leak', description: 'Exposes private keys', issueType: 'SECURITY', severity: 'CRITICAL' });
      const risk1 = calculateIssueRisk({ id: 'BUG-999', severity: 'CRITICAL', priority: 'P0', status: 'REPORTED', issueType: 'SECURITY', hasBlockedDependencies: true }, dna);
      const risk2 = calculateIssueRisk({ id: 'BUG-999', severity: 'CRITICAL', priority: 'P0', status: 'REPORTED', issueType: 'SECURITY', hasBlockedDependencies: true }, dna);

      expect(risk1.overallScore).toBe(risk2.overallScore);
      expect(risk1.riskLevel).toBe('CRITICAL');
      expect(risk1.factors.severityWeight).toBe(40);
      expect(risk1.factors.priorityWeight).toBe(25);
    });

    it('assigns low risk for resolved/verified low severity issues', () => {
      const dna = extractBugDna({ title: 'Typo in docs', description: 'Small typo' });
      const risk = calculateIssueRisk({ id: 'BUG-001', severity: 'LOW', priority: 'P4', status: 'VERIFIED', issueType: 'BUG' }, dna);

      expect(risk.riskLevel).toBe('LOW');
      expect(risk.overallScore).toBeLessThan(35);
    });
  });

  describe('Reproduction Capsule', () => {
    it('extracts steps, environment, and results from description', () => {
      const desc = `
Environment: Linux Ubuntu 22.04
Steps to reproduce:
1. Open login page
2. Enter Unicode username
3. Click submit
Expected result: Successful login
Actual result: 500 Server Error
      `;
      const capsule = extractReproductionCapsule({ title: 'Login fails', description: desc });

      expect(capsule.environment).toBe('Linux Ubuntu 22.04');
      expect(capsule.steps.length).toBe(3);
      expect(capsule.expectedResult).toBe('Successful login');
      expect(capsule.actualResult).toBe('500 Server Error');
    });

    it('safely handles missing information with "unknown"', () => {
      const capsule = extractReproductionCapsule({ title: 'Vague bug', description: 'Broken' });

      expect(capsule.environment).toBe('unknown');
      expect(capsule.steps.length).toBeGreaterThan(0);
    });
  });

  describe('Resolution Confidence', () => {
    it('distinguishes RESOLVED from VERIFIED', () => {
      const capsule = extractReproductionCapsule({ title: 'Fixed bug', description: 'Done' });

      const resolvedConf = evaluateResolutionConfidence({ id: 'BUG-1', status: 'RESOLVED' }, capsule);
      const verifiedConf = evaluateResolutionConfidence({ id: 'BUG-1', status: 'VERIFIED' }, capsule);

      expect(resolvedConf.confidenceLevel).not.toBe('VERIFIED');
      expect(verifiedConf.confidenceLevel).toBe('VERIFIED');
      expect(verifiedConf.confidenceScore).toBeGreaterThan(resolvedConf.confidenceScore);
    });
  });

  describe('Release Risk Radar', () => {
    it('calculates deterministic release risk score', () => {
      const dnaCritical = extractBugDna({ title: 'Sec issue', description: 'leak', issueType: 'SECURITY', severity: 'CRITICAL' });
      const issues = [
        { id: 'BUG-1', severity: 'CRITICAL', priority: 'P0', status: 'REPORTED', issueType: 'SECURITY', hasBlockedDependencies: true, dna: dnaCritical },
        { id: 'BUG-2', severity: 'HIGH', priority: 'P1', status: 'RESOLVED', issueType: 'BUG', hasBlockedDependencies: false, dna: dnaCritical }
      ];

      const releaseRisk = calculateReleaseRisk('rel_01', issues);

      expect(releaseRisk.releaseId).toBe('rel_01');
      expect(releaseRisk.totalIssues).toBe(2);
      expect(releaseRisk.criticalHighCount).toBe(2);
      expect(releaseRisk.riskLevel).toBe('CRITICAL');
      expect(releaseRisk.overallReleaseRiskScore).toBeGreaterThan(50);
    });
  });
});
