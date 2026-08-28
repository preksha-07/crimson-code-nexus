/**
 * Secret Detection Rules for Secret Sentinel.
 * 
 * Rules are deterministic regexes paired with a confidence rating (0.0 to 1.0)
 * and severity ratings.
 */

export const SECRET_RULES = [
  {
    name: 'AWS_ACCESS_KEY',
    regex: /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g,
    confidence: 0.98,
    severity: 'HIGH',
    description: 'AWS Access Key ID'
  },
  {
    name: 'AWS_API_KEY_OR_SECRET',
    regex: /aws_api_key_[a-zA-Z0-9_]{16,40}/gi,
    confidence: 0.95,
    severity: 'HIGH',
    description: 'AWS Secret Access Key or Custom API Key'
  },
  {
    name: 'BEARER_OAUTH_TOKEN',
    regex: /(?:bearer|oauth|token|auth_token|secret_token)_[a-zA-Z0-9_]{16,80}/gi,
    confidence: 0.92,
    severity: 'HIGH',
    description: 'OAuth / Bearer authentication token'
  },
  {
    name: 'PEM_PRIVATE_KEY',
    regex: /-----BEGIN[A-Z0-9\s_]+PRIVATE KEY-----[\s\S]+?-----END[A-Z0-9\s_]+PRIVATE KEY-----/gi,
    confidence: 0.99,
    severity: 'CRITICAL',
    description: 'PEM Private Key block'
  },
  {
    name: 'PASSWORD_ASSIGNMENT',
    // Matches patterns like DB_PASSWORD = "value" or password: "value", ignoring plain prose
    regex: /\b[a-z0-9_]*(?:password|passwd|pwd|db_pass)\b\s*[:=]\s*["']([^"'\s]{8,64})["']/gi,
    confidence: 0.85,
    severity: 'HIGH',
    description: 'Password assignment with strong code/config context'
  },
  {
    name: 'GENERIC_API_KEY',
    regex: /\b(?:api[_-]?key|client[_-]?secret|auth[_-]?key)\s*[:=]\s*["']([a-zA-Z0-9_\-\.]{16,64})["']/gi,
    confidence: 0.90,
    severity: 'HIGH',
    description: 'Generic API Key or client secret assignment'
  }
];
