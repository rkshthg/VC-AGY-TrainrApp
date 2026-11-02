/**
 * Publishes an OTA update to testers, with safety checks.
 *
 *   npm run update:preview -- --message "Fix meal scan crash"
 *
 * `eas update` ignores the local .env and only uses variables stored in the
 * Expo project's environment. An update built without them can't reach
 * Supabase, so this script refuses to publish when a required one is missing.
 * Afterwards it uploads source maps to Sentry when SENTRY_AUTH_TOKEN is set.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHANNEL = 'preview';
const ENVIRONMENT = 'preview';
const EAS = 'npx --yes eas-cli@27.2.0';
const REQUIRED = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY'];
const RECOMMENDED = ['EXPO_PUBLIC_SENTRY_DSN'];

function run(command, { capture = false } = {}) {
  const result = spawnSync(command, {
    shell: true,
    stdio: capture ? ['inherit', 'pipe', 'inherit'] : 'inherit',
    encoding: 'utf8',
  });
  return { ok: result.status === 0, output: result.stdout || '' };
}

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

const passthrough = process.argv.slice(2);
if (!passthrough.some((arg) => arg === '--message' || arg.startsWith('--message='))) {
  fail('Add a message, e.g.  npm run update:preview -- --message "Fix meal scan crash"');
}

// 1. Check the Expo environment has the variables the app needs.
console.log(`Checking variables in the Expo "${ENVIRONMENT}" environment...`);
const list = run(`${EAS} env:list ${ENVIRONMENT}`, { capture: true });
if (!list.ok) fail('Could not read Expo environment variables. Are you signed in? (npx eas-cli login)');
const missing = REQUIRED.filter((name) => !list.output.includes(name));
if (missing.length) {
  fail(
    `Missing in the Expo "${ENVIRONMENT}" environment: ${missing.join(', ')}.\n` +
      `  Add them at expo.dev > Trainr-App > Environment variables, then try again.`
  );
}
RECOMMENDED.filter((name) => !list.output.includes(name)).forEach((name) =>
  console.warn(`! ${name} is not set; this update won't report crashes.`)
);

// 2. Publish.
const quoted = passthrough.map((arg) => (/\s/.test(arg) ? `"${arg.replace(/"/g, '\\"')}"` : arg));
const publish = run(
  `${EAS} update --channel ${CHANNEL} --environment ${ENVIRONMENT} --platform android --non-interactive ${quoted.join(' ')}`
);
if (!publish.ok) fail('eas update failed.');

// 3. Double-check the published bundle wasn't built with the placeholder Supabase URL.
const bundleDir = path.join(__dirname, '..', 'dist', '_expo', 'static', 'js', 'android');
const bundle = fs.existsSync(bundleDir) && fs.readdirSync(bundleDir).find((f) => /\.(hbc|js)$/.test(f));
if (bundle && fs.readFileSync(path.join(bundleDir, bundle)).includes('placeholder.supabase.co')) {
  fail(
    'The update was built WITHOUT the Supabase URL and will not work. Roll it back now:\n' +
      `  ${EAS} update:roll-back-to-embedded --branch ${CHANNEL} --runtime-version <version> --platform android --message "Roll back"`
  );
}

// 4. Source maps, so Sentry shows real file names and line numbers for this update.
if (process.env.SENTRY_AUTH_TOKEN) {
  console.log('Uploading source maps to Sentry...');
  if (!run('npx sentry-expo-upload-sourcemaps dist').ok) console.warn('! Source map upload failed.');
} else {
  console.log('SENTRY_AUTH_TOKEN not set; skipping source map upload.');
}

console.log('\n✔ Update published. Testers get it the next time they open the app.');
