#!/usr/bin/env node
/**
 * Fails when the published tarball grows past a sane ceiling.
 *
 * The `files` allowlist in package.json once included `"android"` wholesale,
 * which pulls in `android/build` — a local Android build there took the tarball
 * from ~26 kB to 722.7 MB. Nothing about that is visible in a diff: the
 * allowlist reads fine, and the damage only exists on a machine that has built
 * the library. `0.3.1` shipped clean purely because no build output existed when
 * it was packed.
 *
 * Note this packs for real (`npm pack --dry-run` still runs `prepare`, so
 * `build/` is produced first), which is what makes the measurement honest.
 *
 * Override the ceiling with `--max-bytes=<n>` or `MAX_PACK_BYTES=<n>` when a
 * deliberate addition needs more room.
 */
const { spawnSyncWithAutoShell } = require('./util');

const DEFAULT_MAX_BYTES = 1024 * 1024;

function parseMaxBytes() {
  const flag = process.argv.slice(2).find((arg) => arg.startsWith('--max-bytes='));
  const raw = flag ? flag.split('=')[1] : process.env.MAX_PACK_BYTES;

  if (!raw) {
    return DEFAULT_MAX_BYTES;
  }

  const parsed = Number(raw);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    console.error(`Invalid maximum size: ${raw}`);
    process.exit(1);
  }

  return parsed;
}

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
  return `${(bytes / 1024).toFixed(1)} kB`;
}

const maxBytes = parseMaxBytes();

const result = spawnSyncWithAutoShell('npm', ['pack', '--dry-run', '--json'], {
  encoding: 'utf8',
  // `npm pack` writes its notices to stderr and the JSON payload to stdout.
  stdio: ['ignore', 'pipe', 'inherit'],
});

if (result.status !== 0) {
  console.error('`npm pack --dry-run --json` failed, so the package size could not be measured.');
  process.exit(result.status ?? 1);
}

let report;
try {
  report = JSON.parse(result.stdout)[0];
} catch (error) {
  console.error(`Could not parse the output of \`npm pack\`: ${error.message}`);
  process.exit(1);
}

const { size, unpackedSize, entryCount } = report;
const description =
  `${formatBytes(size)} packed, ${formatBytes(unpackedSize)} unpacked, ${entryCount} files ` +
  `(ceiling ${formatBytes(maxBytes)})`;

if (size > maxBytes) {
  console.error(`Package too large: ${description}\n`);
  console.error('The largest entries are:\n');

  const largest = [...(report.files ?? [])].sort((a, b) => b.size - a.size).slice(0, 15);
  for (const file of largest) {
    console.error(`  ${formatBytes(file.size).padStart(9)}  ${file.path}`);
  }

  console.error(
    '\nCheck the `files` allowlist in package.json. Listing a directory that can contain ' +
      'build output (for example "android" rather than "android/src/main") is the usual cause.'
  );
  process.exit(1);
}

console.log(`Package size OK — ${description}`);
