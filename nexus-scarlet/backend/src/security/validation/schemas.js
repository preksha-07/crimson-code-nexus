/**
 * Validation Schemas for NEXUS.
 * Establishes conventions and validates field types, presence, lengths, and enums.
 * 
 * [TEAM DECISION REQUIRED]
 * The exact database schemas are owned by Scarlet. These schemas establish 
 * Raven's security boundaries and validation conventions. The exact set of fields 
 * and allowed enums must be aligned with Scarlet when database models are finalized.
 */

export const SCHEMAS = {
  LoginRequest: {
    type: 'object',
    required: ['username', 'password'],
    properties: {
      username: { type: 'string', minLength: 3, maxLength: 50, pattern: /^[a-zA-Z0-9_\-\.]+$/ },
      password: { type: 'string', minLength: 8, maxLength: 128 }
    }
  },

  CreateIssueRequest: {
    type: 'object',
    required: ['title', 'description', 'project'],
    properties: {
      title: { type: 'string', minLength: 5, maxLength: 200 },
      description: { type: 'string', minLength: 10, maxLength: 10000 },
      project: { type: 'string', minLength: 2, maxLength: 50, pattern: /^[a-zA-Z0-9_\-]+$/ },
      // [TEAM DECISION REQUIRED] Validate allowed severity levels
      severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
      // [TEAM DECISION REQUIRED] Determine issue status default/states
      type: { type: 'string', enum: ['BUG', 'SECURITY_VULNERABILITY', 'FEATURE_REQUEST', 'TASK'] },
      isPrivate: { type: 'boolean' }
    }
  },

  UpdateIssueRequest: {
    type: 'object',
    properties: {
      title: { type: 'string', minLength: 5, maxLength: 200 },
      description: { type: 'string', minLength: 10, maxLength: 10000 },
      severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
      // [TEAM DECISION REQUIRED] Define valid state machine transitions
      status: { type: 'string', enum: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'VERIFIED'] },
      resolution: { type: 'string', enum: ['FIXED', 'DUPLICATE', 'WONTFIX', 'WORKSFORME', 'INCOMPLETE'] },
      isPrivate: { type: 'boolean' }
    }
  },

  CreateCommentRequest: {
    type: 'object',
    required: ['issueId', 'content'],
    properties: {
      issueId: { type: 'string', minLength: 1, maxLength: 50, pattern: /^[a-zA-Z0-9_\-]+$/ },
      content: { type: 'string', minLength: 1, maxLength: 5000 }
    }
  },

  AttachmentMetadata: {
    type: 'object',
    required: ['filename', 'mimeType', 'size'],
    properties: {
      // Prevent directory traversal attacks in filenames (e.g. ../../etc/passwd)
      filename: { 
        type: 'string', 
        minLength: 1, 
        maxLength: 255, 
        pattern: /^[^\\\/:*?"<>|]+$/ // Restricts path separator chars
      },
      // [TEAM DECISION REQUIRED] Define explicit allowed mime-type list
      mimeType: { 
        type: 'string', 
        enum: [
          'image/png', 'image/jpeg', 'image/gif', 
          'application/pdf', 'text/plain', 'text/csv'
        ] 
      },
      // Restrict size to max 10MB (10,485,760 bytes)
      size: { type: 'number', min: 1, max: 10485760 }
    }
  },

  SecurityCsrfRequest: {
    type: 'object',
    required: ['csrfToken'],
    properties: {
      csrfToken: { type: 'string', minLength: 32, maxLength: 64, pattern: /^[a-fA-F0-9]+$/ }
    }
  }
};
