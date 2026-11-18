import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RuleEngineService } from '../services/rule_engine.service.js';

describe('RuleEngineService', () => {
  it('scores legitimate corporate job descriptions as low risk with zero critical fees', () => {
    const legitText =
      'Software Engineer at Microsoft Corporation. Build scalable TypeScript and Node.js services. ' +
      'Requires 3+ years of software development experience. Apply through https://careers.microsoft.com/us/en/job/12345';
    const result = RuleEngineService.evaluate(legitText, 'https://careers.microsoft.com/us/en/job/12345');

    assert.equal(result.hasCriticalAdvanceFee, false);
    assert.ok(result.score <= 0.25, `Expected low rule score <= 0.25, got ${result.score}`);
  });

  it('flags advance-fee registration/security deposit extortion as critical', () => {
    const scamText =
      'Urgent hiring! Guaranteed work from home job paying $5000/week. ' +
      'Pay a refundable security deposit and registration fee via UPI or USDT to receive your onboarding kit immediately.';
    const result = RuleEngineService.evaluate(scamText, null);

    assert.equal(result.hasCriticalAdvanceFee, true);
    assert.ok(result.score >= 0.7, `Expected high rule score >= 0.7, got ${result.score}`);
    assert.ok(result.matchedRules.length >= 2);
  });
});
