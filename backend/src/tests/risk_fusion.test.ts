import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RiskFusionService } from '../services/risk_fusion.service.js';

describe('RiskFusionService', () => {
  it('computes 4-stream weighted consensus accurately (0.35H + 0.25M + 0.15U + 0.25G)', () => {
    const result = RiskFusionService.fuse(0.8, 0.7, 0.9, 0.6, false, false, false);
    // 100 * (0.35*0.8 + 0.25*0.7 + 0.15*0.9 + 0.25*0.6) = 100 * (0.28 + 0.175 + 0.135 + 0.15) = 74
    assert.equal(result.compositeScore, 74);
    assert.equal(result.riskLevel, 'High Risk');
  });

  it('normalizes weights dynamically when URL and Gemini are absent (offline text-only)', () => {
    const result = RiskFusionService.fuse(0.2, 0.2, null, null, false, false, false);
    assert.equal(result.compositeScore, 20);
    assert.equal(result.riskLevel, 'Low Risk');
    assert.equal(result.weights.urlPhishingModel, 0);
    assert.equal(result.weights.geminiReasoning, 0);
  });

  it('enforces critical advance-fee override >= 85 even when other streams are low', () => {
    const result = RiskFusionService.fuse(0.1, 0.1, 0.0, 0.1, true, false, false);
    assert.ok(result.compositeScore >= 85, `Expected >= 85, got ${result.compositeScore}`);
    assert.equal(result.riskLevel, 'High Risk');
    assert.ok(result.overridesApplied.some((m) => m.includes('Critical Payment Demand')));
  });

  it('enforces brand impersonation override >= 75', () => {
    const result = RiskFusionService.fuse(0.1, 0.2, 0.1, 0.1, false, true, false);
    assert.ok(result.compositeScore >= 75, `Expected >= 75, got ${result.compositeScore}`);
    assert.equal(result.riskLevel, 'High Risk');
    assert.ok(result.overridesApplied.some((m) => m.includes('Impersonation Warning')));
  });

  it('calibrates verified official corporate portals with zero red flags to Low Risk <= 8', () => {
    const result = RiskFusionService.fuse(0.0, null, 0.25, 0.1, false, false, true);
    assert.ok(result.compositeScore <= 8, `Expected <= 8, got ${result.compositeScore}`);
    assert.equal(result.riskLevel, 'Low Risk');
  });
});
