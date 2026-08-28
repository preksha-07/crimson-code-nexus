import { SCHEMAS } from './schemas.js';

/**
 * Validates data against a predefined schema.
 * 
 * @param {string} schemaKey - The name of the schema in SCHEMAS.
 * @param {Object} data - The payload to validate.
 * @returns {Object} - { valid: boolean, errors: string[], value: Object }
 */
export function validate(schemaKey, data) {
  const schema = SCHEMAS[schemaKey];
  if (!schema) {
    return {
      valid: false,
      errors: [`Schema '${schemaKey}' does not exist`],
      value: null
    };
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return {
      valid: false,
      errors: ['Data must be a non-null object'],
      value: null
    };
  }

  const errors = [];
  const sanitizedValue = {};

  // 1. Check for required fields
  const requiredFields = schema.required || [];
  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null) {
      errors.push(`Field '${field}' is required`);
    }
  }

  // 2. Validate properties
  const properties = schema.properties || {};
  const dataKeys = Object.keys(data);

  for (const key of dataKeys) {
    // Check for unexpected fields
    if (!properties[key]) {
      errors.push(`Unexpected field '${key}' is not allowed`);
      continue;
    }

    const value = data[key];
    const rules = properties[key];

    // If value is null/undefined and not required, skip validation but preserve it
    if (value === undefined || value === null) {
      sanitizedValue[key] = value;
      continue;
    }

    // Type checking
    const actualType = typeof value;
    if (rules.type === 'string') {
      if (actualType !== 'string') {
        errors.push(`Field '${key}' must be a string, got ${actualType}`);
        continue;
      }
      
      // Note: We do NOT silently modify/trim input. User input is validated raw 
      // so that issues like passwords containing spaces or invalid layout spaces 
      // result in clear validation failures rather than silent mutations.
      
      // Min length
      if (rules.minLength !== undefined && value.length < rules.minLength) {
        errors.push(`Field '${key}' length must be at least ${rules.minLength} characters`);
      }
      // Max length
      if (rules.maxLength !== undefined && value.length > rules.maxLength) {
        errors.push(`Field '${key}' length must not exceed ${rules.maxLength} characters`);
      }
      // Pattern regex matching
      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push(`Field '${key}' is malformed or contains invalid characters`);
      }
      // Enum validation
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(`Field '${key}' must be one of: [${rules.enum.join(', ')}]`);
      }

      sanitizedValue[key] = value;

    } else if (rules.type === 'number') {
      if (actualType !== 'number' || Number.isNaN(value)) {
        errors.push(`Field '${key}' must be a number, got ${actualType}`);
        continue;
      }
      // Min value
      if (rules.min !== undefined && value < rules.min) {
        errors.push(`Field '${key}' must be at least ${rules.min}`);
      }
      // Max value
      if (rules.max !== undefined && value > rules.max) {
        errors.push(`Field '${key}' must be no greater than ${rules.max}`);
      }

      sanitizedValue[key] = value;

    } else if (rules.type === 'boolean') {
      if (actualType !== 'boolean') {
        errors.push(`Field '${key}' must be a boolean, got ${actualType}`);
        continue;
      }

      sanitizedValue[key] = value;
    }
  }

  // Add missing optional properties with default/null values to sanitized output if no errors
  if (errors.length === 0) {
    for (const key of Object.keys(properties)) {
      if (sanitizedValue[key] === undefined) {
        sanitizedValue[key] = null;
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    value: errors.length === 0 ? sanitizedValue : null
  };
}
