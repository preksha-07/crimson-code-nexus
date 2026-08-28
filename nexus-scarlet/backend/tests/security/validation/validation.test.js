import { test } from 'node:test';
import assert from 'node:assert';
import { validate } from '../../../src/security/validation/validator.js';

test('Validation Layer Tests', async (t) => {

  await t.test('LoginRequest validation - valid payload', () => {
    const payload = {
      username: 'nexus_user-123',
      password: 'superSecretPassword'
    };
    const result = validate('LoginRequest', payload);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.errors.length, 0);
    assert.strictEqual(result.value.username, 'nexus_user-123');
    assert.strictEqual(result.value.password, 'superSecretPassword');
  });

  await t.test('LoginRequest validation - missing required fields', () => {
    const payload = {
      username: 'nexus_user'
    };
    const result = validate('LoginRequest', payload);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.includes("Field 'password' is required"));
  });

  await t.test('LoginRequest validation - wrong types', () => {
    const payload = {
      username: 12345, // should be string
      password: 'superSecretPassword'
    };
    const result = validate('LoginRequest', payload);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('must be a string')));
  });

  await t.test('CreateIssueRequest validation - invalid enum', () => {
    const payload = {
      title: 'Vulnerability in authentication',
      description: 'A long description of the auth bug exceeding 10 characters.',
      project: 'core-auth',
      severity: 'CRITICAL_VULN_LEVEL' // invalid enum
    };
    const result = validate('CreateIssueRequest', payload);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('must be one of')));
  });

  await t.test('CreateCommentRequest validation - oversized value', () => {
    const payload = {
      issueId: 'BUG-101',
      content: 'A'.repeat(6000) // limit is 5000 chars
    };
    const result = validate('CreateCommentRequest', payload);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('must not exceed')));
  });

  await t.test('AttachmentMetadata validation - malformed filename', () => {
    const payload = {
      filename: '../../etc/passwd', // traversal attempt
      mimeType: 'image/png',
      size: 5042
    };
    const result = validate('AttachmentMetadata', payload);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('malformed or contains invalid characters')));
  });

  await t.test('Unexpected fields injection check', () => {
    const payload = {
      username: 'admin',
      password: 'password123',
      isAdmin: true, // unexpected field
      sqlInjection: 'SELECT * FROM users;' // unexpected field
    };
    const result = validate('LoginRequest', payload);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.includes("Unexpected field 'isAdmin' is not allowed"));
  });

  await t.test('Unicode input handling', () => {
    const payload = {
      username: 'u\u00f1icode_user', // ñ Cyrillic or Unicode standard Latin small letter n with tilde
      password: 'unicodePassword123'
    };
    const result = validate('LoginRequest', payload);
    // ñ is not in the alphanumeric regex pattern [a-zA-Z0-9_\-\.]+
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('malformed')));
  });

  await t.test('Strict whitespace handling - no silent trimming', () => {
    // A username with a trailing space should fail pattern check, not get silently trimmed
    const badPayload = {
      username: 'nexus_user ',
      password: 'superSecretPassword'
    };
    const result = validate('LoginRequest', badPayload);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('malformed or contains invalid characters')));

    // A password with leading/trailing spaces is kept raw (not trimmed)
    const validWithSpaces = {
      username: 'nexus_user',
      password: ' passwordWithSpaces '
    };
    const resultOk = validate('LoginRequest', validWithSpaces);
    assert.strictEqual(resultOk.valid, true);
    assert.strictEqual(resultOk.value.password, ' passwordWithSpaces '); // verifies raw preservation
  });
});
