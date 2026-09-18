const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { publicConfig, build } = require('../scripts/build-site.cjs');
const valid = { SUPABASE_URL: 'https://example.supabase.co/', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test-only' };
test('only a public Supabase key and hosted HTTPS URL are accepted', () => {
  assert.equal(publicConfig(valid).url, 'https://example.supabase.co');
  for (const key of ['', 'sb_secret_sensitive', 'eyJservice_role', 'sb_publishable_replace_me']) {
    assert.throws(() => publicConfig({ ...valid, SUPABASE_PUBLISHABLE_KEY: key }), /Publishable key/);
  }
  for (const url of ['', 'http://example.supabase.co', 'https://example.supabase.co.evil.test', 'https://user:pass@example.supabase.co']) {
    assert.throws(() => publicConfig({ ...valid, SUPABASE_URL: url }), /HTTPS/);
  }
});
test('deployment contains public assets only and invalid settings preserve prior output', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'minna-build-'));
  try {
    build(valid, out);
    assert.ok(fs.existsSync(path.join(out, 'connection.html')));
    for (const name of ['.env', '.git', 'tests', 'scripts', '.github', 'minna-no-ten-16bc00f.bundle']) {
      assert.equal(fs.existsSync(path.join(out, name)), false);
    }
    const previous = fs.readFileSync(path.join(out, 'supabase-config.json'), 'utf8');
    assert.throws(() => build({ ...valid, SUPABASE_PUBLISHABLE_KEY: 'sb_secret_sensitive' }, out));
    assert.equal(fs.readFileSync(path.join(out, 'supabase-config.json'), 'utf8'), previous);
  } finally { fs.rmSync(out, { recursive: true, force: true }); }
});
