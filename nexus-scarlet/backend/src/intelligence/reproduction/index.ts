import type { ReproductionCapsule } from '../types.js';

interface RawIssueData {
  title: string;
  description: string;
}

export function extractReproductionCapsule(issue: RawIssueData): ReproductionCapsule {
  const desc = issue.description;

  // Extract environment
  let environment = 'unknown';
  const envMatch = desc.match(/(?:environment|env|version|platform|os):\s*([^\n]+)/i);
  if (envMatch) {
    environment = envMatch[1].trim();
  } else if (desc.toLowerCase().includes('docker')) {
    environment = 'Docker Container';
  } else if (desc.toLowerCase().includes('windows')) {
    environment = 'Windows OS';
  } else if (desc.toLowerCase().includes('linux') || desc.toLowerCase().includes('ubuntu')) {
    environment = 'Linux OS';
  }

  // Extract steps
  const steps: string[] = [];
  const lines = desc.split('\n');
  let readingSteps = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.match(/^(?:steps to reproduce|reproduction steps|steps):/i)) {
      readingSteps = true;
      continue;
    }
    if (readingSteps) {
      if (trimmed.match(/^(?:expected|actual|result|notes):/i) || trimmed === '') {
        readingSteps = false;
      } else if (trimmed.match(/^(?:\d+\.|\*|-)/)) {
        steps.push(trimmed.replace(/^(?:\d+\.|\*|-)\s*/, ''));
      }
    }
  }

  if (steps.length === 0) {
    // Fallback step generation from title/description context
    steps.push(`Submit payload/input associated with '${issue.title}'`);
    steps.push('Observe system response and check logs');
  }

  // Extract expected vs actual
  let expectedResult = 'unknown';
  const expMatch = desc.match(/(?:expected result|expected behavior|expected):\s*([^\n]+)/i);
  if (expMatch) {
    expectedResult = expMatch[1].trim();
  } else {
    expectedResult = 'System completes request without error or identity mismatch.';
  }

  let actualResult = 'unknown';
  const actMatch = desc.match(/(?:actual result|actual behavior|actual):\s*([^\n]+)/i);
  if (actMatch) {
    actualResult = actMatch[1].trim();
  } else {
    actualResult = issue.title;
  }

  const evidenceProvided = desc.toLowerCase().includes('log') ||
    desc.toLowerCase().includes('stack') ||
    desc.toLowerCase().includes('reproduce') ||
    desc.toLowerCase().includes('trace');

  return {
    environment,
    steps,
    expectedResult,
    actualResult,
    evidenceProvided
  };
}
