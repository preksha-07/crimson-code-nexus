import { EyeOff } from 'lucide-react';

interface SecretSentinelProps {
  content: string;
}

// Client-side parser rules
const REDACTION_RULES = [
  {
    name: 'Slack API Token',
    regex: /xox[bapr]-[0-9]{12}-[a-zA-Z0-9]{24}/g
  },
  {
    name: 'AWS Access Key',
    regex: /AKIA[0-9A-Z]{16}/g
  },
  {
    name: 'NEXUS Secret Token',
    regex: /nexus-session-token-[a-zA-Z0-9]{6,12}/g
  }
];

export default function SecretSentinel({ content }: SecretSentinelProps) {
  if (!content) return null;

  let hasLeaked = false;
  let parsedContent = content;
  let detectedType = '';

  REDACTION_RULES.forEach(rule => {
    rule.regex.lastIndex = 0;
    const match = rule.regex.exec(content);
    if (match) {
      hasLeaked = true;
      detectedType = rule.name;
      
      const secret = match[0];
      parsedContent = parsedContent.replace(secret, `[SECRET DETECTED: ${rule.name}] (Redacted)`);
    }
  });

  // Check general password patterns too
  const passRegex = /(?:password|passwd|secret|api_key|apikey)\s*[:=]\s*["']([^"']{8,})["']/gi;
  let passMatch;
  passRegex.lastIndex = 0;
  if ((passMatch = passRegex.exec(content)) !== null) {
    hasLeaked = true;
    detectedType = 'Plaintext Credential';
    const secretValue = passMatch[1];
    parsedContent = parsedContent.replace(secretValue, '******** (Redacted for Security)');
  }

  if (!hasLeaked) {
    return <span>{content}</span>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
      {/* Redacted text box */}
      <span style={{ color: 'var(--text-secondary)' }}>{parsedContent}</span>
      
      {/* Warning label */}
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        backgroundColor: 'rgba(244, 63, 94, 0.08)',
        border: '1px solid rgba(244, 63, 94, 0.2)',
        borderRadius: 'var(--border-radius-sm)',
        padding: '2px 6px',
        color: 'var(--color-ruby)',
        fontSize: '10px',
        fontWeight: 600,
        fontFamily: 'var(--font-mono)',
        width: 'fit-content',
        marginTop: '4px'
      }}>
        <EyeOff size={10} /> SECRET SENTINEL: Redacted {detectedType} Leak
      </span>
    </div>
  );
}
export { REDACTION_RULES };
