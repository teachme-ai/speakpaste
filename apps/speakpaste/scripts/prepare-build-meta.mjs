import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, '..');

const packageJsonPath = path.join(appRoot, 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const buildMeta = readBuildMetaFromEnv() ?? generateBuildMeta(packageJson.version);

writeJson(path.join(appRoot, 'src-tauri', 'build-meta.json'), buildMeta);
writeJson(path.join(appRoot, 'src-tauri', 'tauri.macos.conf.json'), {
	bundle: {
		macOS: {
			bundleVersion: buildMeta.bundleVersion,
		},
	},
});

const generatedDir = path.join(appRoot, 'src', 'lib', 'generated');
mkdirSync(generatedDir, { recursive: true });
writeFileSync(
	path.join(generatedDir, 'build-info.ts'),
	`export const BUILD_INFO = ${JSON.stringify(buildMeta, null, 2)} as const;\n`,
	'utf8',
);

console.log(
	`[build-meta] ${buildMeta.marketingVersion} (${buildMeta.bundleVersion}) ${buildMeta.gitCommit}${buildMeta.gitDirty ? ' dirty' : ''}`,
);

function writeJson(filePath, value) {
	mkdirSync(path.dirname(filePath), { recursive: true });
	writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function safeExec(command, cwd, fallback) {
	try {
		return execSync(command, {
			cwd,
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore'],
		}).trim();
	} catch {
		return fallback;
	}
}

function generateBuildMeta(marketingVersion) {
	const now = new Date();
	const builtAtIso = now.toISOString();
	const gitCommitCount = safeExec('git rev-list --count HEAD', appRoot, '0');
	const gitCommit = safeExec('git rev-parse --short=12 HEAD', appRoot, 'nogit');
	const gitDirty = safeExec('git status --short --untracked-files=no', appRoot, '')
		.trim()
		.length > 0;
	const bundleVersion = "178";
	const buildSignature = `${marketingVersion}+r178.${gitCommit}${gitDirty ? '.dirty' : ''}`;
	const isTrialMode = process.env.MYNAH_TRIAL_MODE === 'true';
	const targetArch = normalizeTargetArch(process.env.MYNAH_BUILD_TARGET_ARCH) ?? getHostArch();

	return {
		marketingVersion,
		bundleVersion,
		gitCommitCount,
		builtAtIso,
		gitCommit,
		gitDirty,
		buildSignature,
		isTrialMode,
		targetArch,
	};
}

function readBuildMetaFromEnv() {
	const {
		MYNAH_BUILD_MARKETING_VERSION,
		MYNAH_BUILD_BUNDLE_VERSION,
		MYNAH_BUILD_GIT_COMMIT_COUNT,
		MYNAH_BUILD_AT_ISO,
		MYNAH_BUILD_GIT_COMMIT,
		MYNAH_BUILD_GIT_DIRTY,
		MYNAH_BUILD_SIGNATURE,
		MYNAH_BUILD_TARGET_ARCH,
	} = process.env;

	if (
		!MYNAH_BUILD_MARKETING_VERSION ||
		!MYNAH_BUILD_BUNDLE_VERSION ||
		!MYNAH_BUILD_GIT_COMMIT_COUNT ||
		!MYNAH_BUILD_AT_ISO ||
		!MYNAH_BUILD_GIT_COMMIT ||
		!MYNAH_BUILD_SIGNATURE
	) {
		return null;
	}

	return {
		marketingVersion: MYNAH_BUILD_MARKETING_VERSION,
		bundleVersion: MYNAH_BUILD_BUNDLE_VERSION,
		gitCommitCount: Number(MYNAH_BUILD_GIT_COMMIT_COUNT),
		builtAtIso: MYNAH_BUILD_AT_ISO,
		gitCommit: MYNAH_BUILD_GIT_COMMIT,
		gitDirty: MYNAH_BUILD_GIT_DIRTY === 'true',
		buildSignature: MYNAH_BUILD_SIGNATURE,
		isTrialMode: process.env.MYNAH_TRIAL_MODE === 'true',
		targetArch: normalizeTargetArch(MYNAH_BUILD_TARGET_ARCH) ?? getHostArch(),
	};
}

function normalizeTargetArch(value) {
	if (value === 'x86_64' || value === 'aarch64') return value;
	if (value === 'x64') return 'x86_64';
	if (value === 'arm64') return 'aarch64';
	return null;
}

function getHostArch() {
	return normalizeTargetArch(process.arch) ?? 'aarch64';
}
