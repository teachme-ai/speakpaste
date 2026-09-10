import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';
import { Writable } from 'node:stream';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, '..');

const buildMetaPath = path.join(appRoot, 'src-tauri', 'build-meta.json');
if (!existsSync(buildMetaPath)) {
	console.error("Error: build-meta.json not found.");
	process.exit(1);
}
const buildMeta = JSON.parse(readFileSync(buildMetaPath, 'utf8'));
const version = buildMeta.marketingVersion;
const build = buildMeta.bundleVersion;

const APPLE_ID = "irfan1476@gmail.com";
const APPLE_TEAM_ID = "99YAK7YU3M";
const KEYCHAIN_PROFILE = "mynah-notary";

function askPassword(query) {
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

function hasKeychainProfile(profileName) {
	try {
		execSync(`xcrun notarytool history --keychain-profile "${profileName}"`, {
			stdio: 'ignore'
		});
		return true;
	} catch {
		return false;
	}
}

async function main() {
	console.log("=== Mynah Notarization & Publishing Pipeline ===");
	console.log(`Version: ${version} (Build ${build})`);
	console.log(`Apple ID: ${APPLE_ID}`);
	console.log(`Team ID:  ${APPLE_TEAM_ID}\n`);

	const dmgs = [
		path.join(appRoot, 'dist', `Mynah_${version}_b${build}_macos_aarch64.dmg`),
		path.join(appRoot, 'dist', `Mynah_${version}_b${build}_macos_x86_64.dmg`),
	];

	for (const dmg of dmgs) {
		if (!existsSync(dmg)) {
			console.error(`Error: Missing DMG artifact: ${dmg}`);
			process.exit(1);
		}
	}

	const useKeychain = hasKeychainProfile(KEYCHAIN_PROFILE);
	let appSpecificPassword = process.env.APPLE_PASSWORD || process.env.APPLE_APP_SPECIFIC_PASSWORD;

	if (useKeychain) {
		console.log(`[notary] Using keychain profile: "${KEYCHAIN_PROFILE}"`);
	} else if (!appSpecificPassword) {
		console.log(`Keychain profile "${KEYCHAIN_PROFILE}" not found.`);
		console.log(`Tip: Run 'xcrun notarytool store-credentials "${KEYCHAIN_PROFILE}" --apple-id "${APPLE_ID}" --team-id "${APPLE_TEAM_ID}"' to save password securely in Keychain.\n`);
		appSpecificPassword = await askPassword("Enter Apple App-Specific Password: ");
		if (!appSpecificPassword) {
			console.error("Error: App-specific password is required for notarization.");
			process.exit(1);
		}
	}

	for (const dmgPath of dmgs) {
		const filename = path.basename(dmgPath);
		console.log(`\n==================================================`);
		console.log(`[notary] Submitting ${filename} to Apple Notary Service...`);
		console.log(`==================================================`);

		const submitCmd = useKeychain
			? `xcrun notarytool submit "${dmgPath}" --keychain-profile "${KEYCHAIN_PROFILE}" --wait`
			: `xcrun notarytool submit "${dmgPath}" --apple-id "${APPLE_ID}" --team-id "${APPLE_TEAM_ID}" --password "$APPLE_PASSWORD" --wait`;

		execSync(submitCmd, {
			stdio: 'inherit',
			env: {
				...process.env,
				APPLE_PASSWORD: appSpecificPassword || '',
			}
		});

		console.log(`\n[notary] Stapling ticket to ${filename}...`);
		execSync(`xcrun stapler staple "${dmgPath}"`, { stdio: 'inherit' });

		console.log(`[notary] Validating stapled ticket...`);
		execSync(`xcrun stapler validate "${dmgPath}"`, { stdio: 'inherit' });

		console.log(`[notary] Verifying with macOS Gatekeeper (spctl)...`);
		execSync(`spctl --assess --type open --context context:primary-signature --verbose "${dmgPath}"`, {
			stdio: 'inherit'
		});
		console.log(`[notary] ${filename} is officially NOTARIZED and STAPLED!`);
	}

	console.log(`\n==================================================`);
	console.log(`[notary] Syncing stapled DMGs to website...`);
	console.log(`==================================================`);
	execSync('bun run publish:website', { cwd: appRoot, stdio: 'inherit' });

	console.log("\n==================================================");
	console.log("All DMGs notarized, stapled, and synced to website!");
	console.log("==================================================\n");
}

main().catch((err) => {
	console.error("\nNotarization pipeline failed:", err.message || err);
	process.exit(1);
});
