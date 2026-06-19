import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, '..');

// ── Instance isolation ─────────────────────────────────────────────────────
// Both the production app and the dev build register a macOS CGEventTap for
// the Fn key. Running them concurrently causes every dictation result to be
// pasted twice (once per process). Kill any existing Mynah instances before
// the dev server starts.
if (process.platform === 'darwin') {
	const kill = spawnSync('pkill', ['-x', 'mynah'], { stdio: 'inherit' });
	// pkill exits 1 if no process matched — that is fine.
	if (kill.status !== null && kill.status > 1) {
		console.warn('[dev] pkill returned unexpected status', kill.status);
	} else if (kill.status === 0) {
		console.log('[dev] Terminated existing Mynah instance(s) to avoid double-paste conflicts.');
	}
}
// ──────────────────────────────────────────────────────────────────────────

const prepare = spawnSync('bun', ['./scripts/prepare-build-meta.mjs'], {
	cwd: appRoot,
	stdio: 'inherit',
});

if (prepare.status !== 0) {
	process.exit(prepare.status ?? 1);
}

const buildMeta = JSON.parse(
	readFileSync(path.join(appRoot, 'src-tauri', 'build-meta.json'), 'utf8'),
);

const result = spawnSync(
	process.platform === 'win32' ? 'tauri.cmd' : 'tauri',
	process.argv.slice(2),
	{
		cwd: appRoot,
		stdio: 'inherit',
		env: {
			...process.env,
			MYNAH_BUILD_MARKETING_VERSION: buildMeta.marketingVersion,
			MYNAH_BUILD_BUNDLE_VERSION: buildMeta.bundleVersion,
			MYNAH_BUILD_GIT_COMMIT_COUNT: String(buildMeta.gitCommitCount),
			MYNAH_BUILD_AT_ISO: buildMeta.builtAtIso,
			MYNAH_BUILD_GIT_COMMIT: buildMeta.gitCommit,
			MYNAH_BUILD_GIT_DIRTY: String(buildMeta.gitDirty),
			MYNAH_BUILD_SIGNATURE: buildMeta.buildSignature,
			MYNAH_BUILD_TARGET_ARCH: buildMeta.targetArch,
			MYNAH_TRIAL_MODE: String(buildMeta.isTrialMode ?? false),
		},
	},
);

process.exit(result.status ?? 1);
