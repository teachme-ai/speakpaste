import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, '..');

const packageJsonPath = path.join(appRoot, 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

const now = new Date();
const builtAtIso = now.toISOString();
const bundleVersion = formatBundleVersion(now);
const marketingVersion = packageJson.version;
const gitCommit = safeExec('git rev-parse --short=12 HEAD', appRoot, 'nogit');
const gitDirty = safeExec('git status --short --untracked-files=no', appRoot, '')
	.trim()
	.length > 0;
const buildSignature = `${marketingVersion}+${bundleVersion}.${gitCommit}${gitDirty ? '.dirty' : ''}`;

const buildMeta = {
	marketingVersion,
	bundleVersion,
	builtAtIso,
	gitCommit,
	gitDirty,
	buildSignature,
};

writeJson(path.join(appRoot, 'src-tauri', 'build-meta.json'), buildMeta);
writeJson(path.join(appRoot, 'src-tauri', 'tauri.macos.conf.json'), {
	bundle: {
		macOS: {
			bundleVersion,
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

function formatBundleVersion(date) {
	const year = date.getUTCFullYear().toString().padStart(4, '0');
	const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
	const day = date.getUTCDate().toString().padStart(2, '0');
	const hour = date.getUTCHours().toString().padStart(2, '0');
	const minute = date.getUTCMinutes().toString().padStart(2, '0');
	const second = date.getUTCSeconds().toString().padStart(2, '0');
	return `${year}${month}${day}.${hour}${minute}${second}`;
}
