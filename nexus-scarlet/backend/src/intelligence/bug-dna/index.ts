import type { BugDna } from '../types.js';

interface RawIssueData {
  title: string;
  description: string;
  component?: string | null;
  issueType?: string | null;
  severity?: string | null;
}

export function extractBugDna(issue: RawIssueData): BugDna {
  const text = `${issue.title} ${issue.description}`.toLowerCase();

  // Determine security relevance
  const securityKeywords = ['auth', 'unicode', 'csv', 'token', 'permission', 'xss', 'sql', 'injection', 'security', 'sanitize', 'vulnerability', 'exploit', 'leak', 'access'];
  const isSecurityRelevant = issue.issueType === 'SECURITY' || securityKeywords.some(kw => text.includes(kw));

  // Determine failure type
  let failureType = 'unknown';
  if (text.includes('mismatch') || text.includes('normalization')) failureType = 'identity_mismatch';
  else if (text.includes('failure') || text.includes('fails') || text.includes('failed')) failureType = 'functional_failure';
  else if (text.includes('crash') || text.includes('exception') || text.includes('error')) failureType = 'runtime_exception';
  else if (text.includes('expose') || text.includes('leak') || text.includes('unsafe')) failureType = 'data_exposure';
  else if (text.includes('timeout') || text.includes('slow')) failureType = 'performance_degradation';

  // Determine input type
  let inputType = 'standard';
  if (text.includes('unicode') || text.includes('utf') || text.includes('character')) inputType = 'unicode';
  else if (text.includes('csv') || text.includes('export') || text.includes('file') || text.includes('upload')) inputType = 'file_payload';
  else if (text.includes('api') || text.includes('json') || text.includes('payload')) inputType = 'structured_data';
  else if (text.includes('auth') || text.includes('token') || text.includes('credential')) inputType = 'authentication_credentials';

  // Determine impact
  let impact = 'low_impact';
  if (text.includes('authentication failure') || text.includes('cannot authenticate')) impact = 'authentication_failure';
  else if (text.includes('private') || text.includes('expose') || text.includes('leak')) impact = 'data_leakage';
  else if (text.includes('unsafe') || text.includes('executable')) impact = 'code_execution_risk';
  else if (issue.severity === 'CRITICAL' || issue.severity === 'HIGH') impact = 'high_severity_disruption';

  // Determine environment
  let environment: string | null = null;
  if (text.includes('production') || text.includes('prod')) environment = 'production';
  else if (text.includes('staging')) environment = 'staging';
  else if (text.includes('docker') || text.includes('container')) environment = 'containerized';
  else if (text.includes('node') || text.includes('browser')) environment = 'web_runtime';

  return {
    component: issue.component || 'unspecified',
    failureType,
    inputType,
    impact,
    securityRelevant: isSecurityRelevant,
    environment
  };
}
