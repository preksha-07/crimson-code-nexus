/**
 * Standalone authorization unit tests.
 * 
 * NOTE: These tests validate the DRAFT authorization rules (TEAM DECISION REQUIRED).
 * They do not reflect a finalized NEXUS production policy.
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { authorize } from '../../../src/security/rbac/rbac.js';
import { ROLES, ACTIONS } from '../../../src/security/rbac/roles.js';

test('RBAC Module - Authorization Logic Tests', async (t) => {

  await t.test('ADMIN role allowed and denied permissions', () => {
    const admin = { id: 'usr_admin', role: ROLES.ADMIN };
    const issue = { id: 'bug_101', type: 'issue', isPrivate: false };
    const userResource = { id: 'usr_dev', type: 'user' };

    // Authorized
    assert.strictEqual(authorize(admin, issue, ACTIONS.READ), true);
    assert.strictEqual(authorize(admin, issue, ACTIONS.CREATE), true);
    assert.strictEqual(authorize(admin, issue, ACTIONS.UPDATE), true);
    assert.strictEqual(authorize(admin, issue, ACTIONS.DELETE), true);
    assert.strictEqual(authorize(admin, userResource, ACTIONS.MANAGE_USERS), true);

    // Private Resource (isPrivate: true) should use read_private/update_private mappings
    const privateIssue = { id: 'bug_sec_102', type: 'issue', isPrivate: true };
    assert.strictEqual(authorize(admin, privateIssue, ACTIONS.READ), true);
    assert.strictEqual(authorize(admin, privateIssue, ACTIONS.UPDATE), true);
  });

  await t.test('DEVELOPER role allowed and denied permissions', () => {
    const developer = { id: 'usr_dev', role: ROLES.DEVELOPER };
    const issue = { id: 'bug_101', type: 'issue', isPrivate: false };
    const userResource = { id: 'usr_pm', type: 'user' };

    // Authorized
    assert.strictEqual(authorize(developer, issue, ACTIONS.READ), true);
    assert.strictEqual(authorize(developer, issue, ACTIONS.CREATE), true);
    assert.strictEqual(authorize(developer, issue, ACTIONS.UPDATE), true);

    // Denied
    assert.strictEqual(authorize(developer, issue, ACTIONS.DELETE), false);
    assert.strictEqual(authorize(developer, userResource, ACTIONS.MANAGE_USERS), false);

    // Private Resource (DEVELOPER role does not have read_private in draft matrix)
    const privateIssue = { id: 'bug_sec_102', type: 'issue', isPrivate: true };
    assert.strictEqual(authorize(developer, privateIssue, ACTIONS.READ), false);
    assert.strictEqual(authorize(developer, privateIssue, ACTIONS.UPDATE), false);
  });

  await t.test('PROJECT_MANAGER role permissions', () => {
    const pm = { id: 'usr_pm', role: ROLES.PROJECT_MANAGER };
    const issue = { id: 'bug_101', type: 'issue', isPrivate: false };
    const userResource = { id: 'usr_dev', type: 'user' };

    assert.strictEqual(authorize(pm, issue, ACTIONS.CREATE), true);
    assert.strictEqual(authorize(pm, issue, ACTIONS.EXPORT), true);
    assert.strictEqual(authorize(pm, userResource, ACTIONS.MANAGE_USERS), false); // PMs cannot manage users
    
    // PM is allowed to read private issues in current draft
    const privateIssue = { id: 'bug_sec_102', type: 'issue', isPrivate: true };
    assert.strictEqual(authorize(pm, privateIssue, ACTIONS.READ), true);
  });

  await t.test('SECURITY_REVIEWER role permissions', () => {
    const sec = { id: 'usr_sec', role: ROLES.SECURITY_REVIEWER };
    const issue = { id: 'bug_101', type: 'issue', isPrivate: false };
    const privateIssue = { id: 'bug_sec_102', type: 'issue', isPrivate: true };
    const finding = { id: 'fnd_01', type: 'security_finding' };

    // Can read and update standard + private issues
    assert.strictEqual(authorize(sec, issue, ACTIONS.READ), true);
    assert.strictEqual(authorize(sec, privateIssue, ACTIONS.READ), true);
    assert.strictEqual(authorize(sec, privateIssue, ACTIONS.UPDATE), true);
    
    // Can view security findings
    assert.strictEqual(authorize(sec, finding, ACTIONS.VIEW_SECURITY_FINDINGS), true);
    
    // Cannot delete issues or manage users
    assert.strictEqual(authorize(sec, issue, ACTIONS.DELETE), false);
  });

  await t.test('VIEWER role permissions', () => {
    const viewer = { id: 'usr_view', role: ROLES.VIEWER };
    const issue = { id: 'bug_101', type: 'issue', isPrivate: false };
    const privateIssue = { id: 'bug_sec_102', type: 'issue', isPrivate: true };

    // Authorized
    assert.strictEqual(authorize(viewer, issue, ACTIONS.READ), true);

    // Denied
    assert.strictEqual(authorize(viewer, issue, ACTIONS.CREATE), false);
    assert.strictEqual(authorize(viewer, issue, ACTIONS.UPDATE), false);
    assert.strictEqual(authorize(viewer, privateIssue, ACTIONS.READ), false); // Cannot read private issues
  });

  await t.test('Unknown role or action', () => {
    const userWithBadRole = { id: 'usr_bad', role: 'SUPREME_LEADER' };
    const issue = { id: 'bug_101', type: 'issue', isPrivate: false };

    assert.strictEqual(authorize(userWithBadRole, issue, ACTIONS.READ), false);
    assert.strictEqual(authorize({ id: 'u' }, issue, ACTIONS.READ), false); // missing role
    
    const admin = { id: 'usr_admin', role: ROLES.ADMIN };
    assert.strictEqual(authorize(admin, issue, 'UNKNOWN_ACTION_XYZ'), false);
  });

  await t.test('Malformed input edge cases', () => {
    assert.strictEqual(authorize(null, {}, 'read'), false);
    assert.strictEqual(authorize({ role: 'ADMIN' }, null, 'read'), false);
    assert.strictEqual(authorize({ role: 'ADMIN' }, { type: 'issue' }, null), false);
    assert.strictEqual(authorize({ role: 'ADMIN' }, {}, 'read'), false); // missing type
  });
});
