import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.argv[2] ?? 'dist/booking-web';
const forbiddenLiterals = [
  ['localhost', /\blocalhost\b/gi],
  ['IPv4 loopback', /\b127\.0\.0\.1\b/g],
  ['legacy Agendamento public IP', /\b168\.231\.66\.108\b/g],
];
const configuredLegacyHosts = (process.env['BUNDLE_SCAN_FORBIDDEN_HOSTS'] ?? '')
  .split(',')
  .map((host) => host.trim().toLowerCase())
  .filter(Boolean);
const httpUrlPattern = /http:\/\/[^\s"'<>`]+/gi;
const allowedHttpHosts = new Set(['w3.org', 'www.w3.org', 'schemas.openxmlformats.org']);

async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await filesIn(path)));
    else if (/\.(?:css|html|js|mjs|cjs)$/i.test(entry.name)) files.push(path);
  }
  return files;
}

const files = await filesIn(root);
const findings = [];
for (const file of files) {
  const content = await readFile(file, 'utf8');
  const isBrowserBundle = /[\\/]browser[\\/]/i.test(file);
  for (const [name, pattern] of forbiddenLiterals) {
    if (!isBrowserBundle && name !== 'legacy Agendamento public IP') continue;
    pattern.lastIndex = 0;
    if (pattern.test(content)) findings.push(`${name}: ${file}`);
  }
  const lower = content.toLowerCase();
  for (const host of configuredLegacyHosts) {
    if (lower.includes(host)) findings.push(`configured legacy host (${host}): ${file}`);
  }
  httpUrlPattern.lastIndex = 0;
  for (const match of isBrowserBundle ? content.matchAll(httpUrlPattern) : []) {
    try {
      const host = new URL(match[0]).hostname.toLowerCase();
      if (!allowedHttpHosts.has(host)) findings.push(`production HTTP URL (${host}): ${file}`);
    } catch {
      findings.push(`malformed HTTP URL: ${file}`);
    }
  }
}

if (findings.length) {
  console.error('Production bundle contains forbidden hosts or public HTTP URLs:');
  for (const finding of [...new Set(findings)]) console.error(`- ${finding}`);
  process.exit(1);
}
console.log(`Production bundle scan passed (${files.length} files).`);
