const fs = require('node:fs');
const path = require('node:path');

function publicConfig(env) {
  const url = (env.SUPABASE_URL || '').trim();
  const key = (env.SUPABASE_PUBLISHABLE_KEY || '').trim();
  // Accept only hosted Supabase projects and the new public key format.
  // Reject legacy JWTs as well, so a service_role JWT cannot be published.
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url)) {
    throw new Error('SUPABASE_URL must be your HTTPS Supabase Project URL.');
  }
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key) || key === 'sb_publishable_replace_me') {
    throw new Error('SUPABASE_PUBLISHABLE_KEY must be a Publishable key, never a secret or service_role key.');
  }
  return { url: url.replace(/\/$/, ''), publishableKey: key };
}

function build(env = process.env, out = path.join(__dirname, '..', '_site')) {
  const config = publicConfig(env); // Validate before changing output.
  const root = path.join(__dirname, '..');
  fs.mkdirSync(out, { recursive: true });
  // Only these public assets are deployed; no env files, Git history or backups.
  const files = ['index.html', 'create.html', 'exhibition.html', 'profile.html',
    'search.html', 'records.html', 'connection.html', 'styles.css', 'storage.js',
    'app.js', 'supabase-client.js', 'connection.js',
    'vendor/supabase-2.57.4.js', 'vendor/supabase-LICENSE.txt'];
  for (const file of files) {
    const target = path.join(out, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(root, file), target);
  }
  fs.writeFileSync(path.join(out, 'supabase-config.json'), JSON.stringify(config));
  fs.writeFileSync(path.join(out, '.nojekyll'), '');
}

module.exports = { publicConfig, build };
if (require.main === module) {
  try { build(); console.log('Static site built successfully.'); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
