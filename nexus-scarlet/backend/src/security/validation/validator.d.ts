export interface ValidationResult {
  valid: boolean;
  errors: string[];
  value: any;
}

export function validate(schemaKey: string, data: any): ValidationResult;
