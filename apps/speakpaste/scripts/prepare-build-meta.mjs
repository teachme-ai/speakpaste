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
	const bundleVersion = gitCommitCount;
	const buildSignature = `${marketingVersion}+r${gitCommitCount}.${gitCommit}${gitDirty ? '.dirty' : ''}`;

	return {
		marketingVersion,
		bundleVersion,
		gitCommitCount,
		builtAtIso,
		gitCommit,
		gitDirty,
		buildSignature,
	};
}

function readBuildMetaFromEnv() {
	const {
		SPEAKPASTE_BUILD_MARKETING_VERSION,
		SPEAKPASTE_BUILD_BUNDLE_VERSION,
		SPEAKPASTE_BUILD_GIT_COMMIT_COUNT,
		SPEAKPASTE_BUILD_AT_ISO,
		SPEAKPASTE_BUILD_GIT_COMMIT,
		SPEAKPASTE_BUILD_GIT_DIRTY,
		SPEAKPASTE_BUILD_SIGNATURE,
	} = process.env;

	if (
		!SPEAKPASTE_BUILD_MARKETING_VERSION ||
		!SPEAKPASTE_BUILD_BUNDLE_VERSION ||
		!SPEAKPASTE_BUILD_GIT_COMMIT_COUNT ||
		!SPEAKPASTE_BUILD_AT_ISO ||
		!SPEAKPASTE_BUILD_GIT_COMMIT ||
		!SPEAKPASTE_BUILD_SIGNATURE
	) {
		return null;
	}

	return {
		marketingVersion: SPEAKPASTE_BUILD_MARKETING_VERSION,
		bundleVersion: SPEAKPASTE_BUILD_BUNDLE_VERSION,
		gitCommitCount: Number(SPEAKPASTE_BUILD_GIT_COMMIT_COUNT),
		builtAtIso: SPEAKPASTE_BUILD_AT_ISO,
		gitCommit: SPEAKPASTE_BUILD_GIT_COMMIT,
		gitDirty: SPEAKPASTE_BUILD_GIT_DIRTY === 'true',
		buildSignature: SPEAKPASTE_BUILD_SIGNATURE,
	};
}
