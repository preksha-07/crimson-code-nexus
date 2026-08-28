import { describe, expect, it } from 'vitest';
import { assertTransition, allowedTransitions } from '../src/core/workflow.js';

describe('issue workflow',()=>{
  it('accepts the canonical next transition',()=>expect(()=>assertTransition('REPORTED','TRIAGED')).not.toThrow());
  it('rejects skipping workflow states',()=>expect(()=>assertTransition('REPORTED','RESOLVED')).toThrow(/Cannot transition/));
  it('closes only from verified',()=>expect(allowedTransitions('VERIFIED')).toEqual(['CLOSED']));
});
