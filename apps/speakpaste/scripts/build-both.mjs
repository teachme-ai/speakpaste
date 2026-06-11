import { execSync } from 'node:child_process';
import { readFileSync, renameSync, existsSync, mkdirSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';
import { Writable } from 'node:stream';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, '..');

const packageJson = JSON.parse(readFileSync(path.join(appRoot, 'package.json'), 'utf8'));
const version = packageJson.version; // e.g. "1.0.0"

import crypto from 'node:crypto';

const outputDir = path.join(appRoot, 'src-tauri', 'target', 'release', 'bundle', 'dmg');
const finalOutputDir = path.join(appRoot, 'dist');

// Apple Notarization credentials
const APPLE_ID = "irfan1476@gmail.com";
const APPLE_TEAM_ID = "99YAK7YU3M";

function getSha256(filePath) {
	const fileBuffer = readFileSync(filePath);
	const hashSum = crypto.createHash('sha256');
	hashSum.update(fileBuffer);
	return hashSum.digest('hex');
}

function askQuestion(query) {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
		terminal: true
	});

	return new Promise((resolve) => {
		rl.question(query, (ans) => {
			rl.close();
			resolve(ans.trim());
		});
	});
}

function askPassword(query) {
	// Custom stream to hide password characters from stdout
	const mutableStdout = new Writable({
		write(chunk, encoding, callback) {
			if (!this.muted) {
				process.stdout.write(chunk, encoding);
			}
			callback();
		}
	});
	mutableStdout.muted = false;

	const rl = readline.createInterface({
		input: process.stdin,
		output: mutableStdout,
		terminal: true
	});

	return new Promise((resolve) => {
		rl.question(query, (ans) => {
			rl.close();
			process.stdout.write('\n');
			resolve(ans.trim());
		});
		mutableStdout.muted = true;
	});
}

function runCommand(command, envOverrides = {}) {
	console.log(`\n[build-both] Running: ${command}`);
	execSync(command, {
		cwd: appRoot,
		stdio: 'inherit',
		env: {
			...process.env,
			...envOverrides,
		},
	});
}

function buildAndRename(isTrial, bundleVersion, targetArch) {
	const modeLabel = isTrial ? 'TRIAL' : 'LIFETIME';
	const rustTarget = targetArch === 'x86_64' ? 'x86_64-apple-darwin' : 'aarch64-apple-darwin';
	const defaultDmgName = `Mynah_${version}_${targetArch}.dmg`;
	const defaultDmgPath = path.join(outputDir, defaultDmgName);
	
	const targetDmgName = `Mynah_${isTrial ? 'Trial' : 'Lifetime'}_${version}_b${bundleVersion}_macos_${targetArch}.dmg`;
	const targetDmgPath = path.join(finalOutputDir, targetDmgName);

	console.log(`\n==================================================`);
	console.log(`[build-both] Building ${modeLabel} version (${targetArch} / Build ${bundleVersion})...`);
	console.log(`==================================================`);

	runCommand(`bun run tauri build --target ${rustTarget}`, {
		MYNAH_TRIAL_MODE: String(isTrial),
		CI: 'true', // Suppress automatic opening of DMG folder in Finder
	});

	if (!existsSync(defaultDmgPath)) {
		throw new Error(`Expected DMG artifact not found at: ${defaultDmgPath}`);
	}

	if (!existsSync(finalOutputDir)) {
		mkdirSync(finalOutputDir, { recursive: true });
	}

	console.log(`[build-both] Moving & Renaming ${defaultDmgName} -> ${targetDmgName}`);
	renameSync(defaultDmgPath, targetDmgPath);
	console.log(`[build-both] Successfully built: ${targetDmgPath}`);
	return targetDmgPath;
}

function notarizeAndStaple(dmgPath, appSpecificPassword) {
	console.log(`\n==================================================`);
	console.log(`[build-both] Notarizing ${path.basename(dmgPath)}...`);
	console.log(`==================================================`);

	const notarizeCmd = `xcrun notarytool submit "${dmgPath}" ` +
		`--apple-id "${APPLE_ID}" ` +
		`--team-id "${APPLE_TEAM_ID}" ` +
		`--password "${appSpecificPassword}" ` +
		`--wait`;
	
	execSync(notarizeCmd, { stdio: 'inherit' });

	console.log(`\n[build-both] Stapling ticket to ${path.basename(dmgPath)}...`);
	const stapleCmd = `xcrun stapler staple "${dmgPath}"`;
	execSync(stapleCmd, { stdio: 'inherit' });

	console.log(`[build-both] Notarization and stapling complete for ${path.basename(dmgPath)}`);
}

