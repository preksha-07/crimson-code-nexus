import { test } from 'node:test';
import assert from 'node:assert';
import { scanText, redactText } from '../../../src/security/secrets/sentinel.js';

test('Secret Sentinel - Detector & Redactor Tests', async (t) => {

  await t.test('scanText - obvious fake AWS secret', () => {
    const text = 'Debugging connection using AWS access key: AKIA1234567890ABCDEF and custom api key: aws_api_key_mysecretvalue12345';
    const findings = scanText(text, { issueId: 'BUG-101', source: 'issue_description' });
    
    assert.strictEqual(findings.length, 2);
    
    // Check fields of first finding
    const f1 = findings[0];
    assert.ok(f1.id.startsWith('sec_'));
    assert.strictEqual(f1.issueId, 'BUG-101');
    assert.strictEqual(f1.type, 'POSSIBLE_SECRET');
    assert.strictEqual(f1.severity, 'HIGH');
    assert.strictEqual(f1.confidence, 0.98);
    assert.strictEqual(f1.source, 'issue_description');
    assert.strictEqual(f1.action, 'REDACT_RECOMMENDED');
    assert.ok(f1.createdAt);
  });

  await t.test('scanText - password assignment vs normal prose text', () => {
    const codeText = 'Database configuration details:\nDB_PASSWORD = "mySuperSecurePass123"\nport = 5432';
    const findingsCode = scanText(codeText, { issueId: 'BUG-102', source: 'comment_scan' });
    assert.strictEqual(findingsCode.length, 1);
    assert.strictEqual(findingsCode[0].severity, 'HIGH');
    assert.strictEqual(findingsCode[0].confidence, 0.85);

    // Normal text containing the word 'password' in prose should not trigger finding
    const proseText = 'Please make sure to reset your password after logging in for the first time.';
    const findingsProse = scanText(proseText, { issueId: 'BUG-102', source: 'comment_scan' });
    assert.strictEqual(findingsProse.length, 0);
  });

  await t.test('scanText - multiline PEM private key block', () => {
    const text = 'Here is the client private key:\n-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC3\n-----END PRIVATE KEY-----\nLet me know if it works.';
    const findings = scanText(text);
    assert.strictEqual(findings.length, 1);
    assert.strictEqual(findings[0].severity, 'CRITICAL');
    assert.strictEqual(findings[0].confidence, 0.99);
  });

  await t.test('redactText - API keys, tokens, and passwords', () => {
    const text = 'My AWS ID is AKIA1234567890ABCDEF, Bearer Token: bearer_secret_token_12345, DB_PASSWORD = "secret_pass_value_123"';
    const redacted = redactText(text);

    // Verify secrets are replaced
    assert.ok(!redacted.includes('AKIA1234567890ABCDEF'));
    assert.ok(!redacted.includes('bearer_secret_token_12345'));
    assert.ok(!redacted.includes('secret_pass_value_123'));

    // Verify structure and placeholders are correct
    assert.ok(redacted.includes('[REDACTED_AWS_ACCESS_KEY]'));
    assert.ok(redacted.includes('[REDACTED_BEARER_OAUTH_TOKEN]'));
    assert.ok(redacted.includes('DB_PASSWORD = "[REDACTED_PASSWORD]"'));

    // Verify non-secret strings are preserved
    assert.ok(redacted.includes('My AWS ID is'));
  });

  await t.test('redactText - multiline private key block', () => {
    const text = 'Check this key:\n-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC3\n-----END PRIVATE KEY-----\nThanks.';
    const redacted = redactText(text);

    assert.ok(!redacted.includes('MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC3'));
    assert.ok(redacted.includes('[REDACTED_PEM_PRIVATE_KEY]'));
    assert.ok(redacted.includes('Check this key:\n[REDACTED_PEM_PRIVATE_KEY]\nThanks.'));
  });

  await t.test('redactText - empty or invalid inputs', () => {
    assert.strictEqual(redactText(''), '');
    assert.strictEqual(redactText(null), null);
    assert.strictEqual(redactText(undefined), undefined);
  });
});
