import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, '..');

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
			SPEAKPASTE_BUILD_MARKETING_VERSION: buildMeta.marketingVersion,
			SPEAKPASTE_BUILD_BUNDLE_VERSION: buildMeta.bundleVersion,
			SPEAKPASTE_BUILD_GIT_COMMIT_COUNT: String(buildMeta.gitCommitCount),
			SPEAKPASTE_BUILD_AT_ISO: buildMeta.builtAtIso,
			SPEAKPASTE_BUILD_GIT_COMMIT: buildMeta.gitCommit,
			SPEAKPASTE_BUILD_GIT_DIRTY: String(buildMeta.gitDirty),
			SPEAKPASTE_BUILD_SIGNATURE: buildMeta.buildSignature,
		},
	},
);

process.exit(result.status ?? 1);
