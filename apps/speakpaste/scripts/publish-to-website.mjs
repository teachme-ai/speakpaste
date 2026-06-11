import { readFileSync, writeFileSync, copyFileSync, readdirSync, unlinkSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, '..');

const websiteRoot = '/Users/irfan/projects/Mynah/website';

function getSha256(filePath) {
	const fileBuffer = readFileSync(filePath);
	const hashSum = crypto.createHash('sha256');
	hashSum.update(fileBuffer);
	return hashSum.digest('hex');
}

function getFileSizeMb(filePath) {
	const stats = statSync(filePath);
	return Math.round(stats.size / (1024 * 1024));
}

function main() {
	console.log("=== Mynah Website Publishing & Deployment Sync ===");
	
	if (!existsSync(websiteRoot)) {
		console.error(`Error: Website repository not found at: ${websiteRoot}`);
		process.exit(1);
	}

	// 1. Read build-meta.json
	const buildMetaPath = path.join(appRoot, 'src-tauri', 'build-meta.json');
	if (!existsSync(buildMetaPath)) {
		console.error("Error: build-meta.json not found. Run a build first.");
		process.exit(1);
	}
	const buildMeta = JSON.parse(readFileSync(buildMetaPath, 'utf8'));
	const version = buildMeta.marketingVersion;
	const build = buildMeta.bundleVersion;

	console.log(`Publishing Build: ${build} (${version})`);

	// 2. Define DMG artifacts
	const architectures = ['aarch64', 'x86_64'];
	const types = ['Trial'];
	const artifacts = [];

	for (const arch of architectures) {
		for (const type of types) {
			const filename = `Mynah_${type}_${version}_b${build}_macos_${arch}.dmg`;
			const srcPath = path.join(appRoot, 'dist', filename);
			
			if (!existsSync(srcPath)) {
				console.error(`Error: Required artifact not found: ${srcPath}`);
				console.error("Make sure to run a full build first (bun run build:all).");
				process.exit(1);
			}
			
			artifacts.push({
				type,
				arch,
				filename,
				srcPath,
				destPath: path.join(websiteRoot, 'public', filename)
			});
		}
	}

	// 3. Clean old DMG files in website public/ directory to avoid bloat
	const publicDir = path.join(websiteRoot, 'public');
	console.log("\n[website-sync] Cleaning old DMG files from website public folder...");
	const files = readdirSync(publicDir);
	for (const file of files) {
		if (file.startsWith('Mynah_') && file.endsWith('.dmg')) {
			const oldPath = path.join(publicDir, file);
			console.log(`- Removing old DMG: ${file}`);
			unlinkSync(oldPath);
		}
	}

	// 4. Copy new files and calculate metadata
	console.log("\n[website-sync] Copying new DMG artifacts to website public folder...");
	const artifactMeta = [];
	for (const art of artifacts) {
		console.log(`- Copying: ${art.filename}`);
		copyFileSync(art.srcPath, art.destPath);
		
		const sha256 = getSha256(art.destPath);
		const sizeMb = getFileSizeMb(art.destPath);
		
		artifactMeta.push({
			platform: "macos",
			arch: art.arch,
			type: art.type,
			label: `${art.type} (${art.arch === 'aarch64' ? 'Apple Silicon' : 'Intel'})`,
			filename: art.filename,
			url: `https://mynah.site/public/${art.filename}`,
			size_mb: sizeMb,
			sha256: sha256,
			min_os: "10.15",
			notarized: true,
			stapled: true,
			signedBy: "Developer ID Application: Khalid Irfan (99YAK7YU3M)",
			notes: `${art.type} ${art.type === 'Trial' ? '60-Day Free Trial' : 'Lifetime Unrestricted'}. Signed with Developer ID, notarized by Apple, and stapled.`
		});
	}

	// 5. Update downloads.json
	const downloadsJsonPath = path.join(websiteRoot, 'downloads.json');
	const downloads = JSON.parse(readFileSync(downloadsJsonPath, 'utf8'));
	
	downloads.version = version;
	downloads.release = {
		number: Number(build),
		bundleVersion: build,
		buildSignature: buildMeta.buildSignature,
		builtAtIso: buildMeta.builtAtIso,
		gitCommit: buildMeta.gitCommit
	};
	downloads.artifacts = artifactMeta;
	
	writeFileSync(downloadsJsonPath, JSON.stringify(downloads, null, 2) + '\n', 'utf8');
	console.log("[website-sync] Updated downloads.json");

	// 6. Update download/index.html download links and info block
	const downloadHtmlPath = path.join(websiteRoot, 'download', 'index.html');
	let downloadHtml = readFileSync(downloadHtmlPath, 'utf8');
	
	// Update URLs
	const trialArmDmg = artifactMeta.find(a => a.type === 'Trial' && a.arch === 'aarch64').filename;
	const trialIntelDmg = artifactMeta.find(a => a.type === 'Trial' && a.arch === 'x86_64').filename;
	
	downloadHtml = downloadHtml.replace(/href="\/public\/Mynah_Trial_[^"]+_aarch64\.dmg"/, `href="/public/${trialArmDmg}"`);
	downloadHtml = downloadHtml.replace(/href="\/public\/Mynah_Trial_[^"]+_x86_64\.dmg"/, `href="/public/${trialIntelDmg}"`);
	
	// Update Version and Build details
	downloadHtml = downloadHtml.replace(
		/Version\s+[0-9.]+\s+·\s+Build\s+[0-9]+\s+·\s+macOS/i,
		`Version ${version} · Build ${build} · macOS`
	);
	downloadHtml = downloadHtml.replace(
		/Signed with Developer ID, notarized by Apple, and stapled for Gatekeeper validation\.<br>\s*(?:Trial status is securely initialized upon first launch\.|Apple Silicon is recommended for best local transcription speed\. Intel is supported; choose the Fast model for best performance\.)/,
		`Signed with Developer ID, notarized by Apple, and stapled for Gatekeeper validation.<br>
        Apple Silicon is recommended for best local transcription speed. Intel is supported; choose the Fast model for best performance.`
	);
	downloadHtml = downloadHtml.replace(
		/Filename:\s*Mynah_[^<]+\.dmg\s*·\s*SHA-256 checksum published above\./,
		'Apple Silicon and Intel DMGs are published with SHA-256 checksums on the facts page.'
	);
	
	writeFileSync(downloadHtmlPath, downloadHtml, 'utf8');
	console.log("[website-sync] Updated download/index.html");

	// 7. Update facts/index.html facts list
	const factsHtmlPath = path.join(websiteRoot, 'facts', 'index.html');
	let factsHtml = readFileSync(factsHtmlPath, 'utf8');
	
	const today = new Date().toISOString().slice(0, 10);
	
	// Replace version details
	factsHtml = factsHtml.replace(/Current version<\/strong><span>[^<]+<\/span>/, `Current version</strong><span>${version}</span>`);
	factsHtml = factsHtml.replace(/Release number<\/strong><span>[^<]+<\/span>/, `Release number</strong><span>${build}</span>`);
	factsHtml = factsHtml.replace(/Build signature<\/strong><span>[^<]+<\/span>/, `Build signature</strong><span>${buildMeta.buildSignature}</span>`);
	factsHtml = factsHtml.replace(/Last updated<\/strong><span>[^<]+<\/span>/, `Last updated</strong><span>${today}</span>`);
	
	// Replace default download url & sha256 with the primary Apple Silicon Trial version
	const primaryDmg = artifactMeta.find(a => a.type === 'Trial' && a.arch === 'aarch64');
	factsHtml = factsHtml.replace(/Download URL<\/strong><span>[^<]+<\/span>/, `Download URL</strong><span>${primaryDmg.url}</span>`);
	factsHtml = factsHtml.replace(/SHA-256<\/strong><span>[^<]+<\/span>/, `SHA-256</strong><span>${primaryDmg.sha256}</span>`);
	
	// Append fact list with all 4 artifacts hashes for clarity
	// Let's replace the whole list or just output the hashes
	let listBlock = '<!-- SHA256_HASH_BLOCK_START -->\n';
	listBlock += `      <div style="grid-column: 1 / -1; padding-top: 1rem; border-top: 1px dashed var(--border); margin-top: 1rem; font-weight: bold;">SHA-256 Checksums for Release Build ${build}:</div>\n`;
	for (const art of artifactMeta) {
		listBlock += `      <div><strong>${art.label}</strong><span style="font-family: monospace; font-size: 0.85em; word-break: break-all;">${art.sha256}</span></div>\n`;
	}
	listBlock += '      <!-- SHA256_HASH_BLOCK_END -->';
	
	const hashBlockRegex = /<!-- SHA256_HASH_BLOCK_START -->[\s\S]*?<!-- SHA256_HASH_BLOCK_END -->/;
	if (hashBlockRegex.test(factsHtml)) {
		factsHtml = factsHtml.replace(hashBlockRegex, listBlock);
	} else {
		// Insert before the last closing </div> of the facts-list
		const listEndIndex = factsHtml.indexOf('</div>\n  </main>');
		if (listEndIndex !== -1) {
			factsHtml = factsHtml.slice(0, listEndIndex) + '</div>\n' + listBlock + '\n    ' + factsHtml.slice(listEndIndex);
		}
	}
	
	writeFileSync(factsHtmlPath, factsHtml, 'utf8');
	console.log("[website-sync] Updated facts/index.html");
	
	console.log("\n==================================================");
	console.log("Website sync completed successfully!");
	console.log("Review your git status in /Users/irfan/projects/Mynah/website, then commit and push to deploy.");
	console.log("==================================================\n");
}

main();
