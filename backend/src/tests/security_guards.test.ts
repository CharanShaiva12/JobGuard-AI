import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isRestrictedIpAddress, validateUrlForSSRF } from '../utils/ssrf_guard.js';
import { isValidFileMagicBytes } from '../routes/scan.routes.js';

describe('SSRF Guard & IP Range Validation', () => {
  it('blocks private IPv4, loopback, and cloud metadata addresses', () => {
    assert.equal(isRestrictedIpAddress('127.0.0.1', 4), true);
    assert.equal(isRestrictedIpAddress('10.0.0.5', 4), true);
    assert.equal(isRestrictedIpAddress('172.16.0.1', 4), true);
    assert.equal(isRestrictedIpAddress('192.168.1.10', 4), true);
    assert.equal(isRestrictedIpAddress('169.254.169.254', 4), true);
  });

  it('blocks IPv6 loopback, ULA, link-local, and IPv4-mapped IPv6 bypasses', () => {
    assert.equal(isRestrictedIpAddress('::1', 6), true);
    assert.equal(isRestrictedIpAddress('fe80::1', 6), true);
    assert.equal(isRestrictedIpAddress('fc00::1', 6), true);
    assert.equal(isRestrictedIpAddress('::ffff:127.0.0.1', 6), true);
    assert.equal(isRestrictedIpAddress('::ffff:169.254.169.254', 6), true);
    assert.equal(isRestrictedIpAddress('::ffff:7f00:0001', 6), true);
    assert.equal(isRestrictedIpAddress('::ffff:a9fe:a9fe', 6), true);
  });

  it('allows legitimate public IP addresses', () => {
    assert.equal(isRestrictedIpAddress('8.8.8.8', 4), false);
    assert.equal(isRestrictedIpAddress('1.1.1.1', 4), false);
    assert.equal(isRestrictedIpAddress('2606:4700:4700::1111', 6), false);
  });

  it('rejects disallowed schemes and internal hostnames in validateUrlForSSRF', async () => {
    const jsScheme = await validateUrlForSSRF('javascript:alert(1)');
    assert.equal(jsScheme.isValid, false);

    const fileScheme = await validateUrlForSSRF('file:///etc/passwd');
    assert.equal(fileScheme.isValid, false);

    const localhost = await validateUrlForSSRF('http://localhost:5000/api');
    assert.equal(localhost.isValid, false);

    const metadata = await validateUrlForSSRF('http://169.254.169.254/latest/meta-data/');
    assert.equal(metadata.isValid, false);

    const mappedV6 = await validateUrlForSSRF('http://[::ffff:127.0.0.1]:8000/');
    assert.equal(mappedV6.isValid, false);
  });
});

describe('Uploaded File Magic-Byte Signature Validation', () => {
  it('accepts authentic PDF, DOCX, PNG, JPEG, and UTF-8 TXT headers', () => {
    assert.equal(isValidFileMagicBytes(Buffer.from('%PDF-1.7\n...'), '.pdf'), true);
    assert.equal(isValidFileMagicBytes(Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14]), '.docx'), true);
    assert.equal(
      isValidFileMagicBytes(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), '.png'),
      true
    );
    assert.equal(isValidFileMagicBytes(Buffer.from([0xff, 0xd8, 0xff, 0xe0]), '.jpg'), true);
    assert.equal(isValidFileMagicBytes(Buffer.from('Software Engineer Offer Letter'), '.txt'), true);
  });

  it('rejects spoofed binary/executable payloads masquerading as documents', () => {
    const mzExe = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]);
    assert.equal(isValidFileMagicBytes(mzExe, '.pdf'), false);
    assert.equal(isValidFileMagicBytes(mzExe, '.docx'), false);
    assert.equal(isValidFileMagicBytes(mzExe, '.png'), false);
    assert.equal(isValidFileMagicBytes(mzExe, '.jpg'), false);
    assert.equal(isValidFileMagicBytes(mzExe, '.txt'), false);
  });
});