function logToReleaseHistory(buildMeta, changeDescription, generatedFiles) {
	const historyPath = path.join(appRoot, 'RELEASE_HISTORY.md');
	const dateStr = new Date().toISOString();
	
	const headerExists = existsSync(historyPath);
	let content = '';
	
	if (!headerExists) {
		content += `# Mynah Release and Build History\n\n`;
		content += `This file tracks all successfully completed production DMG builds, including their version, build number, and specific fixes/changes.\n\n`;
	}
	
	content += `## Build ${buildMeta.bundleVersion} (${buildMeta.marketingVersion}) — ${dateStr.slice(0, 10)}\n`;
	content += `- **Release Version**: \`${buildMeta.marketingVersion}\`\n`;
	content += `- **Build Number**: \`${buildMeta.bundleVersion}\`\n`;
	content += `- **Git Commit**: \`${buildMeta.gitCommit}\`${buildMeta.gitDirty ? ' (dirty)' : ''}\n`;
	content += `- **Timestamp**: \`${dateStr}\`\n`;
	content += `- **Description**: ${changeDescription || 'No description provided.'}\n`;
	content += `- **Artifacts**:\n`;
	for (const art of generatedFiles) {
		content += `  - \`${art.name}\` (SHA-256: \`${art.sha256}\`)\n`;
	}
	content += `\n---\n\n`;

	appendFileSync(historyPath, content, 'utf8');
	console.log(`[build-both] Appended release details to RELEASE_HISTORY.md`);
}

async function main() {
	console.log("=== Mynah DMG Build & Notarization Pipeline ===");
	console.log(`Apple ID: ${APPLE_ID}`);
	console.log(`Team ID:  ${APPLE_TEAM_ID}`);
	
	const appSpecificPassword = await askPassword("Enter Apple App-Specific Password: ");
	if (!appSpecificPassword) {
		console.error("Error: App-specific password is required.");
		process.exit(1);
	}

	const changeDescription = await askQuestion("Enter a description of changes/fixes for this build: ");

	try {
		// Ensure both Apple Silicon and Intel build targets are installed in Rust
		console.log("\n[build-both] Preparing Rust compiler targets...");
		runCommand('rustup target add aarch64-apple-darwin x86_64-apple-darwin');

		// Run prepare script once initially to get the latest build metadata (like commit count)
		runCommand('bun run prepare:build-meta');
		
		const buildMeta = JSON.parse(
			readFileSync(path.join(appRoot, 'src-tauri', 'build-meta.json'), 'utf8'),
		);
		const bundleVersion = buildMeta.bundleVersion;

		const generatedArtifacts = [];

		// 1. Build Apple Silicon Targets
		const trialDmgArm = buildAndRename(true, bundleVersion, 'aarch64');
		notarizeAndStaple(trialDmgArm, appSpecificPassword);
		generatedArtifacts.push(trialDmgArm);

		const lifetimeDmgArm = buildAndRename(false, bundleVersion, 'aarch64');
		notarizeAndStaple(lifetimeDmgArm, appSpecificPassword);
		generatedArtifacts.push(lifetimeDmgArm);

		// 2. Build Intel Targets
		const trialDmgIntel = buildAndRename(true, bundleVersion, 'x86_64');
		notarizeAndStaple(trialDmgIntel, appSpecificPassword);
		generatedArtifacts.push(trialDmgIntel);

		const lifetimeDmgIntel = buildAndRename(false, bundleVersion, 'x86_64');
		notarizeAndStaple(lifetimeDmgIntel, appSpecificPassword);
		generatedArtifacts.push(lifetimeDmgIntel);

		const fileDetails = generatedArtifacts.map(artPath => ({
			name: path.basename(artPath),
			sha256: getSha256(artPath)
		}));

		// Log to release history
		logToReleaseHistory(buildMeta, changeDescription, fileDetails);

		console.log('\n==================================================');
		console.log('[build-both] All builds, notarizations, and staplings completed successfully!');
		console.log(`artifacts generated in: ${finalOutputDir}`);
		for (const art of generatedArtifacts) {
			console.log(`- ${path.basename(art)}`);
		}
		console.log('==================================================\n');
	} catch (error) {
		console.error('[build-both] Build/Notarization pipeline failed:', error);
		process.exit(1);
	}
}

main();
