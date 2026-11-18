import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractRootDomain, DomainIntelService } from '../services/domain_intel.service.js';

describe('DomainIntelService', () => {
  it('extracts root domains accurately including multi-part ccTLDs', () => {
    assert.equal(extractRootDomain('careers.microsoft.com'), 'microsoft.com');
    assert.equal(extractRootDomain('www.jobs.company.co.uk'), 'company.co.uk');
    assert.equal(extractRootDomain('portal.tcs.co.in'), 'tcs.co.in');
    assert.equal(extractRootDomain('greenhouse.io'), 'greenhouse.io');
  });

  it('skips RDAP gracefully for raw IP addresses without throwing', async () => {
    const res = await DomainIntelService.inspectDomain('192.168.1.1', true);
    assert.equal(res.domainAgeDays, null);
    assert.equal(res.isNewlyRegistered, false);
    assert.deepEqual(res.riskSignals, []);
  });
});
