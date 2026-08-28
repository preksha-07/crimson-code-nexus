import { randomUUID } from 'node:crypto';
import { SECRET_RULES } from './rules.js';

/**
 * Scans a block of text for likely credentials and secrets.
 * 
 * @param {string} text - The content to scan (e.g. comment body, issue description).
 * @param {Object} metadata - Context details: { issueId: string, source: string }
 * @returns {Array<Object>} - Array of findings matching the NEXUS finding schema.
 */
export function scanText(text, metadata = {}) {
  const findings = [];
  if (typeof text !== 'string' || !text) {
    return findings;
  }

  const issueId = metadata.issueId || 'BUG-UNKNOWN';
  const source = metadata.source || 'text_scan';

  for (const rule of SECRET_RULES) {
    // Reset regex index for global regexes
    rule.regex.lastIndex = 0;
    
    let match;
    while ((match = rule.regex.exec(text)) !== null) {
      // Prevent infinite loops on zero-width matches
      if (match.index === rule.regex.lastIndex) {
        rule.regex.lastIndex++;
      }

      findings.push({
        id: `sec_${randomUUID().replace(/-/g, '').slice(0, 12)}`,
        issueId,
        type: 'POSSIBLE_SECRET',
        severity: rule.severity,
        confidence: rule.confidence,
        source,
        action: 'REDACT_RECOMMENDED',
        createdAt: new Date().toISOString()
      });
    }
  }

  return findings;
}

/**
 * Standalone utility to redact detected secrets in text, preserving safe structural text.
 * Replaces actual secret values with specific placeholder text.
 * 
 * @param {string} text - The input text containing secrets.
 * @returns {string} - The redacted text.
 */
export function redactText(text) {
  if (typeof text !== 'string' || !text) {
    return text;
  }

  let redacted = text;

  for (const rule of SECRET_RULES) {
    rule.regex.lastIndex = 0;
    
    if (rule.name === 'PASSWORD_ASSIGNMENT' || rule.name === 'GENERIC_API_KEY') {
      // For assignments (e.g., password = "val"), we want to preserve the assignment syntax 
      // but replace the captured password value group.
      redacted = redacted.replace(rule.regex, (match, p1) => {
        // Replace only the secret value p1 with [REDACTED_PASSWORD] or [REDACTED_API_KEY]
        const label = rule.name === 'PASSWORD_ASSIGNMENT' ? '[REDACTED_PASSWORD]' : '[REDACTED_API_KEY]';
        return match.replace(p1, label);
      });
    } else {
      // For keys/tokens, replace the entire match
      redacted = redacted.replace(rule.regex, `[REDACTED_${rule.name}]`);
    }
  }

  return redacted;
}
